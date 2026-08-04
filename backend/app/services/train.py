# app/services/train.py
from datetime import datetime, timezone
from bson import ObjectId
from app.database import fs, db
import pickle
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from typing import Dict, Tuple, Any, Optional

# models / learners
from sklearn.linear_model import LogisticRegression, LinearRegression, Lasso, Ridge
from sklearn.model_selection import GridSearchCV
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.ensemble import (
    RandomForestClassifier, GradientBoostingClassifier, AdaBoostClassifier,
    RandomForestRegressor, GradientBoostingRegressor, AdaBoostRegressor
)
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.svm import SVC, SVR
from sklearn.utils import compute_sample_weight
from xgboost import XGBClassifier, XGBRegressor
from catboost import CatBoostClassifier, CatBoostRegressor
from lightgbm import LGBMClassifier, LGBMRegressor

# metrics
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score
)

# helper
from sklearn.utils.validation import has_fit_parameter

from app.models.train import TrainRequest
from app.services.preprocessor import apply_preprocessor


def _update_job(job_id: str, update: dict):
    """Helper to update job document in MongoDB."""
    db["jobs"].update_one({"_id": ObjectId(job_id)}, {"$set": update})


def detect_problem_type(y: pd.Series) -> str:
    """Detects if target is classification or regression."""
    if pd.api.types.is_numeric_dtype(y):
        unique = int(y.nunique())
        if unique <= 20:
            return "classification"
        return "regression"
    else:
        return "classification"


def default_scoring(problem_type: str) -> str:
    return "accuracy" if problem_type == "classification" else "r2"


def get_registry(problem_type: str):
    """
    Return (models_dict, params_grid_dict) for requested problem type.
    Keys are user-friendly names; values are *unfitted* estimator instances.
    """
    if problem_type == "classification":
        classification_models = {
            "Logistic Regression": LogisticRegression(max_iter=1000),
            "K-Neighbors Classifier": KNeighborsClassifier(),
            "Decision Tree Classifier": DecisionTreeClassifier(),
            "Random Forest Classifier": RandomForestClassifier(),
            "Gradient Boosting Classifier": GradientBoostingClassifier(),
            "XGBoost Classifier": XGBClassifier(use_label_encoder=False, eval_metric="logloss", verbosity=0),
            "CatBoost Classifier": CatBoostClassifier(verbose=0),
            "AdaBoost Classifier": AdaBoostClassifier(),
            "LGBM Classifier": LGBMClassifier(verbose=-1),
        }

        classification_params_grid = {
            "Logistic Regression": {
                'solver': ['lbfgs', 'liblinear'],
                'penalty': ['l2'],
                'C': [1.0, 0.1, 0.01]
            },
            "K-Neighbors Classifier": {
                'n_neighbors': [3, 5, 7],
                'weights': ['uniform', 'distance'],
            },
            "Decision Tree Classifier": {
                'criterion': ['gini', 'entropy'],
                'max_depth': [None, 10, 20],
            },
            "Random Forest Classifier": {
                'n_estimators': [100, 200],
                'max_depth': [10, None],
            },
            "Gradient Boosting Classifier": {
                'n_estimators': [100],
                'learning_rate': [0.05, 0.1],
                'max_depth': [3, 5],
            },
            "XGBoost Classifier": {
                'n_estimators': [100],
                'learning_rate': [0.05, 0.1],
                'max_depth': [3, 5],
            },
            "CatBoost Classifier": {
                'iterations': [100],
                'learning_rate': [0.05, 0.1],
                'depth': [4, 6]
            },
            "AdaBoost Classifier": {
                'n_estimators': [50, 100],
                'learning_rate': [0.5, 1.0],
            },
            "LGBM Classifier": {
                'n_estimators': [100],
                'learning_rate': [0.05, 0.1],
                'num_leaves': [31, 50],
            }
        }

        return classification_models, classification_params_grid

    elif problem_type == "regression":
        regression_models = {
            "Linear Regression": LinearRegression(),
            "Lasso": Lasso(),
            "Ridge": Ridge(),
            "Decision Tree Regressor": DecisionTreeRegressor(),
            "Random Forest Regressor": RandomForestRegressor(),
            "Gradient Boosting Regressor": GradientBoostingRegressor(),
            "K-Neighbors Regressor": KNeighborsRegressor(),
            "XGBoost Regressor": XGBRegressor(verbosity=0),
            "CatBoost Regressor": CatBoostRegressor(verbose=0),
            "AdaBoost Regressor": AdaBoostRegressor(),
            "LGBM Regressor": LGBMRegressor(verbose=-1),
        }

        regression_params_grid = {
            "Linear Regression": {},
            "Lasso": {'alpha': [0.001, 0.01, 0.1, 1.0]},
            "Ridge": {'alpha': [0.001, 0.01, 0.1, 1.0]},
            "Decision Tree Regressor": {
                'max_depth': [None, 10, 20],
            },
            "Random Forest Regressor": {
                'n_estimators': [100, 200],
                'max_depth': [10, None],
            },
            "Gradient Boosting Regressor": {
                'n_estimators': [100],
                'learning_rate': [0.05, 0.1],
                'max_depth': [3, 5],
            },
            "K-Neighbors Regressor": {
                'n_neighbors': [3, 5, 7],
                'weights': ['uniform', 'distance'],
            },
            "XGBoost Regressor": {
                'n_estimators': [100],
                'learning_rate': [0.05, 0.1],
                'max_depth': [3, 5],
            },
            "CatBoost Regressor": {
                'iterations': [100],
                'learning_rate': [0.05, 0.1],
                'depth': [4, 6]
            },
            "AdaBoost Regressor": {
                'n_estimators': [50, 100],
                'learning_rate': [0.5, 1.0],
            },
            "LGBM Regressor": {
                'n_estimators': [100],
                'learning_rate': [0.05, 0.1],
                'num_leaves': [31, 50],
            }
        }

        return regression_models, regression_params_grid

    else:
        raise ValueError("Unsupported problem type: " + str(problem_type))


def evaluate_model(
    X_train, y_train, X_test, y_test,
    models: Dict[str, Any],
    params: Dict[str, Any],
    sample_weights,
    cv: int,
    scoring: Optional[str],
    n_jobs: int,
    refit_full: bool,
    problem_type: str,
    job_id: str = None
) -> Tuple[float, Any, Dict[str, Any], str]:
    """
    Evaluate given models using GridSearchCV for hyperparameter tuning.
    Returns (best_score, best_model_instance, report_dict, best_model_name)."""

# app/models/train.py
from typing import Optional, Dict, Any
from pydantic import BaseModel

class TrainRequest(BaseModel):
    dataset_id: str
    preprocessor_id: str

    model_label: Optional[str] = None       # user-friendly name e.g. "Churn Predictor v1"
    algorithm: Optional[str] = "auto"
    hyperparameters: Optional[Dict[str, Any]] = {}
    search_type: Optional[str] = "random"
    n_iter: Optional[int] = 30
    cv: Optional[int] = 5
    n_jobs: Optional[int] = -1
    refit_full: Optional[bool] = True

    test_size: Optional[float] = 0.2
    random_state: Optional[int] = 42

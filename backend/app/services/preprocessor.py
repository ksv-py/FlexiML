import pickle
import pandas as pd
import io
from bson import ObjectId
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from app.database import fs, db
from app.models.preprocessing import PreprocessRequest
from app.models.train import TrainRequest

def create_preprocessor_object(request_data: PreprocessRequest):
    """
    Build a preprocessor (blueprint only, unfitted) and save it to GridFS.
    """

    # 1. Fetch dataset metadata
    file_doc = db["datasets"].find_one({"_id": ObjectId(request_data.dataset_id)})
    if not file_doc:
        raise ValueError("Dataset not found.")
    
    grid_out = fs.get(ObjectId(file_doc["file_id"]))
    filename = grid_out.filename.lower()

    # 2. Load dataset (only to detect col types, not for fitting!)
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(grid_out.read()))
    elif filename.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(grid_out.read()))
    else:
        raise ValueError("Unsupported file format. Only CSV and Excel allowed.")

    # 3. Drop target + drop_columns if provided
    X = df.copy()
    if request_data.target_column and request_data.target_column in X.columns:
        X = X.drop(columns=[request_data.target_column])
    if request_data.drop_columns:
        X = X.drop(columns=[col for col in request_data.drop_columns if col in X.columns])

    # 4. Detect column types
    numeric_cols = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

    # 5. Transformers
    transformers = []

    if numeric_cols:
        num_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy=request_data.missing_value_strategy or "mean")),
            ("scaler", StandardScaler())
        ])
        transformers.append(("num", num_transformer, numeric_cols))

    if categorical_cols:
        if request_data.encoding_strategy == "label":
            cat_transformer = Pipeline(steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1))
            ])
        elif request_data.encoding_strategy == "one_hot":
            cat_transformer = Pipeline(steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("encoder", OneHotEncoder(handle_unknown="ignore"))
            ])
        else:
            raise ValueError("Invalid encoding strategy. Use 'label' or 'one_hot'.")
        
        transformers.append(("cat", cat_transformer, categorical_cols))

    if not transformers:
        raise ValueError("No numeric or categorical columns found to preprocess.")

    # 6. Column transformer (unfitted)
    preprocessor = ColumnTransformer(transformers=transformers)

    # 7. Save preprocessor to GridFS
    preprocessor_bytes = pickle.dumps(preprocessor)
    preprocessor_id = fs.put(
        preprocessor_bytes,
        filename=f"{file_doc['name']}_preprocessor_blueprint.pkl"
    )
    
    # 8. Save metadata
    result = db["preprocessors"].insert_one({
    "dataset_id": request_data.dataset_id,
    "file_id": preprocessor_id,
    "numeric_cols": numeric_cols,
    "categorical_cols": categorical_cols,
    "drop_columns": request_data.drop_columns,
    "target_column": request_data.target_column,  # <-- store here
    "missing_strategy": request_data.missing_value_strategy,
    "encoding_strategy": request_data.encoding_strategy,
    "is_fitted": False
})


    # 9. Return response
    return {
        "preprocessor_id": str(result.inserted_id),
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "drop_columns": request_data.drop_columns,
        "missing_strategy": request_data.missing_value_strategy,
        "encoding_strategy": request_data.encoding_strategy
    }


def apply_preprocessor(
    request: TrainRequest,
    preview_rows: int = 5,
    return_data: bool = False
):
    """
    Apply a stored preprocessor to a dataset.
    Splits dataset, fits on train, transforms train/test,
    and saves back a fitted version for inference use.
    """
    print("applying preprocessor**************************************************************")

    # 1. Load dataset
    file_doc = db["datasets"].find_one({"_id": ObjectId(request.dataset_id)})
    if not file_doc:
        raise ValueError("Dataset not found.")

    grid_out = fs.get(ObjectId(file_doc["file_id"]))
    filename = grid_out.filename.lower()
    print("1")
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(grid_out.read()))
    elif filename.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(grid_out.read()))
    else:
        raise ValueError("Unsupported file format. Only CSV and Excel allowed.")

    # 2. Clean dataset (remove duplicates)
    print("2")
    df = df.drop_duplicates()

    # Load preprocessor metadata to apply consistent drop_columns
    pre_doc = db["preprocessors"].find_one({"_id": ObjectId(request.preprocessor_id)})
    print(pre_doc)
    if not pre_doc:
        raise ValueError("Preprocessor not found.")

    # Always respect stored drop_columns from preprocessor blueprint
    drop_columns = pre_doc.get("drop_columns", [])
    if drop_columns:
        df = df.drop(columns=[col for col in drop_columns if col in df.columns])
    # Always respect stored target_column
    target_column = pre_doc.get("target_column")

    # 3. Split into X, y
    y = None
    if target_column and target_column in df.columns:
        y = df[target_column]
        X = df.drop(columns=[target_column])
    else:
        X = df

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=request.test_size, random_state=request.random_state
    )
    print("Current X_train columns:", X_train.columns.tolist())

    # 4. Load preprocessor (blueprint or fitted)
    print("4")
    if pre_doc.get("is_fitted") and pre_doc.get("fitted_file_id"):
        # Load already fitted version
        grid_pre = fs.get(ObjectId(pre_doc["fitted_file_id"]))
        preprocessor = pickle.loads(grid_pre.read())
    else:
        # Load blueprint and fit
        grid_pre = fs.get(ObjectId(pre_doc["file_id"]))
        preprocessor = pickle.loads(grid_pre.read())
        preprocessor.fit(X_train, y_train)

        # Save fitted version for inference
        fitted_preprocessor_bytes = pickle.dumps(preprocessor)
        fitted_file_id = fs.put(
            fitted_preprocessor_bytes,
            filename=f"{file_doc['name']}_preprocessor_fitted.pkl"
        )

        db["preprocessors"].update_one(
            {"_id": ObjectId(request.preprocessor_id)},
            {"$set": {
                "fitted_file_id": fitted_file_id,
                "is_fitted": True,
                "feature_names": preprocessor.get_feature_names_out().tolist()
            }}
        )

    # 5. Transform using fitted preprocessor
    print("5")
    X_train = preprocessor.transform(X_train)
    X_test = preprocessor.transform(X_test)

    # 6. Build preview
    print("6")
    preview_df = pd.DataFrame(
        X_train[:preview_rows],
        columns=preprocessor.get_feature_names_out()
    )

    if y is not None:
        preview_df[target_column] = y_train[:preview_rows].values

    result = {
        "X_train_shape": X_train.shape,
        "X_test_shape": X_test.shape,
        "y_train_shape": None if y is None else y_train.shape,
        "y_test_shape": None if y is None else y_test.shape,
        "preview": preview_df.to_dict(orient="records"),
    }

    print("applied preprocessor**************************************************************")

    # 7. For training → return arrays
    if return_data:
        return X_train, X_test, y_train, y_test, filename

    return result

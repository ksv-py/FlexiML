import pickle
import pandas as pd
import io
from bson import ObjectId
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from app.database import fs, db
from app.models.preprocessing import PreprocessRequest

def preprocess_dataset(request_data: PreprocessRequest):
    # 1. Fetch dataset
    file_doc = db["datasets"].find_one({"_id": ObjectId(request_data.dataset_id)})
    if not file_doc:
        raise ValueError("Dataset not found.")
    
    grid_out = fs.get(ObjectId(file_doc["file_id"]))
    filename = grid_out.filename.lower()

    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(grid_out.read()))
    elif filename.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(grid_out.read()))
    else:
        raise ValueError("Unsupported file format. Only CSV and Excel allowed.")

    if request_data.target_column and request_data.target_column in df.columns:
        X = df.drop(columns=[request_data.target_column])
    else:
        X = df


    # 2. Separate column types
    numeric_cols = X.select_dtypes(include=["int64", "float64"]).columns.tolist()
    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

    print(numeric_cols)
    print(categorical_cols)
    # 3. Transformers
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

    # 4. Column transformer
    preprocessor = ColumnTransformer(transformers=transformers)

    # 5. Fit preprocessor
    preprocessor.fit(X)

    # 6. Save preprocessor to GridFS
    preprocessor_bytes = pickle.dumps(preprocessor)
    preprocessor_id = fs.put(
        preprocessor_bytes,
        filename=f"{file_doc['name']}_preprocessor.pkl"
    )
    
    # 7. Save metadata
    db["preprocessors"].insert_one({
        "dataset_id": request_data.dataset_id,
        "file_id": preprocessor_id,
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "missing_strategy": request_data.missing_value_strategy,
        "encoding_strategy": request_data.encoding_strategy
    })

    # 8. Return response
    return {
        "preprocessor_id": str(preprocessor_id),
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "missing_strategy": request_data.missing_value_strategy,
        "encoding_strategy": request_data.encoding_strategy
    }

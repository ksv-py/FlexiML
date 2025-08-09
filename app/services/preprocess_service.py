from bson import ObjectId
from app.database import fs
from io import BytesIO
import pandas as pd

async def run_preprocessing(dataset_id: str) -> ObjectId:
    file_data = fs.get(ObjectId(dataset_id))
    content = file_data.read()
    filename = file_data.filename

    if filename.endswith(".csv"):
        df = pd.read_csv(BytesIO(content))
    
    else:
        df = pd.read_excel(BytesIO(content))

    numeric_features = df.select_dtypes(include=['float64','int64']).columns.tolist()
    categorical_features = df.select_dtypes(include=['object']).columns.tolist()

    # simple imputer
    df.fillna(method='ffill', inplace=True)

    #preprocessor pipeline
    num_pipeline = Pipeline(
        steps=[
            ('Imputer', SimpleImputer(strategy = 'median')),
            ('Standard Scaler', StandardScaler())
        ]
    )

    cat_pipeline = Pipeline(
        steps=[
            ('Imputer', SimpleImputer(strategy='most_frequent')),
            ('One Hot Encoder', OneHotEncoder()),
            ('Standard Scaler', StandardScaler(with_mean=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        [
            ('num_pipeline', num_pipeline, numeric_features),
            ('cat_pipeline', cat_pipeline, categorical_features),
        ]
    )
    
import io
import math
import numpy as np
import pandas as pd
from bson import ObjectId
from app.database import db, fs


def _safe_float(val, ndigits: int = 4):
    """Convert a value to a JSON-safe float (returns None for NaN/inf)."""
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, ndigits)
    except (TypeError, ValueError):
        return None


def analyze_dataframe(df: pd.DataFrame, target_column: str = None) -> dict:
    """Analyze a raw DataFrame and return structured stats + anomaly flags."""
    report = {
        "shape": {"rows": int(df.shape[0]), "cols": int(df.shape[1])},
        "duplicates": int(df.duplicated().sum()),
        "columns": {},
        "anomaly_flags": [],
    }

    for col in df.columns:
        series = df[col]
        null_count = int(series.isnull().sum())
        null_pct = round(null_count / len(series) * 100, 2)
        col_info = {
            "dtype": str(series.dtype),
            "null_count": null_count,
            "null_pct": null_pct,
            "unique": int(series.nunique()),
        }

        if pd.api.types.is_numeric_dtype(series):
            col_info.update({
                "mean":   _safe_float(series.mean()),
                "std":    _safe_float(series.std()),
                "min":    _safe_float(series.min()),
                "max":    _safe_float(series.max()),
                "median": _safe_float(series.median()),
            })
            # Zero variance flag
            std_val = series.std()
            if _safe_float(std_val) == 0.0:
                report["anomaly_flags"].append(f"Column '{col}' has zero variance (constant).")

        else:
            col_info.update({
                "top_values": series.value_counts().head(5).to_dict(),
            })
            # High cardinality flag
            if series.nunique() > 50:
                report["anomaly_flags"].append(
                    f"Column '{col}' has high cardinality ({series.nunique()} unique values) — consider dropping or encoding carefully."
                )

        # High null flag
        if null_pct > 50:
            report["anomaly_flags"].append(
                f"Column '{col}' has {null_pct}% missing values — consider dropping it."
            )

        report["columns"][col] = col_info

    # Target column class distribution
    if target_column and target_column in df.columns:
        target_series = df[target_column]
        if pd.api.types.is_numeric_dtype(target_series) and target_series.nunique() > 20:
            report["target_stats"] = {
                "type": "regression",
                "mean": _safe_float(target_series.mean()),
                "std":  _safe_float(target_series.std()),
                "min":  _safe_float(target_series.min()),
                "max":  _safe_float(target_series.max()),
            }
        else:
            dist = target_series.value_counts().to_dict()
            # Convert keys to strings for JSON safety
            report["target_stats"] = {
                "type": "classification",
                "class_distribution": {str(k): int(v) for k, v in dist.items()},
                "num_classes": int(target_series.nunique()),
            }

    return report


def analyze_dataset(dataset_id: str) -> dict:
    """Load dataset from GridFS and return raw analysis."""
    file_doc = db["datasets"].find_one({"_id": ObjectId(dataset_id)})
    if not file_doc:
        raise ValueError("Dataset not found.")

    grid_out = fs.get(ObjectId(file_doc["file_id"]))
    filename = grid_out.filename.lower()
    raw = grid_out.read()

    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(raw))
    elif filename.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(raw))
    else:
        raise ValueError("Unsupported file format.")

    analysis = analyze_dataframe(df)
    analysis["dataset_id"] = dataset_id
    analysis["filename"] = file_doc.get("name", filename)
    return analysis


def analyze_preprocessor(preprocessor_id: str) -> dict:
    """Load preprocessor metadata & return processed-data analysis."""
    pre_doc = db["preprocessors"].find_one({"_id": ObjectId(preprocessor_id)})
    if not pre_doc:
        raise ValueError("Preprocessor not found.")

    dataset_id = pre_doc.get("dataset_id")
    file_doc = db["datasets"].find_one({"_id": ObjectId(dataset_id)})
    if not file_doc:
        raise ValueError("Associated dataset not found.")

    import pickle
    from sklearn.model_selection import train_test_split

    grid_out = fs.get(ObjectId(file_doc["file_id"]))
    filename = grid_out.filename.lower()
    raw = grid_out.read()
    if filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(raw))
    elif filename.endswith((".xls", ".xlsx")):
        df = pd.read_excel(io.BytesIO(raw))
    else:
        raise ValueError("Unsupported file format.")

    drop_columns = pre_doc.get("drop_columns", [])
    target_column = pre_doc.get("target_column")
    if drop_columns:
        df = df.drop(columns=[c for c in drop_columns if c in df.columns])

    y = None
    if target_column and target_column in df.columns:
        y = df[target_column]
        X = df.drop(columns=[target_column])
    else:
        X = df

    X_train, X_test, _, _ = train_test_split(X, y, test_size=0.2, random_state=42)

    # Use fitted preprocessor if available
    file_id_key = "fitted_file_id" if pre_doc.get("is_fitted") else "file_id"
    fid = pre_doc.get(file_id_key) or pre_doc.get("file_id")
    grid_pre = fs.get(ObjectId(fid))
    preprocessor = pickle.loads(grid_pre.read())

    if not pre_doc.get("is_fitted"):
        preprocessor.fit(X_train)

    X_train_t = preprocessor.transform(X_train)
    X_test_t = preprocessor.transform(X_test)

    feature_names = preprocessor.get_feature_names_out().tolist()

    def arr_issues(arr):
        has_nan = bool(np.isnan(arr).any())
        has_inf = bool(np.isinf(arr).any())
        return {"has_nan": has_nan, "has_inf": has_inf}

    return {
        "preprocessor_id": preprocessor_id,
        "dataset_id": dataset_id,
        "is_fitted": pre_doc.get("is_fitted", False),
        "feature_count": len(feature_names),
        "feature_names": feature_names,
        "train_samples": int(X_train_t.shape[0]),
        "test_samples": int(X_test_t.shape[0]),
        "train_issues": arr_issues(X_train_t),
        "test_issues": arr_issues(X_test_t),
        "numeric_cols": pre_doc.get("numeric_cols", []),
        "categorical_cols": pre_doc.get("categorical_cols", []),
        "encoding_strategy": pre_doc.get("encoding_strategy"),
        "missing_strategy": pre_doc.get("missing_strategy"),
    }

import pickle
from typing import List, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
from app.database import db, fs
from app.models.predict import PredictRequest, PredictResponse, PredictBatchRequest, PredictBatchResponse
from app.auth.api_key import get_current_user
from app.services.limits import check_can_predict

router = APIRouter(prefix="/predict", tags=["Predict"])


# ── GridFS safe-delete helper ─────────────────────────────
def _try_delete_gridfs(file_id_str: str):
    """Delete a file from GridFS by string ID, silently if missing."""
    try:
        if file_id_str:
            fs.delete(ObjectId(file_id_str))
    except Exception:
        pass


# ── Artifact loader ───────────────────────────────────────

from functools import lru_cache

@lru_cache(maxsize=128)
def _download_and_pickle_artifacts(model_fid: str, prep_fid: str, le_fid: str):
    """Heavy function: download binary arrays from MongoDB GridFS and parse them back to python objects."""
    model, preprocessor, label_encoder = None, None, None
    try:
        grid_out_model = fs.get(ObjectId(model_fid))
        model = pickle.load(grid_out_model)

        if prep_fid:
            grid_out_prep = fs.get(ObjectId(prep_fid))
            preprocessor = pickle.load(grid_out_prep)

        if le_fid:
            grid_out_le = fs.get(ObjectId(le_fid))
            label_encoder = pickle.load(grid_out_le)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GridFS load failed: {str(e)}")
        
    return model, preprocessor, label_encoder


def _load_artifacts(model_id: str):
    """Load model doc, preprocessor doc, fitted model, preprocessor & label encoder."""
    model_doc = db["models"].find_one({"_id": ObjectId(model_id)})
    if not model_doc:
        raise HTTPException(status_code=404, detail="Model not found.")

    prep_id = model_doc.get("preprocessor_id")
    preprocessor_doc = db["preprocessors"].find_one({"_id": ObjectId(prep_id)}) if prep_id else None

    # Get file identifiers
    model_fid = str(model_doc.get("file_id"))
    prep_fid = str(preprocessor_doc.get("fitted_file_id")) if preprocessor_doc else None
    le_fid = str(model_doc.get("label_encoder_file_id")) if model_doc.get("label_encoder_file_id") else None

    # Retrieve heavy artifacts from LRU Cache (or download if newly seen)
    model, preprocessor, label_encoder = _download_and_pickle_artifacts(model_fid, prep_fid, le_fid)

    return model, preprocessor, model_doc, preprocessor_doc, label_encoder


# ── Column alignment ──────────────────────────────────────

def _align_and_transform(input_df: pd.DataFrame, preprocessor, preprocessor_doc: dict):
    """
    Select only the columns the preprocessor was fitted on (numeric_cols + categorical_cols),
    in the correct order, then call transform(). Raises 400 if required columns are missing.
    """
    if preprocessor_doc is None or preprocessor is None:
        return input_df.values

    numeric_cols     = preprocessor_doc.get("numeric_cols", [])
    categorical_cols = preprocessor_doc.get("categorical_cols", [])
    expected_cols    = numeric_cols + categorical_cols

    if not expected_cols:
        return preprocessor.transform(input_df)

    missing = [c for c in expected_cols if c not in input_df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Missing required feature column(s): {missing}. "
                f"Required features are: {expected_cols}"
            )
        )

    aligned = input_df[expected_cols].copy()
    for col in numeric_cols:
        aligned[col] = pd.to_numeric(aligned[col], errors="coerce")

    return preprocessor.transform(aligned)


# ── Ownership check helper ────────────────────────────────

def _assert_owner(model_doc: dict, user: dict):
    if str(model_doc.get("user_id")) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="You do not own this model.")


# ── Predict (single) ─────────────────────────────────────

@router.post("/{model_id}", summary="Predict for a single row.", response_model=PredictResponse)
async def predict(
    model_id: str,
    request: PredictRequest,
    user: dict = Depends(get_current_user),
):
    """Predict with your model. Requires the API key of the model owner."""
    # Check + Increment API Usage
    check_can_predict(user)

    if not ObjectId.is_valid(model_id):
        raise HTTPException(status_code=400, detail="Invalid model_id format.")

    model, preprocessor, model_doc, preprocessor_doc, label_encoder = _load_artifacts(model_id)
    _assert_owner(model_doc, user)

    input_df = pd.DataFrame([request.data])

    try:
        input_transformed = _align_and_transform(input_df, preprocessor, preprocessor_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preprocessing failed: {str(e)}")

    try:
        pred = model.predict(input_transformed)
        prediction = pred[0] if len(pred) == 1 else pred.tolist()
        if hasattr(prediction, "item"):
            prediction = prediction.item()
        if label_encoder is not None:
            prediction = label_encoder.inverse_transform([int(round(prediction))])[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

    return PredictResponse(
        prediction=prediction,
        model_id=model_id,
        model_name=model_doc.get("model_name"),
        problem_type=model_doc.get("problem_type"),
    )


# ── Batch predict ─────────────────────────────────────────

@router.post("/{model_id}/batch", summary="Batch predict for multiple rows.")
async def batch_predict(
    model_id: str,
    data: List[dict],
    user: dict = Depends(get_current_user),
):
    """Batch predict. Requires the API key of the model owner."""
    if not ObjectId.is_valid(model_id):
        raise HTTPException(status_code=400, detail="Invalid model_id format.")

    model, preprocessor, model_doc, preprocessor_doc, label_encoder = _load_artifacts(model_id)
    _assert_owner(model_doc, user)

    input_df = pd.DataFrame(data)

    try:
        input_transformed = _align_and_transform(input_df, preprocessor, preprocessor_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Preprocessing failed: {str(e)}")

    try:
        preds = model.predict(input_transformed)
        if label_encoder is not None:
            predictions = label_encoder.inverse_transform([int(round(p)) for p in preds]).tolist()
        else:
            predictions = [p.item() if hasattr(p, "item") else p for p in preds]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Batch prediction failed: {str(e)}")

    return {
        "model_id": model_id,
        "model_name": model_doc.get("model_name"),
        "problem_type": model_doc.get("problem_type"),
        "count": len(predictions),
        "predictions": predictions,
    }


# ── Delete model (cascade) ───────────────────────────────

@router.delete("/{model_id}", summary="Delete a model and all its associated files.")
async def delete_model(
    model_id: str,
    user: dict = Depends(get_current_user),
):
    """
    Permanently deletes:
    - The model pickle (GridFS)
    - The label encoder pickle (GridFS, if present)
    - The fitted preprocessor pickle (GridFS, if present)
    - The preprocessor metadata doc (MongoDB)
    - The model metadata doc (MongoDB)
    - Any training jobs that reference this model
    """
    if not ObjectId.is_valid(model_id):
        raise HTTPException(status_code=400, detail="Invalid model_id format.")

    model_doc = db["models"].find_one({"_id": ObjectId(model_id)})
    if not model_doc:
        raise HTTPException(status_code=404, detail="Model not found.")

    _assert_owner(model_doc, user)

    deleted = {}

    # 1. Delete model pickle from GridFS
    _try_delete_gridfs(str(model_doc.get("file_id", "")))
    deleted["model_pkl"] = True

    # 2. Delete label encoder from GridFS
    le_fid = model_doc.get("label_encoder_file_id")
    if le_fid:
        _try_delete_gridfs(le_fid)
        deleted["label_encoder_pkl"] = True

    # 3. Handle preprocessor cascade
    prep_id = model_doc.get("preprocessor_id")
    if prep_id and ObjectId.is_valid(str(prep_id)):
        prep_doc = db["preprocessors"].find_one({"_id": ObjectId(prep_id)})
        if prep_doc:
            # Check no OTHER model still references this preprocessor
            other_users = db["models"].count_documents({
                "preprocessor_id": str(prep_id),
                "_id": {"$ne": ObjectId(model_id)},
            })
            if other_users == 0:
                # Safe to delete preprocessor files + doc
                _try_delete_gridfs(str(prep_doc.get("file_id", "")))         # blueprint pkl
                _try_delete_gridfs(str(prep_doc.get("fitted_file_id", ""))) # fitted pkl
                db["preprocessors"].delete_one({"_id": ObjectId(prep_id)})
                deleted["preprocessor"] = True
            else:
                deleted["preprocessor"] = "skipped (shared by another model)"

    # 4. Delete training jobs that reference this model
    job_result = db["jobs"].delete_many({"model_id": model_id})
    deleted["jobs_deleted"] = job_result.deleted_count

    # 5. Delete the model doc
    db["models"].delete_one({"_id": ObjectId(model_id)})
    deleted["model_doc"] = True

    return {
        "message": f"Model {model_id} and all associated data deleted successfully.",
        "deleted": deleted,
    }

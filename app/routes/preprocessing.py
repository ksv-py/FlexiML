from bson import ObjectId
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.services.data_preprocessing import preprocess_dataset
from app.models.preprocessing import PreprocessRequest
from app.database import db, fs

router = APIRouter(prefix="/preprocessing", tags=["preprocessing"])

@router.post("/", summary="Creates and saves a preprocessing pipeline.")
async def create_preprocessor(request: PreprocessRequest):
    try:
        result = preprocess_dataset(request)
        return{
            "message": "Preprocessor created successfully",
            "preprocessor_id": str(result["preprocessor_id"]),
            "numeric_cols": result["numeric_cols"],
            "categorical_cols": result["categorical_cols"],
            "missing_strategy": result["missing_strategy"],
            "encoding_strategy": result["encoding_strategy"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
    
@router.get("/", summary="List all preprocessors")
async def list_preprocessors():
    preprocessors = []
    for pre in db["preprocessors"].find():
        preprocessors.append({
            "id": str(pre["_id"]),
            "dataset_id": pre["dataset_id"],
            "file_id": str(pre["file_id"]),
            "numeric_cols": pre.get("numeric_cols", []),
            "categorical_cols": pre.get("categorical_cols", []),
            "missing_strategy": pre.get("missing_strategy"),
            "encoding_strategy": pre.get("encoding_strategy"),
        })
    return preprocessors

@router.get("/{preprocessor_id}", summary="Fetch one preprocessor.")
async def get_preprocessor(preprocessor_id):
    if not ObjectId.is_valid(preprocessor_id):
        raise HTTPException(status_code=400, detail="Invalid preprocessor id format")
    
    pre = db["preprocessors"].find_one({"_id": ObjectId(preprocessor_id)})

    if not pre:
        raise HTTPException(status_code=404, detail="Preprocessor not found")
    
    return{
        "id": str(pre["_id"]),
        "dataset_id": pre["dataset_id"],
        "file_id": str(pre["file_id"]),
        "numeric_cols": pre.get("numeric_cols", []),
        "categorical_cols": pre.get("categorical_cols", []),
        "missing_strategy": pre.get("missing_strategy"),
        "encoding_strategy": pre.get("encoding_strategy"),
    }

@router.get("/{preprocessor_id}/download", summary="Download Preprocessor Pickle file.")
async def download_preprocessor(preprocessor_id):
    if not ObjectId.is_valid(preprocessor_id):
        raise HTTPException(status_code=400, detail="Invalid preprocessor id format")
    
    pre = db["preprocessors"].find_one({"_id": ObjectId(preprocessor_id)})
    if not pre:
        raise HTTPException(status_code=404, detail="Preprocessor not found")
    
    try:
        grid_out = fs.get(pre["file_id"])
    except Exception as e:
        raise HTTPException(status_code=404, detail="Preprocessor file not found in GridFS")
    
    return StreamingResponse(
        grid_out,
        media_type = "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={grid_out.filename}"}
    )
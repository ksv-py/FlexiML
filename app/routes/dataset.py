from bson import ObjectId
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from app.database import db, fs
import pandas as pd

router = APIRouter(prefix="/datasets")


# Dataset Upload Route
@router.post("/")
async def upload_dataset(
    name: str = Form(...),
    description: str = Form(None),
    file: UploadFile = File(...)
):
    try:
        file_id = fs.put(file.file, filename = file.filename, content_type = file.content_type)

        dataset_doc = {
            "name":name,
            "description":description,
            "file_id":file_id
        }

        result = db['datasets'].insert_one(dataset_doc)

        return{
            "message":"Dataset uploaded Successfully.",
            "dataset_id":str(result.inserted_id),
            "file_id":str(file_id)
        }
    
    except Exception as e:
        return HTTPException(status_code=500, detail=str(e))
    
# List Datasets

@router.get("/")
async def list_datasets():
    datasets = []
    for dataset in db["datasets"].find():
        datasets.append(
            {
                "id":str(dataset["_id"]),
                "name": dataset["name"],
                "description": dataset.get("description"),
                "file_id": str(dataset["file_id"])
            }
        )
    return datasets

# Fetch Single Dataset 

@router.get("/{dataset_id}")
async def get_dataset(dataset_id: str):
        if not ObjectId.is_valid(dataset_id):
            raise HTTPException(status_code=400, detail="Invalid dataset id format")
    
        obj_id = ObjectId(dataset_id)
        dataset = db["datasets"].find_one({"_id": obj_id})

        
        if dataset is None:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        return {
            "id": str(dataset["_id"]),
            "name": dataset.get("name"),
            "description": dataset.get("description"),
            "file_id": str(dataset.get("file_id"))
        }

# Download Dataset

@router.get("/{dataset_id}/download")
async def download_dataset(dataset_id: str):
    if not ObjectId.is_valid(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid Dataset id format.")
     
    dataset = db["datasets"].find_one({"_id":ObjectId(dataset_id)})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not Found.")
     
    file_id = dataset.get("file_id")

    try:
        grid_out = fs.get(file_id)
    
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not Found in GridFS")
    
    return StreamingResponse(
        grid_out,
        media_type = grid_out.content_type,
        headers = {"Content-Disposition": f"attachment; filename={grid_out.filename}"}
    )

# Preview Dataset

@router.get("/{dataset_id}/preview")
async def preview_dataset(dataset_id:str, limit: int = 5):
    if not ObjectId.is_valid(dataset_id):
        raise HTTPException(status_code=400, detail="Invalid Dataset id format.")
     
    dataset = db["datasets"].find_one({"_id":ObjectId(dataset_id)})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not Found.")
     
    file_id = dataset.get("file_id")

    try:
        grid_out = fs.get(file_id)
    
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not Found in GridFS")
    
    try:
        if grid_out.filename.endswith(".csv"):
            df = pd.read_csv(grid_out)
        elif grid_out.filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(grid_out)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {e}")
    
    preview_data = df.head(limit).to_dict(orient="records")

    return{
        "dataset_id": str(dataset["_id"]),
        "filename": grid_out.filename,
        "preview": preview_data
    }
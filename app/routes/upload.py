from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.upload_service import handle_upload

router = APIRouter()

@router.post("/")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv','.xls','.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel Files are allowed.")
    
    dataset_id = await handle_upload(file)
    return {'message':'Dataset Uploaded sucessfully','dataset_id':str(dataset_id)}
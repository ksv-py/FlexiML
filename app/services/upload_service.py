import pandas as pd 
from io import BytesIO
from fastapi import UploadFile
from bson import ObjectId
from app.database import fs
import datetime

async def handle_upload(file: UploadFile) -> ObjectId:
    content = await file.read()

    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(BytesIO(content))
        
        else:
            df = pd.read_excel(BytesIO(content))
        
    except Exception as e:
        raise ValueError("Invalid file format or unreadable data.")
    
    metadata = {
        "filename":file.filename,
        "upload_time": datetime.datetime.now(),
        "columns": df.columns.tolist(),
        "shape": df.shape
    }

    file_id = fs.put(content, filename = file.filename, metadata=metadata)
    return file_id
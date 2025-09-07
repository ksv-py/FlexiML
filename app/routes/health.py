from fastapi import APIRouter, HTTPException
from app.database import db

router = APIRouter(prefix= "/health", tags=['health'])

@router.get("/", summary="Health check")
async def health():
    return{
        "status":"ok"
    }

@router.get("/db", summary="Database Health Check")
async def db_health():
    try:
        db.command("ping")
        return{
            "status":"ok",
            "db":"connected"
        }
    
    except Exception as e:
        return HTTPException(status_code=500, detail=str(e))
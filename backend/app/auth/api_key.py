# app/auth/api_key.py
import secrets
import bcrypt
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.database import db

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')



def generate_api_key() -> str:
    return "flexi_" + secrets.token_hex(24)


async def get_current_user(api_key: str = Security(API_KEY_HEADER)):
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing X-API-Key header."
        )
    user = db["users"].find_one({"api_key": api_key})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key."
        )
    return user

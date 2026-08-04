# app/routes/auth.py
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import db
from app.auth.api_key import generate_api_key, get_current_user, get_password_hash, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterResponse(BaseModel):
    user_id: str
    name: str
    email: str
    api_key: str
    message: str


@router.post("/register", response_model=RegisterResponse, summary="Register and get an API key.")
async def register(request: RegisterRequest):
    existing = db["users"].find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    api_key = generate_api_key()
    hashed_password = get_password_hash(request.password)

    # All users start on Free Trial by default
    doc = {
        "name": request.name,
        "email": request.email,
        "hashed_password": hashed_password,
        "api_key": api_key,
        "subscription_tier": "free",  # "free", "starter", "pro"
        "subscription_expires_at": datetime.now(timezone.utc) + timedelta(hours=6),
        "api_calls_this_month": 0,
        "created_at": datetime.now(timezone.utc)
    }
    result = db["users"].insert_one(doc)

    return RegisterResponse(
        user_id=str(result.inserted_id),
        name=request.name,
        email=request.email,
        api_key=api_key,
        message="Welcome to FlexiML! Save your API key — it won't be shown again."
    )

@router.post("/login", summary="Login with email and password.")
async def login(request: LoginRequest):
    user = db["users"].find_one({"email": request.email})
    if not user or not verify_password(request.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=403, detail="Invalid email or password.")
    
    return {
        "user_id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "api_key": user.get("api_key"),
        "subscription_tier": user.get("subscription_tier"),
    }


@router.get("/me", summary="Get current user info + subscription limits.")
async def me(user: dict = Depends(get_current_user)):
    return {
        "user_id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "subscription_tier": user.get("subscription_tier", "free"),
        "subscription_expires_at": user.get("subscription_expires_at"),
        "api_calls_this_month": user.get("api_calls_this_month", 0),
        "created_at": user.get("created_at"),
    }

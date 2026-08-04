# app/services/limits.py
from datetime import datetime, timezone
from fastapi import HTTPException
from app.database import db

TIER_LIMITS = {
    "free": {"models": 1, "api_calls": 100},
    "starter": {"models": 3, "api_calls": 10000},
    "pro": {"models": 10, "api_calls": 100000},
}

def _check_subscription_active(user: dict):
    # Free trial has a strict 6 hour expiry. If expired, they must upgrade.
    tier = user.get("subscription_tier", "free")
    expires_at = user.get("subscription_expires_at")
    
    if not expires_at:
        return # legacy users
    
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=403, 
            detail=f"Your {tier} subscription expired on {expires_at.strftime('%Y-%m-%d')}. "
                   "Don't worry, we retain your models for 1 month! Please renew to continue using them."
        )

def check_can_train(user: dict):
    """Enforces the subscription's active status and maximum models limit."""
    _check_subscription_active(user)
    
    tier = user.get("subscription_tier", "free")
    max_models = TIER_LIMITS.get(tier, TIER_LIMITS["free"])['models']
    
    current_models = db["models"].count_documents({"user_id": str(user["_id"])})
    if current_models >= max_models:
        raise HTTPException(
            status_code=403,
            detail=f"Upgrade required. Your {tier} plan allows a maximum of {max_models} models."
        )

def check_can_predict(user: dict):
    """Enforces the subscription's active status and API calls limit. Increments usage."""
    _check_subscription_active(user)
    
    tier = user.get("subscription_tier", "free")
    max_calls = TIER_LIMITS.get(tier, TIER_LIMITS["free"])["api_calls"]
    current_calls = user.get("api_calls_this_month", 0)
    
    if current_calls >= max_calls:
        raise HTTPException(
            status_code=429,
            detail=f"API Limit Exhausted. Your {tier} plan allows {max_calls} predictions."
        )
        
    # Increment usage counter atomically
    db["users"].update_one(
        {"_id": user["_id"]},
        {"$inc": {"api_calls_this_month": 1}}
    )

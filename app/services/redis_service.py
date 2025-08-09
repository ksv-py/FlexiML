import json 
from app.redis_client import redis_client

def save_training_config(session_id: str, config: dict, expiry_seconds: int = 3600):
    redis_client.setex(f"")
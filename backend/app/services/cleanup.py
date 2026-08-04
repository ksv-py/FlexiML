# app/services/cleanup.py
import asyncio
from datetime import datetime, timedelta, timezone
from app.database import db
from app.routes.predict import delete_model

class DummyUser:
    """Mock user object to bypass ownership assertions during automated cleanup."""
    def __init__(self, uid):
        self.uid = uid
        
    def __getitem__(self, key):
        if key == "_id":
            return self.uid
        return None
        
    def get(self, key, default=None):
        return None

async def cleanup_free_models_loop():
    """Background loop that deletes Free Trial models older than 6 hours."""
    while True:
        try:
            # Find all free tier users
            free_users = db["users"].find({"subscription_tier": "free"})
            
            for user in free_users:
                user_id = str(user["_id"])
                # Models older than 6 hours for this user
                six_hours_ago = datetime.now(timezone.utc) - timedelta(hours=6)
                
                expired_models = db["models"].find({
                    "user_id": user_id,
                    "created_at": {"$lt": six_hours_ago}
                })
                
                for model in expired_models:
                    model_id = str(model["_id"])
                    try:
                        dummy_auth = DummyUser(user_id)
                        # We re-use the cascade delete function, mocking the current user dependency payload
                        await delete_model(model_id, user=dummy_auth)
                        print(f"Cleanup Task: Deleted expired Free tier model {model_id}")
                    except Exception as e:
                        print(f"Cleanup Task: Failed to delete model {model_id} - {e}")
                        
        except Exception as e:
            print(f"Cleanup Task Error: {e}")
            
        # Run every 30 minutes
        await asyncio.sleep(1800)

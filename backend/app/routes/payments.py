import os
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
import razorpay
from app.database import db
from app.auth.api_key import get_current_user
from bson import ObjectId

router = APIRouter(prefix="/payments", tags=["Payments"])

def upgrade_user_subscription(user_id: str, plan: str):
    user = db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        return
        
    current_expires = user.get("subscription_expires_at")
    now = datetime.now(timezone.utc)
    
    # DB might store naive datetime for UTC
    if current_expires and current_expires.tzinfo is None:
        current_expires = current_expires.replace(tzinfo=timezone.utc)
        
    if current_expires and current_expires > now:
        new_expires = current_expires + timedelta(days=30)
    else:
        new_expires = now + timedelta(days=30)
        
    db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "subscription_tier": plan,
                "subscription_expires_at": new_expires,
                "api_calls_this_month": 0
            }
        }
    )

RAZORPAY_KEY = os.getenv("RAZORPAY_KEY", "dummy_key")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "dummy_secret")

client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))

class OrderCreateRequest(BaseModel):
    plan: str  # "starter" or "pro"

@router.post("/create-order", summary="Create a Razorpay order for subscription.")
async def create_order(request: OrderCreateRequest, user: dict = Depends(get_current_user)):
    amount = 0
    if request.plan == "starter":
        amount = 49900  # ₹499 in paise
    elif request.plan == "pro":
        amount = 149900 # ₹1499 in paise
    else:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")
        
    order_data = {
        "amount": amount,
        "currency": "INR",
        "receipt": f"rcpt_{str(user['_id'])[-6:]}_{int(datetime.now().timestamp())}",
        "notes": {
            "user_id": str(user["_id"]),
            "plan": request.plan
        }
    }
    
    try:
        if not RAZORPAY_KEY.startswith("rzp_"):
            return {
                "order_id": f"mock_order_{int(datetime.now().timestamp())}",
                "amount": amount,
                "currency": "INR",
                "key": "mock_test_mode"
            }

        # Create Razorpay order
        order = client.order.create(data=order_data)
        return {
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key": RAZORPAY_KEY
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment Gateway Error: {str(e)}")


@router.post("/webhook", summary="Razorpay webhook for payment success.")
async def payment_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Signature missing")

    expected_sig = hmac.new(
        bytes(RAZORPAY_SECRET, 'latin-1'),
        payload,
        hashlib.sha256
    ).hexdigest()

    if expected_sig != signature:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    data = await request.json()
    
    event = data.get("event")
    if event == "payment.captured":
        payment_entity = data["payload"]["payment"]["entity"]
        notes = payment_entity.get("notes", {})
        user_id = notes.get("user_id")
        plan = notes.get("plan")
        
        if user_id and plan:
            upgrade_user_subscription(user_id, plan)
            
    return {"status": "ok"}


@router.post("/mock-webhook", summary="Developer Mock Webhook for local testing.")
async def mock_webhook(request: OrderCreateRequest, user: dict = Depends(get_current_user)):
    if RAZORPAY_KEY.startswith("rzp_"):
        raise HTTPException(status_code=403, detail="Not available when real Razorpay keys are active.")
    
    upgrade_user_subscription(str(user["_id"]), request.plan)
    return {"status": "mock_success"}

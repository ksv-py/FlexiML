from fastapi import APIRouter, HTTPException, Depends
from app.auth.api_key import get_current_user
from app.models.train import TrainRequest
from app.services.train import apply_preprocessor

router = APIRouter(prefix="/train", tags=["Train"])

@router.post("/start", summary="Start a training job")
async def start_training(
    request: TrainRequest,
    user: dict = Depends(get_current_user),
):
    try:
        result = apply_preprocessor(request, return_data=False)
        return {
            "message": "Training job accepted.",
            "details": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

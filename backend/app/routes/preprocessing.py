from fastapi import APIRouter, HTTPException, Depends
from app.services.preprocessor import create_preprocessor_object
from app.models.preprocessing import PreprocessRequest
from app.auth.api_key import get_current_user

router = APIRouter(prefix="/preprocessing", tags=["Preprocessing"])

@router.post("/create", summary="Create a preprocessing blueprint from a dataset")
async def create_preprocessor(
    request: PreprocessRequest,
    user: dict = Depends(get_current_user),
):
    try:
        result = create_preprocessor_object(request)
        return {
            "message": "Preprocessor blueprint created successfully.",
            **result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

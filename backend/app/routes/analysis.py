from fastapi import APIRouter, HTTPException
from app.services.analyzer import analyze_dataset, analyze_preprocessor

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get("/datasets/{dataset_id}", summary="Analyze a raw dataset — stats and anomaly flags.")
async def get_dataset_analysis(dataset_id: str):
    try:
        result = analyze_dataset(dataset_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/preprocessors/{preprocessor_id}", summary="Analyze preprocessor output — quality checks.")
async def get_preprocessor_analysis(preprocessor_id: str):
    try:
        result = analyze_preprocessor(preprocessor_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

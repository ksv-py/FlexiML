from pydantic import BaseModel
from typing import Union, Optional

class PredictRequest(BaseModel):
    data: dict  # Single row input as a dictionary

class PredictResponse(BaseModel):
    prediction: Union[str, float, int, list]
    model_id: str
    model_name: Optional[str] = None
    problem_type: Optional[str] = None

class PredictBatchRequest(BaseModel):
    data: list[dict]

class PredictBatchResponse(BaseModel):
    model_id: str
    model_name: Optional[str] = None
    problem_type: Optional[str] = None
    count: int
    predictions: list[Union[str, float, int]]

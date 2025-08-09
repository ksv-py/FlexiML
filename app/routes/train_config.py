# app/routes/train_config.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Union

router = APIRouter()

# Schema for Training Configuration
class TrainingConfig(BaseModel):
    dataset_id: str = Field(..., description="ID of the uploaded dataset")
    target_column: Optional[str] = Field(None, description="Target column name (not required for unsupervised learning)")
    task_type: Literal['supervised', 'unsupervised']
    algorithm_type: Literal['classification', 'regression', 'clustering']
    model_choice: Literal['auto', 'custom']
    selected_model: Optional[str] = Field(None, description="Required if model_choice is 'custom'")
    hyperparameter_choice: Literal['auto', 'custom']
    custom_hyperparameters: Optional[Dict[str, Union[str, int, float, bool]]] = Field(
        None, description="Custom hyperparameters if hyperparameter_choice is 'custom'"
    )

@router.post("/configure")
async def configure_training(config: TrainingConfig):
    # Basic validation
    if config.task_type == 'supervised' and not config.target_column:
        raise HTTPException(status_code=400, detail="Target column is required for supervised tasks")
    if config.model_choice == 'custom' and not config.selected_model:
        raise HTTPException(status_code=400, detail="Model name is required when model_choice is 'custom'")
    if config.hyperparameter_choice == 'custom' and not config.custom_hyperparameters:
        raise HTTPException(status_code=400, detail="Custom hyperparameters required when hyperparameter_choice is 'custom'")

    # Save to DB or cache layer for downstream training
    # TODO: Implement saving config to MongoDB or in-memory store

    return {"message": "Training configuration saved successfully", "config": config}

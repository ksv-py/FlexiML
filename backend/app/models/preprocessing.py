from typing import Optional
from pydantic import BaseModel

class PreprocessRequest(BaseModel):
    dataset_id: str
    target_column: Optional[str] = None
    missing_value_strategy: Optional[str] = "mean"   # mean, median, most_frequent
    encoding_strategy: Optional[str] = "label"       # label or one_hot
    drop_columns: Optional[list[str]] = []

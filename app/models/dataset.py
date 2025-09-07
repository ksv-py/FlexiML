from pydantic import BaseModel
from typing import Optional

class Datasetupload(BaseModel):
    name: str
    description: Optional[str] = None
    
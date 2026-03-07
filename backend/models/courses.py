from pydantic import BaseModel
from typing import List, Optional

class Course(BaseModel):
    id: str
    title: str
    description: str
    level: str
    modules: List[str] = []

from pydantic import BaseModel
from typing import Dict

class UserProgress(BaseModel):
    user_id: str
    completed_lessons: list[str] = []
    scores: Dict[str, int] = {}

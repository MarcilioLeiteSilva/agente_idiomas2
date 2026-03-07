from fastapi import APIRouter, HTTPException
from services.memory.memory_service import MemoryService
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/v1/memory", tags=["memory"])
memory_service = MemoryService()

class MemorySummaryResponse(BaseModel):
    user_id: str
    items_count: int
    active_weaknesses: List[dict]

@router.get("/summary", response_model=MemorySummaryResponse)
def get_memory_summary(user_id: str):
    try:
        return memory_service.get_summary(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/weaknesses")
def get_memory_weaknesses(user_id: str):
    summary = memory_service.get_summary(user_id)
    return {"weaknesses": summary["active_weaknesses"]}

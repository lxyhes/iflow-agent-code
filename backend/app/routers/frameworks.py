from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.app.dependencies import verify_token
from backend.core.frameworks import framework_status, recommend_stack
from backend.core.providers.provider_status import effective_provider_plan


router = APIRouter(
    prefix="/api/frameworks",
    tags=["frameworks"],
    dependencies=[Depends(verify_token)],
)


class RecommendRequest(BaseModel):
    goals: List[str] = Field(default_factory=list)
    constraints: Optional[Dict[str, Any]] = None


@router.get("/status")
async def get_framework_status():
    return {"frameworks": framework_status()}


@router.post("/recommend")
async def post_recommend(req: RecommendRequest):
    return recommend_stack(req.goals, req.constraints)


@router.get("/providers/plan")
async def get_providers_plan():
    return effective_provider_plan()

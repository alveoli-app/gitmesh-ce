"""
Health check endpoints.
"""

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    service: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="chat-orchestrator",
        version="1.0.0",
    )


@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes."""
    # TODO: Check OpenAI API connectivity
    # TODO: Check backend connectivity
    return {"status": "ready"}

"""
Agents API endpoints for provider status and configuration.
"""

import structlog
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from app.services.llm_manager import get_available_providers

router = APIRouter()
logger = structlog.get_logger(__name__)


class ProviderInfo(BaseModel):
    """Information about an LLM provider."""
    name: str
    provider_id: str
    configured: bool
    model: str
    preferred: bool = False
    url: str = None


class ProvidersResponse(BaseModel):
    """Response with available providers."""
    providers: List[ProviderInfo] = Field(default_factory=list)
    hasConfigured: bool = False
    message: str = ""


@router.get("/providers", response_model=ProvidersResponse)
async def get_providers() -> ProvidersResponse:
    """
    Get list of available LLM providers and their configuration status.
    
    This endpoint helps users understand which LLM providers are available
    and provides guidance for configuration.
    """
    logger.info("checking_available_providers")
    
    try:
        providers = get_available_providers()
        configured = [p for p in providers if p["configured"]]
        
        # Build response
        provider_infos = [
            ProviderInfo(
                name=p["name"],
                provider_id=p["provider_id"],
                configured=p["configured"],
                model=p["model"],
                preferred=p.get("preferred", False),
                url=p.get("url"),
            )
            for p in providers
        ]
        
        message = ""
        if not configured:
            message = (
                "No LLM providers are currently configured. "
                "Please configure Ollama (recommended) or add an API key for a cloud provider. "
                "See the chat page for setup instructions."
            )
        else:
            active = next((p for p in configured if p.get("preferred")), configured[0])
            message = f"Using {active['name']} with model {active['model']}"
        
        return ProvidersResponse(
            providers=provider_infos,
            hasConfigured=bool(configured),
            message=message,
        )
        
    except Exception as e:
        logger.error("provider_check_failed", error=str(e), exc_info=e)
        return ProvidersResponse(
            providers=[],
            hasConfigured=False,
            message=f"Failed to check providers: {str(e)}",
        )

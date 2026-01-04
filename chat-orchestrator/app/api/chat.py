"""
Chat API endpoints for processing messages with CrewAI.
"""

import structlog
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential

from app.services.chat_processor import ChatProcessor
from app.services.title_generator import TitleGenerator


router = APIRouter()
logger = structlog.get_logger(__name__)


# ============================================
# Request/Response Models
# ============================================

class MessageContext(BaseModel):
    """Context for chat processing."""
    conversation: Dict[str, Any] = Field(default_factory=dict)
    project: Optional[Dict[str, Any]] = None
    cycle: Optional[Dict[str, Any]] = None
    team: Optional[List[Dict[str, Any]]] = None
    recentMessages: List[Dict[str, Any]] = Field(default_factory=list)
    mentionedEntities: List[Dict[str, Any]] = Field(default_factory=list)
    user: Optional[Dict[str, Any]] = None



class ProcessMessageRequest(BaseModel):
    """Request to process a chat message."""
    conversationId: str
    messageId: str
    content: str
    context: MessageContext = Field(default_factory=MessageContext)
    userId: str
    tenantId: str
    agentToolSets: Optional[Dict[str, List[str]]] = None


class ActionProposal(BaseModel):
    """Proposed action from agent."""
    agentId: str
    actionType: str
    parameters: Dict[str, Any]
    reasoning: str
    affectedEntities: List[Dict[str, Any]] = Field(default_factory=list)
    confidenceScore: float = 0.8


class ProcessMessageResponse(BaseModel):
    """Response from message processing."""
    content: str
    agentId: Optional[str] = None
    proposals: List[ActionProposal] = Field(default_factory=list)
    tokensUsed: int = 0


class GenerateTitleRequest(BaseModel):
    """Request to generate conversation title."""
    message: str


class GenerateTitleResponse(BaseModel):
    """Generated title response."""
    title: str


# ============================================
# Endpoints
# ============================================

@router.post("/process", response_model=ProcessMessageResponse)
async def process_message(
    request: ProcessMessageRequest,
    background_tasks: BackgroundTasks,
) -> ProcessMessageResponse:
    """
    Process a chat message with CrewAI agents.
    
    This endpoint:
    1. Analyzes the user's message intent
    2. Routes to appropriate agent(s)
    3. Executes agent workflow
    4. Returns response with optional action proposals
    """
    logger.info(
        "processing_message",
        conversation_id=request.conversationId,
        message_id=request.messageId,
        content_length=len(request.content),
    )
    
    try:
        processor = ChatProcessor()
        result = await processor.process(
            content=request.content,
            context=request.context.model_dump(),
            conversation_id=request.conversationId,
            user_id=request.userId,
            tenant_id=request.tenantId,
            agent_tool_sets=request.agentToolSets,
        )
        
        # Log telemetry in background
        background_tasks.add_task(
            _log_telemetry,
            tenant_id=request.tenantId,
            agent_name=result.get("agent_id", "chat-agent"),
            task_type="chat_response",
            duration_ms=result.get("duration_ms", 0),
            tokens_used=result.get("tokens_used", 0),
            success=True,
        )
        
        return ProcessMessageResponse(
            content=result.get("content", ""),
            agentId=result.get("agent_id"),
            proposals=[ActionProposal(**p) for p in result.get("proposals", [])],
            tokensUsed=result.get("tokens_used", 0),
        )
        
    except Exception as e:
        logger.error(
            "message_processing_failed",
            conversation_id=request.conversationId,
            error=str(e),
            exc_info=e,
        )
        
        # Log failed telemetry
        background_tasks.add_task(
            _log_telemetry,
            tenant_id=request.tenantId,
            agent_name="chat-agent",
            task_type="chat_response",
            duration_ms=0,
            tokens_used=0,
            success=False,
            error_message=str(e),
        )
        
        # Return error message instead of raising
        return ProcessMessageResponse(
            content=f"I encountered an error while processing your request: {str(e)}\n\nPlease try rephrasing your question.",
            tokensUsed=0,
        )


@router.post("/generate-title", response_model=GenerateTitleResponse)
async def generate_title(request: GenerateTitleRequest) -> GenerateTitleResponse:
    """Generate a conversation title from the first message."""
    logger.info("generating_title", message_length=len(request.message))
    
    try:
        generator = TitleGenerator()
        title = await generator.generate(request.message)
        
        return GenerateTitleResponse(title=title)
        
    except Exception as e:
        logger.error("title_generation_failed", error=str(e))
        # Fallback to truncated message
        fallback = request.message[:50] + ("..." if len(request.message) > 50 else "")
        return GenerateTitleResponse(title=fallback)


# ============================================
# Helper Functions
# ============================================

async def _log_telemetry(
    tenant_id: str,
    agent_name: str,
    task_type: str,
    duration_ms: int,
    tokens_used: int,
    success: bool,
    error_message: str = None,
):
    """Log telemetry to backend (background task)."""
    import httpx
    from app.config import settings
    
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{settings.backend_url}/api/telemetry/crewai",
                headers=settings.backend_headers,
                json={
                    "tenantId": tenant_id,
                    "agentName": agent_name,
                    "taskType": task_type,
                    "durationMs": duration_ms,
                    "tokensUsed": tokens_used,
                    "success": success,
                    "errorMessage": error_message,
                },
                timeout=10.0,
            )
    except Exception as e:
        logger.warning("telemetry_logging_failed", error=str(e))

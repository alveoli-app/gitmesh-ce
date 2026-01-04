"""
Chat Orchestrator - FastAPI Application Entry Point
"""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.api import chat, agents, health, providers


# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("chat_orchestrator_starting", version="1.0.0", port=settings.port)
    yield
    logger.info("chat_orchestrator_shutdown")


app = FastAPI(
    title="Chat Orchestrator",
    description="CrewAI-powered chat service for DevSpace",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions with structured logging."""
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.debug else "An unexpected error occurred",
        },
    )


# Register routers
app.include_router(health.router, tags=["Health"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(agents.router, prefix="/agents", tags=["Agents"])
app.include_router(providers.router, prefix="/providers", tags=["Providers"])


@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": "chat-orchestrator",
        "version": "1.0.0",
        "status": "running",
    }

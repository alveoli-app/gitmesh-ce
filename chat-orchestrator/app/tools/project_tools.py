"""
Project information tools for CrewAI agents.
Wraps backend Projects Bridge endpoints.
"""

from crewai.tools import tool
from typing import Optional
import structlog

from app.tools.base import BackendClient, BackendToolError


logger = structlog.get_logger(__name__)

_client: Optional[BackendClient] = None


def init_project_tools(client: BackendClient):
    """Initialize project tools with backend client."""
    global _client
    _client = client


@tool("Get Project Summary")
def get_project_summary(project_id: str) -> str:
    """
    Get a comprehensive summary of a project.
    
    Includes metadata, status stats, lead info, and cycle status.
    Use this to understand the project context before performing other actions.
    
    Args:
        project_id: Required. The project ID.
    
    Returns:
        Project summary with goals, status, and stats.
    """
    if not _client:
        return "Error: Project tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_project_summary",
                "/projects/summary",
                {"projectId": project_id},
            )
        )
        
        data = result if isinstance(result, dict) and "id" in result else result.get("data", {})
        
        if not data:
            return "Project not found."
        
        formatted = [
            f"**Project: {data.get('name')}**",
            f"{data.get('description', 'No description')}",
            "",
            "**Stats:**",
        ]
        
        stats = data.get("stats", {})
        if stats:
            for status, count in stats.items():
                formatted.append(f"  • {status}: {count}")
        else:
            formatted.append("  No issue stats available")
            
        return "\n".join(formatted)
        
    except BackendToolError as e:
        return f"Error getting project summary: {e.message}"

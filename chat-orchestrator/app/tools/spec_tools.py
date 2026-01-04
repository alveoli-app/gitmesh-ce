"""
Specification document tools for CrewAI agents.
Wraps backend Specs Bridge endpoints.
"""

from crewai.tools import tool
from typing import Optional
import structlog

from app.tools.base import BackendClient, BackendToolError


logger = structlog.get_logger(__name__)

_client: Optional[BackendClient] = None


def init_spec_tools(client: BackendClient):
    """Initialize spec tools with backend client."""
    global _client
    _client = client


@tool("List Specs")
def list_specs(
    project_id: str,
    status: str = "",
    limit: int = 20,
) -> str:
    """
    List specification documents for a project.
    
    Use this to find existing specs, PRDs, or technical documentation.
    
    Args:
        project_id: Required. The project ID.
        status: Optional filter: draft, review, approved, archived.
        limit: Maximum results (default 20).
    
    Returns:
        List of specs with titles and status.
    """
    if not _client:
        return "Error: Spec tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "list_specs",
                "/specs/list",
                {"projectId": project_id, "status": status, "limit": limit},
            )
        )
        
        specs = result if isinstance(result, list) else result.get("data", [])
        
        if not specs:
            return "No specs found for this project."
        
        formatted = ["**Specification Documents**", ""]
        for spec in specs:
            status_icon = {
                "draft": "📝",
                "review": "👀",
                "approved": "✅",
                "archived": "📦",
            }.get(spec.get("status"), "📄")
            
            formatted.append(
                f"{status_icon} **{spec.get('title')}** ({spec.get('status', 'draft')})"
            )
            if spec.get("author"):
                formatted.append(f"   Author: {spec['author'].get('fullName', 'Unknown')}")
            formatted.append(f"   Updated: {spec.get('updatedAt', 'N/A')}")
            formatted.append("")
        
        return "\n".join(formatted)
        
    except BackendToolError as e:
        return f"Error listing specs: {e.message}"


@tool("Get Spec")
def get_spec(spec_id: str) -> str:
    """
    Get detailed content of a specification document.
    
    Use this to read the full content of a spec, including its sections,
    requirements, and acceptance criteria.
    
    Args:
        spec_id: Required. The spec document ID.
    
    Returns:
        Full spec content with metadata.
    """
    if not _client:
        return "Error: Spec tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_spec",
                "/specs/get",
                {"specId": spec_id},
            )
        )
        
        spec = result if isinstance(result, dict) and "id" in result else result.get("data")
        
        if not spec:
            return "Spec not found."
        
        details = [
            f"# {spec.get('title', 'Untitled Spec')}",
            "",
            f"**Status:** {spec.get('status', 'draft')}",
            f"**Author:** {spec.get('author', {}).get('fullName', 'Unknown')}",
            f"**Created:** {spec.get('createdAt', 'N/A')}",
            f"**Updated:** {spec.get('updatedAt', 'N/A')}",
            "",
            "---",
            "",
            spec.get("content", "*No content available*"),
        ]
        
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error getting spec: {e.message}"


@tool("Create Spec")
def create_spec(
    project_id: str,
    title: str,
    content: str,
) -> str:
    """
    Create a new specification document.
    
    IMPORTANT: This is a write operation. The agent should propose this as an
    action for user approval rather than executing directly.
    
    Use this to create PRDs, technical specs, or design documents.
    
    Args:
        project_id: Required. The project ID.
        title: Required. Title of the spec document.
        content: Required. Full markdown content of the spec.
    
    Returns:
        Created spec details with ID.
    """
    if not _client:
        return "Error: Spec tools not initialized"
    
    import asyncio
    
    try:
        return asyncio.get_event_loop().run_until_complete(
            _client.propose_tool_call(
                action_type="create_spec",
                parameters={
                    "projectId": project_id,
                    "title": title,
                    "content": content,
                },
                reasoning=f"Creating new spec '{title}'.",
                affected_entities=[{"type": "project", "id": project_id}],
                confidence_score=1.0
            )
        )
        
    except BackendToolError as e:
        return f"Error proposing spec creation: {e.message}"


@tool("Update Spec")
def update_spec(
    spec_id: str,
    title: str = None,
    content: str = None,
    status: str = None,
    change_log: str = None,
) -> str:
    """
    Update an existing specification document.
    
    IMPORTANT: This is a write operation. The agent should propose this as an
    action for user approval rather than executing directly.
    
    Updates to content create a new version automatically.
    
    Args:
        spec_id: Required. The spec document ID.
        title: Optional. New title.
        content: Optional. New content (creates version).
        status: Optional. New status: draft, review, approved, archived.
        change_log: Optional. Description of changes for version history.
    
    Returns:
        Updated spec confirmation.
    """
    if not _client:
        return "Error: Spec tools not initialized"
    
    import asyncio
    
    updates = {}
    if title is not None:
        updates["title"] = title
    if content is not None:
        updates["content"] = content
    if status is not None:
        updates["status"] = status
    
    if not updates:
        return "No updates provided."
    
    try:
        return asyncio.get_event_loop().run_until_complete(
            _client.propose_tool_call(
                action_type="update_spec",
                parameters={
                    "specId": spec_id,
                    "updates": updates,
                    "changeLog": change_log or "Updated via AI agent",
                },
                reasoning=f"Updating spec {spec_id}.",
                affected_entities=[{"type": "spec", "id": spec_id}],
                confidence_score=1.0
            )
        )
        
    except BackendToolError as e:
        return f"Error proposing spec update: {e.message}"

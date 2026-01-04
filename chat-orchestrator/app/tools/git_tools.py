"""
Git activity tools for CrewAI agents.
Wraps backend Git Bridge endpoints.
"""

from crewai.tools import tool
from typing import Optional
import structlog

from app.tools.base import BackendClient, BackendToolError


logger = structlog.get_logger(__name__)

_client: Optional[BackendClient] = None


def init_git_tools(client: BackendClient):
    """Initialize git tools with backend client."""
    global _client
    _client = client


@tool("Get Commit Activity")
def get_commit_activity(project_id: str, days: int = 7) -> str:
    """
    Get recent git commit activity for the project.
    
    Use this to see what code changes have happened recently, who is committing,
    and the volume of activity.
    
    Args:
        project_id: Required. The project ID.
        days: Optional. Number of days to look back (default 7).
    
    Returns:
        List of recent commits with authors and messages.
    """
    if not _client:
        return "Error: Git tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_recent_commits",
                "/git/commits",
                {"projectId": project_id, "days": days},
            )
        )
        
        commits = result if isinstance(result, list) else result.get("data", [])
        
        if not commits:
            return "No recent commits found."
        
        formatted = [f"**Recent Commits (Last {days} days)**", ""]
        for commit in commits[:15]:
            formatted.append(
                f"• `{commit.get('sha', 'unknown')[:7]}` {commit.get('message')} "
                f"- **{commit.get('author')}** ({commit.get('date', '')[:10]})"
            )
        
        if len(commits) > 15:
            formatted.append(f"...and {len(commits) - 15} more")
            
        return "\n".join(formatted)
        
    except BackendToolError as e:
        return f"Error getting commits: {e.message}"


@tool("Get Linked PRs")
def get_linked_prs(project_id: str, status: str = "open") -> str:
    """
    Get Pull Requests linked to the project.
    
    Use this to see code review status, pending merges, and active development.
    
    Args:
        project_id: Required. The project ID.
        status: Optional. PR status (open, closed, merged, all). Default 'open'.
    
    Returns:
        List of PRs with status and links.
    """
    if not _client:
        return "Error: Git tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_recent_prs",
                "/git/prs",
                {"projectId": project_id, "status": status},
            )
        )
        
        prs = result if isinstance(result, list) else result.get("data", [])
        
        if not prs:
            return f"No {status} PRs found."
        
        formatted = [f"**Pull Requests ({status})**", ""]
        for pr in prs:
            icon = {
                "open": "🟢",
                "merged": "🟣",
                "closed": "🔴",
            }.get(pr.get("status"), "⚪")
            
            formatted.append(
                f"{icon} **{pr.get('title')}** ({pr.get('author')})\n"
                f"   url: {pr.get('url')}\n"
            )
            
        return "\n".join(formatted)
        
    except BackendToolError as e:
        return f"Error getting PRs: {e.message}"

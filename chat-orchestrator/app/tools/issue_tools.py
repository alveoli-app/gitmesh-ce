"""
Issue management tools for CrewAI agents.
Wraps backend Issue Bridge endpoints.
"""

from crewai.tools import tool
from typing import Optional, List, Dict, Any
import structlog

from app.tools.base import BackendClient, BackendToolError


logger = structlog.get_logger(__name__)


# Global client instance (set during agent initialization)
_client: Optional[BackendClient] = None


def init_issue_tools(client: BackendClient):
    """Initialize issue tools with backend client."""
    global _client
    _client = client


@tool("Search Issues")
def search_issues(
    project_id: str,
    query: str = "",
    status: str = "",
    priority: str = "",
    assignee_id: str = "",
    cycle_id: str = "",
    limit: int = 20,
) -> str:
    """
    Search for issues in a project with optional filters.
    
    Use this when you need to find issues based on:
    - Text search in title/description
    - Status filters (backlog, todo, in_progress, review, done)
    - Priority filters (critical, high, medium, low)
    - Assignment to specific users
    - Sprint/cycle membership
    
    Args:
        project_id: Required. The project ID to search in.
        query: Optional text to search in title and description.
        status: Optional comma-separated status values.
        priority: Optional comma-separated priority values.
        assignee_id: Optional user ID to filter by assignee.
        cycle_id: Optional cycle/sprint ID to filter by.
        limit: Maximum results to return (default 20).
    
    Returns:
        JSON string with list of matching issues.
    """
    if not _client:
        return "Error: Issue tools not initialized"
    
    import asyncio
    
    try:
        filters = {}
        if status:
            filters["status"] = status.split(",")
        if priority:
            filters["priority"] = priority.split(",")
        if assignee_id:
            filters["assigneeId"] = assignee_id
        if cycle_id:
            filters["cycleId"] = cycle_id
        
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "search_issues",
                "/issues/search",
                {
                    "projectId": project_id,
                    "query": query,
                    "filters": filters,
                    "limit": limit,
                },
            )
        )
        
        issues = result if isinstance(result, list) else result.get("data", [])
        
        if not issues:
            return "No issues found matching the criteria."
        
        # Format issues for agent consumption
        formatted = []
        for issue in issues:
            formatted.append(
                f"• [{issue.get('priority', 'medium').upper()}] {issue.get('title')} "
                f"(ID: {issue.get('id')[:8]}, Status: {issue.get('status')})"
            )
        
        return f"Found {len(issues)} issues:\n" + "\n".join(formatted)
        
    except BackendToolError as e:
        logger.error("search_issues_failed", error=e.message)
        return f"Error searching issues: {e.message}"
    except Exception as e:
        logger.error("search_issues_unexpected_error", error=str(e))
        return f"Unexpected error: {str(e)}"


@tool("Get Issue Details")
def get_issue(issue_id: str) -> str:
    """
    Get detailed information about a specific issue.
    
    Use this when you need the full details of an issue including:
    - Complete description
    - Assignee information
    - Sprint/cycle assignment
    - Comments history
    - Story points and estimates
    
    Args:
        issue_id: The unique ID of the issue to retrieve.
    
    Returns:
        Detailed issue information formatted as text.
    """
    if not _client:
        return "Error: Issue tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_issue",
                "/issues/get",
                {"issueId": issue_id},
            )
        )
        
        issue = result if isinstance(result, dict) and "id" in result else result.get("data", {})
        
        if not issue:
            return f"Issue {issue_id} not found."
        
        # Format issue details
        details = [
            f"**{issue.get('title')}**",
            f"ID: {issue.get('id')}",
            f"Status: {issue.get('status')}",
            f"Priority: {issue.get('priority')}",
            f"Type: {issue.get('type', 'task')}",
        ]
        
        if issue.get("assignee"):
            details.append(f"Assignee: {issue['assignee'].get('fullName', 'Unassigned')}")
        else:
            details.append("Assignee: Unassigned")
            
        if issue.get("storyPoints"):
            details.append(f"Story Points: {issue['storyPoints']}")
            
        if issue.get("estimatedHours"):
            details.append(f"Estimated Hours: {issue['estimatedHours']}")
            
        if issue.get("cycle"):
            details.append(f"Sprint: {issue['cycle'].get('name', 'Unknown')}")
            
        if issue.get("description"):
            details.append(f"\nDescription:\n{issue['description'][:500]}...")
            
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error retrieving issue: {e.message}"


@tool("Create Issue")
def create_issue(
    project_id: str,
    title: str,
    description: str = "",
    priority: str = "medium",
    issue_type: str = "task",
    story_points: int = None,
    assignee_id: str = None,
    cycle_id: str = None,
) -> str:
    """
    Create a new issue in the project.
    
    IMPORTANT: This is a write operation. The agent should propose this as an
    action for user approval rather than executing directly.
    
    Args:
        project_id: Required. The project to create the issue in.
        title: Required. Clear, descriptive title for the issue.
        description: Detailed description with acceptance criteria.
        priority: One of: critical, high, medium, low (default: medium).
        issue_type: One of: bug, feature, task, story (default: task).
        story_points: Estimated complexity in story points.
        assignee_id: User ID to assign the issue to.
        cycle_id: Sprint/cycle ID to add the issue to.
    
    Returns:
        Confirmation with new issue ID, or error message.
    """
    if not _client:
        return "Error: Issue tools not initialized"
    
    import asyncio
    
    try:
        parameters = {
            "projectId": project_id,
            "title": title,
            "description": description,
            "priority": priority,
            "type": issue_type,
            "storyPoints": story_points,
            "assigneeId": assignee_id,
            "cycleId": cycle_id,
        }
        
        return asyncio.get_event_loop().run_until_complete(
            _client.propose_tool_call(
                action_type="create_issue",
                parameters=parameters,
                reasoning=f"Creating new issue '{title}' as requested.",
                affected_entities=[{"type": "project", "id": project_id}],
                confidence_score=1.0
            )
        )
        
    except BackendToolError as e:
        return f"Error proposing issue creation: {e.message}"


@tool("Update Issue")
def update_issue(
    issue_id: str,
    title: str = None,
    description: str = None,
    status: str = None,
    priority: str = None,
    story_points: int = None,
    assignee_id: str = None,
) -> str:
    """
    Update an existing issue.
    
    IMPORTANT: This is a write operation. The agent should propose this as an
    action for user approval rather than executing directly.
    
    Only provide the fields you want to change. Omit fields to keep current values.
    
    Args:
        issue_id: Required. The issue to update.
        title: New title (optional).
        description: New description (optional).
        status: New status: backlog, todo, in_progress, review, done (optional).
        priority: New priority: critical, high, medium, low (optional).
        story_points: New story points estimate (optional).
        assignee_id: New assignee user ID (optional).
    
    Returns:
        Confirmation of updates made, or error message.
    """
    if not _client:
        return "Error: Issue tools not initialized"
    
    import asyncio
    
    updates = {}
    if title is not None:
        updates["title"] = title
    if description is not None:
        updates["description"] = description
    if status is not None:
        updates["status"] = status
    if priority is not None:
        updates["priority"] = priority
    if story_points is not None:
        updates["storyPoints"] = story_points
    if assignee_id is not None:
        updates["assigneeId"] = assignee_id
    
    if not updates:
        return "No updates specified. Please provide at least one field to update."
    
    try:
        return asyncio.get_event_loop().run_until_complete(
            _client.propose_tool_call(
                action_type="update_issue",
                parameters={
                    "issueId": issue_id,
                    "updates": updates,
                },
                reasoning=f"Updating issue {issue_id} based on user request.",
                affected_entities=[{"type": "issue", "id": issue_id}],
                confidence_score=1.0
            )
        )
        
    except BackendToolError as e:
        return f"Error proposing issue update: {e.message}"

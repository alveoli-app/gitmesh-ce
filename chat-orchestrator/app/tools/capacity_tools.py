"""
Team capacity management tools for CrewAI agents.
Wraps backend Capacity Bridge endpoints.
"""

from crewai.tools import tool
from typing import Optional
import structlog

from app.tools.base import BackendClient, BackendToolError


logger = structlog.get_logger(__name__)

_client: Optional[BackendClient] = None


def init_capacity_tools(client: BackendClient):
    """Initialize capacity tools with backend client."""
    global _client
    _client = client


@tool("Get Team Capacity")
def get_team_capacity(project_id: str) -> str:
    """
    Get capacity overview for a project's team.
    
    Shows total vs allocated capacity, utilization percentages,
    and identifies overallocated team members.
    
    Use this for sprint planning and workload assessment.
    
    Args:
        project_id: Required. The project ID.
    
    Returns:
        Team capacity summary with member breakdowns.
    """
    if not _client:
        return "Error: Capacity tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_capacity_overview",
                "/capacity/overview",
                {"projectId": project_id},
            )
        )
        
        data = result if isinstance(result, dict) and "team" in result else result.get("data", {})
        
        if not data:
            return "No capacity data available."
        
        team = data.get("team", {})
        members = data.get("members", [])
        warnings = data.get("warnings", [])
        
        details = [
            "**Team Capacity Overview**",
            "",
            f"👥 Team Size: {team.get('memberCount', 0)} members",
            f"📊 Utilization: {team.get('utilizationPercent', 0)}%",
            f"⏰ Total Capacity: {team.get('totalCapacity', 0)} hours/week",
            f"📋 Allocated: {team.get('totalAllocated', 0)} hours",
            f"✅ Available: {team.get('availableCapacity', 0)} hours",
        ]
        
        if warnings:
            details.append("")
            details.append("⚠️ **Warnings:**")
            for w in warnings:
                details.append(f"  • {w.get('message', 'Unknown warning')}")
        
        if members:
            details.append("")
            details.append("**Member Breakdown:**")
            for m in members[:5]:  # Top 5
                status = "🔴" if m.get("isOverallocated") else "🟢"
                details.append(
                    f"  {status} {m.get('name')}: {m.get('utilizationPercent', 0)}% "
                    f"({m.get('assignedIssues', 0)} issues)"
                )
        
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error getting capacity: {e.message}"


@tool("Get Member Workload")
def get_member_workload(user_id: str, project_id: str = None) -> str:
    """
    Get detailed workload for a specific team member.
    
    Shows their assigned issues broken down by status and priority,
    along with utilization metrics.
    
    Args:
        user_id: Required. The user's ID.
        project_id: Optional. Filter to specific project.
    
    Returns:
        Member's workload breakdown with issue details.
    """
    if not _client:
        return "Error: Capacity tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_member_workload",
                "/capacity/member-workload",
                {"userId": user_id, "projectId": project_id},
            )
        )
        
        data = result if isinstance(result, dict) and "userId" in result else result.get("data", {})
        
        if not data:
            return "No workload data found for this user."
        
        issues = data.get("issues", {})
        urgent = data.get("urgentItems", [])
        
        details = [
            f"**Workload: {data.get('name', 'Unknown')}**",
            "",
            f"📊 Utilization: {data.get('utilizationPercent', 0)}%",
            f"⏰ Allocated: {data.get('allocatedHours', 0)} / {data.get('weeklyCapacity', 40)} hours",
            f"📦 Story Points: {data.get('allocatedPoints', 0)}",
            "",
            "**By Status:**",
            f"  • To Do: {issues.get('byStatus', {}).get('todo', 0)}",
            f"  • In Progress: {issues.get('byStatus', {}).get('in_progress', 0)}",
            f"  • In Review: {issues.get('byStatus', {}).get('review', 0)}",
            "",
            "**By Priority:**",
            f"  • Critical/High: {issues.get('byPriority', {}).get('critical', 0) + issues.get('byPriority', {}).get('high', 0)}",
            f"  • Medium: {issues.get('byPriority', {}).get('medium', 0)}",
            f"  • Low: {issues.get('byPriority', {}).get('low', 0)}",
        ]
        
        if urgent:
            details.append("")
            details.append("🚨 **Urgent Items:**")
            for item in urgent[:3]:
                details.append(f"  • [{item.get('priority', 'HIGH').upper()}] {item.get('title')}")
        
        if data.get("isOverallocated"):
            details.append("")
            details.append("⚠️ This team member is OVERALLOCATED. Consider reassigning some work.")
        
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error getting workload: {e.message}"


@tool("Check Overallocation")
def check_overallocation(project_id: str, threshold: int = 100) -> str:
    """
    Find team members who are overallocated.
    
    Identifies team members exceeding capacity threshold and provides
    recommendations for load balancing.
    
    Args:
        project_id: Required. The project ID.
        threshold: Utilization percentage threshold (default 100%).
    
    Returns:
        List of overallocated members with recommendations.
    """
    if not _client:
        return "Error: Capacity tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "check_overallocation",
                "/capacity/check-overallocation",
                {"projectId": project_id, "threshold": threshold},
            )
        )
        
        data = result if isinstance(result, dict) and "overallocatedCount" in result else result.get("data", {})
        
        if not data:
            return "Unable to check overallocation."
        
        overallocated = data.get("overallocatedMembers", [])
        summary = data.get("healthySummary", {})
        
        if not overallocated:
            return (
                f"✅ No team members are overallocated (threshold: {threshold}%).\n\n"
                f"Team Health:\n"
                f"  • Underutilized (<70%): {summary.get('underutilized', 0)}\n"
                f"  • Optimal (70-99%): {summary.get('optimal', 0)}\n"
                f"  • At Capacity (100-119%): {summary.get('atCapacity', 0)}"
            )
        
        details = [
            f"⚠️ **{len(overallocated)} Team Members Overallocated**",
            f"(Threshold: {threshold}%)",
            "",
        ]
        
        for m in overallocated:
            details.append(f"**{m.get('name')}** - {m.get('utilizationPercent')}%")
            details.append(f"  • Excess: {m.get('excessHours', 0)} hours over capacity")
            details.append(f"  • Issues: {m.get('assignedIssues', 0)} assigned")
            if m.get("recommendation"):
                details.append(f"  💡 {m['recommendation']}")
            details.append("")
        
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error checking overallocation: {e.message}"


@tool("Suggest Assignee")
def suggest_assignee(issue_id: str, project_id: str = None) -> str:
    """
    Suggest the best assignee for an issue based on capacity.
    
    Analyzes team workload and recommends who has capacity to take on work.
    
    Args:
        issue_id: Required. The issue to find an assignee for.
        project_id: Optional. The project ID (inferred from issue if not provided).
    
    Returns:
        Recommended assignee with reasoning and alternatives.
    """
    if not _client:
        return "Error: Capacity tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "suggest_assignee",
                "/team/suggest-assignee",
                {"issueId": issue_id, "projectId": project_id},
            )
        )
        
        data = result if isinstance(result, dict) and "issue" in result else result.get("data", {})
        
        if not data:
            return "Unable to suggest assignee."
        
        issue = data.get("issue", {})
        rec = data.get("recommendation")
        alts = data.get("alternatives", [])
        
        details = [
            f"**Assignee Suggestion for: {issue.get('title', 'Unknown Issue')}**",
            "",
        ]
        
        if rec:
            details.append("✅ **Recommended:**")
            details.append(f"  {rec.get('name')} ({rec.get('email', '')})")
            workload = rec.get("currentWorkload", {})
            details.append(f"  • Current utilization: {workload.get('utilizationPercent', 0)}%")
            details.append(f"  • Active issues: {workload.get('issueCount', 0)}")
            if data.get("reasoning"):
                details.append(f"  💡 {data['reasoning']}")
        else:
            details.append("❌ No suitable assignee found - all team members are at capacity.")
        
        if alts:
            details.append("")
            details.append("**Alternatives:**")
            for alt in alts[:3]:
                details.append(
                    f"  • {alt.get('name')}: {alt.get('currentWorkload', {}).get('utilizationPercent', 0)}% utilized"
                )
        
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error suggesting assignee: {e.message}"

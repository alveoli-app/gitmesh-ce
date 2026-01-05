"""
Cycle/Sprint management tools for CrewAI agents.
Wraps backend Cycles Bridge endpoints.
"""

from crewai.tools import tool
from typing import Optional
import structlog

from app.tools.base import BackendClient, BackendToolError


logger = structlog.get_logger(__name__)

_client: Optional[BackendClient] = None


def init_cycle_tools(client: BackendClient):
    """Initialize cycle tools with backend client."""
    global _client
    _client = client


@tool("List Cycles")
def list_cycles(
    project_id: str,
    status: str = "",
    limit: int = 10,
) -> str:
    """
    List cycles/sprints for a project.
    
    Use this to see all sprints in a project, optionally filtered by status.
    
    Args:
        project_id: Required. The project ID.
        status: Optional filter: planned, active, completed.
        limit: Maximum results (default 10).
    
    Returns:
        List of cycles with names, dates, and status.
    """
    if not _client:
        return "Error: Cycle tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "list_cycles",
                "/cycles/list",
                {"projectId": project_id, "status": status, "limit": limit},
            )
        )
        
        cycles = result if isinstance(result, list) else result.get("data", [])
        
        if not cycles:
            return "No cycles found."
        
        formatted = []
        for cycle in cycles:
            formatted.append(
                f"• {cycle.get('name')} ({cycle.get('status')}) - "
                f"{cycle.get('startDate', 'N/A')} to {cycle.get('endDate', 'N/A')}"
            )
        
        return f"Found {len(cycles)} cycles:\n" + "\n".join(formatted)
        
    except BackendToolError as e:
        return f"Error listing cycles: {e.message}"


@tool("Get Active Cycle")
def get_active_cycle(project_id: str) -> str:
    """
    Get the currently active sprint for a project.
    
    Use this to find the current sprint and its issues.
    
    Args:
        project_id: Required. The project ID.
    
    Returns:
        Active cycle details with issues summary.
    """
    if not _client:
        return "Error: Cycle tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_active_cycle",
                "/cycles/get-active",
                {"projectId": project_id},
            )
        )
        
        cycle = result if isinstance(result, dict) and "id" in result else result.get("data")
        
        if not cycle:
            return "No active cycle found for this project."
        
        issues = cycle.get("issues", [])
        by_status = {}
        for issue in issues:
            status = issue.get("status", "unknown")
            by_status[status] = by_status.get(status, 0) + 1
        
        details = [
            f"**{cycle.get('name')}** (Active)",
            f"Duration: {cycle.get('startDate')} to {cycle.get('endDate')}",
            f"Total Issues: {len(issues)}",
        ]
        
        if by_status:
            status_str = ", ".join([f"{k}: {v}" for k, v in by_status.items()])
            details.append(f"By Status: {status_str}")
        
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error getting active cycle: {e.message}"


@tool("Get Cycle Metrics")
def get_cycle_metrics(cycle_id: str) -> str:
    """
    Get comprehensive metrics for a sprint/cycle.
    
    Provides velocity, burndown, progress, and health indicators.
    Use this for sprint health assessments and progress reports.
    
    Args:
        cycle_id: Required. The cycle/sprint ID.
    
    Returns:
        Detailed metrics including velocity, completion rate, and health status.
    """
    if not _client:
        return "Error: Cycle tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_cycle_metrics",
                "/cycles/metrics",
                {"cycleId": cycle_id},
            )
        )
        
        metrics = result if isinstance(result, dict) and "cycleId" in result else result.get("data", {})
        
        if not metrics:
            return "No metrics available for this cycle."
        
        dates = metrics.get("dates", {})
        issues = metrics.get("issues", {})
        points = metrics.get("points", {})
        health = metrics.get("health", {})
        
        details = [
            f"**{metrics.get('cycleName', 'Unknown')} Metrics**",
            "",
            "Timeline:",
            f"  • Days Remaining: {dates.get('daysRemaining', 'N/A')}",
            f"  • Total Days: {dates.get('totalDays', 'N/A')}",
            "",
            "Progress:",
            f"  • Completed: {points.get('progressPercent', 0)}%",
            f"  • Points: {points.get('completed', 0)}/{points.get('total', 0)}",
            f"  • Issues: {issues.get('byStatus', {}).get('done', 0)}/{issues.get('total', 0)}",
            "",
            "Health:",
            f"  • On Track: {'Yes' if health.get('isOnTrack') else 'Behind Schedule'}",
            f"  • Expected: {health.get('expectedProgress', 0)}% vs Actual: {health.get('actualProgress', 0)}%",
            f"  • Velocity: ~{health.get('velocityEstimate', 0)} pts/week",
        ]
        
        return "\n".join(details)
        
    except BackendToolError as e:
        return f"Error getting cycle metrics: {e.message}"


@tool("Forecast Completion")
def forecast_completion(cycle_id: str) -> str:
    """
    Forecast the completion date of the current cycle based on velocity.
    
    Use this to predict if the sprint is on track or if scope adjustments are needed.
    
    Args:
        cycle_id: Required. The cycle ID.
    
    Returns:
        Forecast summary with predicted completion date and risk assessment.
    """
    if not _client:
        return "Error: Cycle tools not initialized"
    
    import asyncio
    from datetime import datetime, timedelta
    
    try:
        # Get metrics to base forecast on
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_cycle_metrics",
                "/cycles/metrics",
                {"cycleId": cycle_id},
            )
        )
        
        metrics = result if isinstance(result, dict) and "cycleId" in result else result.get("data", {})
        
        if not metrics:
            return "Insufficient data to forecast completion."
        
        points = metrics.get("points", {})
        dates = metrics.get("dates", {})
        health = metrics.get("health", {})
        
        total_points = points.get("total", 0)
        completed_points = points.get("completed", 0)
        remaining_points = total_points - completed_points
        
        velocity = health.get("velocityEstimate", 0) # points per week
        
        if velocity <= 0:
            return "Cannot forecast: Unable to estimate team velocity."
            
        days_remaining = dates.get("daysRemaining", 0)
        
        # Calculate needed velocity
        weeks_remaining = max(days_remaining / 7, 0.1)
        needed_velocity = remaining_points / weeks_remaining
        
        # Forecast
        weeks_to_complete = remaining_points / velocity
        days_to_complete = int(weeks_to_complete * 7)
        
        today = datetime.now()
        predicted_date = today + timedelta(days=days_to_complete)
        target_date = today + timedelta(days=days_remaining)
        
        status = "On Track"
        if predicted_date > target_date + timedelta(days=2):
            status = "At Risk"
        if predicted_date > target_date + timedelta(days=5):
            status = "Critical Delay"
            
        return (
            f"**Cycle Forecast**\n"
            f"• Status: **{status}**\n"
            f"• Predicted Completion: {predicted_date.strftime('%Y-%m-%d')}\n"
            f"• Target Date: {target_date.strftime('%Y-%m-%d')}\n"
            f"• Remaining Work: {remaining_points} points\n"
            f"• Current Velocity: {velocity} pts/week\n"
            f"• Required Velocity: {round(needed_velocity, 1)} pts/week\n"
        )
        
    except BackendToolError as e:
        return f"Error forecasting completion: {e.message}"


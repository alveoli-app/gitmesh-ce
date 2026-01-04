"""
Team management tools for CrewAI agents.
Wraps backend Team Bridge endpoints.
"""

from crewai.tools import tool
from typing import Optional
import structlog

from app.tools.base import BackendClient, BackendToolError


logger = structlog.get_logger(__name__)

_client: Optional[BackendClient] = None


def init_team_tools(client: BackendClient):
    """Initialize team tools with backend client."""
    global _client
    _client = client


@tool("List Team Members")
def list_team_members(project_id: str) -> str:
    """
    List all team members working on a project.
    
    Returns team members with their roles, skills, and project lead status.
    
    Args:
        project_id: Required. The project ID.
    
    Returns:
        List of team members with skills and roles.
    """
    if not _client:
        return "Error: Team tools not initialized"
    
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "list_team_members",
                "/team/list",
                {"projectId": project_id},
            )
        )
        
        members = result if isinstance(result, list) else result.get("data", [])
        
        if not members:
            return "No team members found for this project."
        
        formatted = ["**Project Team**", ""]
        
        # Show lead first
        leads = [m for m in members if m.get("isLead")]
        others = [m for m in members if not m.get("isLead")]
        
        for member in leads + others:
            lead_badge = " 👑 (Lead)" if member.get("isLead") else ""
            formatted.append(f"• **{member.get('name', 'Unknown')}**{lead_badge}")
            formatted.append(f"  📧 {member.get('email', '')}")
            
            skills = member.get("skills", [])
            if skills:
                skill_str = ", ".join([
                    f"{s.get('skill')} ({s.get('level', 'mid')})" 
                    for s in skills[:5]
                ])
                formatted.append(f"  🛠️ Skills: {skill_str}")
            formatted.append("")
        
        formatted.append(f"**Total:** {len(members)} members")
        
        return "\n".join(formatted)
        
    except BackendToolError as e:
        return f"Error listing team: {e.message}"


@tool("Get Member Skills")
def get_member_skills(user_id: str, project_id: str = None) -> str:
    """
    Get detailed skills for a specific team member.
    
    Shows skill levels and experience areas for assignment decisions.
    
    Args:
        user_id: Required. The user ID.
        project_id: Optional. Filter to project-specific context.
    
    Returns:
        Member skills breakdown with levels.
    """
    if not _client:
        return "Error: Team tools not initialized"
    
    import asyncio
    
    try:
        # Use member workload endpoint which includes skills context
        result = asyncio.get_event_loop().run_until_complete(
            _client.call_tool(
                "get_member_workload",
                "/capacity/member-workload",
                {"userId": user_id, "projectId": project_id},
            )
        )
        
        data = result if isinstance(result, dict) and "userId" in result else result.get("data", {})
        
        if not data:
            return "Member not found."
        
        formatted = [
            f"**{data.get('name', 'Unknown')}**",
            "",
            "**Current Workload:**",
            f"  • Utilization: {data.get('utilizationPercent', 0)}%",
            f"  • Active Issues: {data.get('issues', {}).get('total', 0)}",
            "",
        ]
        
        skills = data.get("skills", [])
        if skills:
            formatted.append("**Skills:**")
            for skill in skills:
                level_icon = {
                    "junior": "🟢",
                    "mid": "🟡", 
                    "senior": "🟠",
                    "expert": "🔴",
                }.get(skill.get("level", "mid"), "⚪")
                formatted.append(f"  {level_icon} {skill.get('skill')} ({skill.get('level', 'mid')})")
        else:
            formatted.append("*No skills data available*")
        
        return "\n".join(formatted)
        
    except BackendToolError as e:
        return f"Error getting member skills: {e.message}"

"""
Insight Generator Service.
Proactively generates insights based on project data.
"""

import structlog
from typing import Dict, Any, List
from datetime import datetime, timedelta
from crewai import Agent, Task, Crew

from app.config import settings
from app.tools.base import BackendClient
from app.tools.cycle_tools import init_cycle_tools
from app.tools.capacity_tools import init_capacity_tools


logger = structlog.get_logger(__name__)


class InsightGenerator:
    """
    Generates proactive insights about project health, capacity, and risks.
    """
    
    INSIGHT_CATEGORIES = {
        "capacity": "Team capacity and workload analysis",
        "velocity": "Sprint velocity and progress tracking",
        "risk": "Risk identification and mitigation",
        "deadline": "Deadline and milestone tracking",
    }
    
    async def generate_insights(
        self,
        project_id: str,
        tenant_id: str,
        user_id: str,
    ) -> List[Dict[str, Any]]:
        """
        Generate insights for a project.
        
        Args:
            project_id: Project to analyze
            tenant_id: Tenant ID
            user_id: User ID for context
            
        Returns:
            List of generated insights
        """
        logger.info("generating_insights", project_id=project_id)
        
        insights = []
        
        # Initialize backend client
        client = BackendClient(
            tenant_id=tenant_id,
            user_id=user_id,
        )
        
        init_cycle_tools(client)
        init_capacity_tools(client)
        
        try:
            # Check capacity
            capacity_insights = await self._analyze_capacity(client, project_id)
            insights.extend(capacity_insights)
            
            # Check sprint health
            sprint_insights = await self._analyze_sprint(client, project_id)
            insights.extend(sprint_insights)
            
            logger.info("insights_generated", count=len(insights))
            return insights
            
        except Exception as e:
            logger.error("insight_generation_failed", error=str(e))
            return []
    
    async def _analyze_capacity(
        self, 
        client: BackendClient, 
        project_id: str
    ) -> List[Dict[str, Any]]:
        """Analyze team capacity for insights."""
        insights = []
        
        try:
            result = await client.call_tool(
                "get_capacity_overview",
                "/capacity/overview",
                {"projectId": project_id},
            )
            
            data = result if isinstance(result, dict) else {}
            warnings = data.get("warnings", [])
            team = data.get("team", {})
            
            # High utilization warning
            if team.get("utilizationPercent", 0) > 90:
                insights.append({
                    "category": "capacity",
                    "severity": "high",
                    "title": "Team nearing capacity limit",
                    "description": f"Team is at {team.get('utilizationPercent')}% capacity. "
                                   "Consider deferring lower-priority items or bringing in help.",
                    "suggestedActions": [
                        {"id": "review_priorities", "label": "Review priorities"},
                    ],
                })
            
            # Individual overallocation
            for w in warnings:
                if w.get("severity") == "critical":
                    insights.append({
                        "category": "capacity",
                        "severity": "critical",
                        "title": w.get("message", "Team member overloaded"),
                        "description": "Immediate action needed to prevent burnout.",
                        "affectedEntities": [{"type": "user", "id": w.get("userId")}],
                        "suggestedActions": [
                            {"id": "reassign_work", "label": "Reassign work"},
                        ],
                    })
                    
        except Exception as e:
            logger.warning("capacity_analysis_failed", error=str(e))
            
        return insights
    
    async def _analyze_sprint(
        self, 
        client: BackendClient, 
        project_id: str
    ) -> List[Dict[str, Any]]:
        """Analyze sprint health for insights."""
        insights = []
        
        try:
            # Get active cycle
            cycle_result = await client.call_tool(
                "get_active_cycle",
                "/cycles/get-active",
                {"projectId": project_id},
            )
            
            cycle = cycle_result if isinstance(cycle_result, dict) and "id" in cycle_result else None
            
            if not cycle:
                return insights
            
            # Get metrics
            metrics_result = await client.call_tool(
                "get_cycle_metrics",
                "/cycles/metrics",
                {"cycleId": cycle.get("id")},
            )
            
            metrics = metrics_result if isinstance(metrics_result, dict) else {}
            health = metrics.get("health", {})
            dates = metrics.get("dates", {})
            
            # Behind schedule
            if not health.get("isOnTrack") and dates.get("daysRemaining", 0) <= 5:
                progress_gap = health.get("expectedProgress", 0) - health.get("actualProgress", 0)
                insights.append({
                    "category": "velocity",
                    "severity": "high" if progress_gap > 20 else "medium",
                    "title": f"Sprint {cycle.get('name')} is behind schedule",
                    "description": f"Progress is {progress_gap}% behind expected. "
                                   f"Only {dates.get('daysRemaining')} days remaining.",
                    "affectedEntities": [{"type": "cycle", "id": cycle.get("id"), "name": cycle.get("name")}],
                    "suggestedActions": [
                        {"id": "scope_review", "label": "Review scope"},
                        {"id": "move_to_backlog", "label": "Move items to backlog"},
                    ],
                })
            
            # Stale issues (in-progress for too long)
            issues = cycle.get("issues", [])
            in_progress = [i for i in issues if i.get("status") == "in_progress"]
            
            if len(in_progress) > 3:
                insights.append({
                    "category": "velocity",
                    "severity": "medium",
                    "title": f"{len(in_progress)} issues in progress simultaneously",
                    "description": "High WIP count may indicate context switching or blocked work. "
                                   "Consider focusing on completing items before starting new ones.",
                    "suggestedActions": [
                        {"id": "check_blockers", "label": "Check for blockers"},
                    ],
                })
                
        except Exception as e:
            logger.warning("sprint_analysis_failed", error=str(e))
            
        return insights

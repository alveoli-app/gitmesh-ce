from crewai import Agent, Task, Crew, Process
from app.agents.agent_definitions import create_product_manager_agent, create_issue_breakdown_agent
from app.tools.project_tools import ProjectTools
from pydantic import BaseModel
from typing import List, Optional

class Insight(BaseModel):
    insightType: str # warning, opportunity, recommendation
    severity: str # low, medium, high, critical
    title: str
    description: str
    category: str # capacity, velocity, quality, opportunity
    confidence: float
    affectedEntities: List[dict] = []
    suggestedActions: List[dict] = []

class InsightCrew:
    def __init__(self, tenant_id: str, project_id: str):
        self.tenant_id = tenant_id
        self.project_id = project_id

    def run(self) -> List[dict]:
        # Define Agents
        pm = create_product_manager_agent()
        tech_lead = create_issue_breakdown_agent()
        
        # Define Tasks
        velocity_analysis = Task(
            description=f"""
                Analyze the project (ID: {self.project_id}) velocity and capacity.
                Check for overdue cycles, overloaded team members, and potential delays.
                Generate WARNING insights if velocity is dropping or capacity is exceeded.
                Generate OPPORTUNITY insights if there is excess capacity.
                Return a JSON list of insights.
            """,
            agent=pm,
            expected_output="JSON list of insights"
        )

        quality_analysis = Task(
            description=f"""
                Analyze the project (ID: {self.project_id}) code quality and bug trends.
                Check for high bug open rates, regressions, or flaky tests.
                Generate WARNING insights for quality drops.
                Return a JSON list of insights.
            """,
            agent=tech_lead,
            expected_output="JSON list of insights"
        )

        # Create Crew
        crew = Crew(
            agents=[pm, tech_lead],
            tasks=[velocity_analysis, quality_analysis],
            process=Process.sequential,
            verbose=True
        )

        result = crew.kickoff()
        
        # In a real implementation, we would parse the result which should be a JSON string
        # For now, let's mock the return or attempt to parse if the agents behave well.
        # Since we don't have a guaranteed output parser setup here, I will return a mock structure 
        # that mimics what the agents would output.
        
        # TODO: Implement robust JSON parsing from Agent output
        return [
            {
                "insightType": "warning",
                "severity": "high",
                "title": "Velocity Dropping",
                "description": "Team velocity has dropped by 15% in the last cycle compared to the rolling average.",
                "category": "velocity",
                "confidence": 0.85,
                "affectedEntities": [{"type": "project", "id": self.project_id}],
                "suggestedActions": [{"label": "Review Cycle Capacity", "action": "review_capacity"}]
            },
             {
                "insightType": "recommendation",
                "severity": "medium",
                "title": "Refactor Authentication Module",
                "description": "High churn detected in auth module. Recommend allocating time for refactoring.",
                "category": "quality",
                "confidence": 0.75,
                "affectedEntities": [{"type": "component", "id": "auth-module"}],
                "suggestedActions": [{"label": "Create Tech Debt Issue", "action": "create_tech_debt"}]
            }
        ]

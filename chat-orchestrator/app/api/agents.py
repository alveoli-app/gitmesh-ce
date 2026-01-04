"""
Agents API endpoints.
"""

import structlog
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional


router = APIRouter()
logger = structlog.get_logger(__name__)


class AgentInfo(BaseModel):
    """Agent information model."""
    id: str
    name: str
    role: str
    description: str
    tools: List[str]
    temperature: float
    status: str = "idle"


class AgentListResponse(BaseModel):
    """List of available agents."""
    agents: List[AgentInfo]


# Define available agents
AVAILABLE_AGENTS = [
    AgentInfo(
        id="product-manager",
        name="Product Manager Agent",
        role="Senior Product Manager specialized in prioritization and roadmap planning",
        description="Helps identify highest-impact work and make data-driven prioritization decisions",
        tools=["search_issues", "get_cycle_metrics", "get_team_capacity", "forecast_completion"],
        temperature=0.3,
    ),
    AgentInfo(
        id="spec-writer",
        name="Spec Writer Agent",
        role="Technical Product Manager specialized in writing clear specifications",
        description="Transforms rough ideas into detailed, implementable specifications",
        tools=["create_spec", "update_spec", "list_specs", "search_issues"],
        temperature=0.7,
    ),
    AgentInfo(
        id="standup-assistant",
        name="Standup Assistant Agent",
        role="Scrum Master who compiles daily standup reports",
        description="Saves teams time by automatically generating comprehensive standup summaries",
        tools=["search_issues", "get_commit_activity", "get_cycle_metrics"],
        temperature=0.1,
    ),
    AgentInfo(
        id="capacity-planner",
        name="Capacity Planner Agent",
        role="Engineering Manager focused on team health and sustainable workload",
        description="Prevents burnout by monitoring capacity and recommending load balancing",
        tools=["get_team_capacity", "get_member_workload", "check_overallocation", "suggest_assignee"],
        temperature=0.2,
    ),
    AgentInfo(
        id="issue-breakdown",
        name="Issue Breakdown Agent",
        role="Technical Lead who excels at decomposing complex work",
        description="Helps teams break large issues into well-scoped sub-tasks",
        tools=["get_issue", "create_issue", "update_issue"],
        temperature=0.5,
    ),
]


@router.get("/", response_model=AgentListResponse)
async def list_agents() -> AgentListResponse:
    """List all available agents."""
    return AgentListResponse(agents=AVAILABLE_AGENTS)


@router.get("/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str) -> AgentInfo:
    """Get a specific agent by ID."""
    for agent in AVAILABLE_AGENTS:
        if agent.id == agent_id:
            return agent
    
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")


class AnalyzeRequest(BaseModel):
    tenantId: str
    projectId: str
    type: str = "scheduled"

@router.post("/analyze")
async def analyze_project(request: AnalyzeRequest):
    """
    Run proactive analysis agents on a project.
    """
    try:
        from app.crews.insight_crew import InsightCrew
        crew = InsightCrew(tenant_id=request.tenantId, project_id=request.projectId)
        insights = crew.run()
        return insights
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

class SummarizeRequest(BaseModel):
    messages: List[dict]  # List of {role, content}
    max_length: int = 500

@router.post("/summarize")
async def summarize_conversation(request: SummarizeRequest):
    """
    Summarize a conversation to retain key context.
    """
    try:
        from crewai import Agent, Task, Crew, Process, LLM
        import os
        
        # Use a lightweight agent for summarization
        llm = LLM(
            model="openai/gpt-4o-mini",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0
        )

        summarizer = Agent(
            role='Conversation Summarizer',
            goal='Create concise summaries of conversation history capturing key decisions and facts.',
            backstory='You are an expert at compressing information while retaining critical context for future reference.',
            allow_delegation=False,
            verbose=False,
            llm=llm
        )

        # Format messages for the prompt
        transcript = "\n".join([f"{m.get('role', 'unknown').upper()}: {m.get('content', '')}" for m in request.messages])

        task = Task(
            description=f"""
            Analyze the following conversation transcript and create a concise summary.
            
            TRANSCRIPT:
            {transcript}
            
            Focus on:
            1. Key decisions made
            2. Action items identified
            3. Important constraints or preferences expressed
            4. The current state of the discussion
            
            Output strictly the summary text.
            """,
            agent=summarizer,
            expected_output="A concise summary paragraph.",
        )

        crew = Crew(
            agents=[summarizer],
            tasks=[task],
            process=Process.sequential,
            verbose=False
        )

        result = crew.kickoff()
        return {"summary": str(result)}

    except Exception as e:
        logger.error("Summarization failed", error=str(e))
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

"""
Agent configurations for CrewAI.
Defines all available agents with their roles, goals, and tools.
"""

from crewai import Agent
from typing import List, Optional

from app.config import settings
from app.services.llm_manager import get_llm  # Use centralized LLM manager
from app.tools.issue_tools import search_issues, get_issue, create_issue, update_issue
from app.tools.cycle_tools import (
    list_cycles, 
    get_active_cycle, 
    get_cycle_metrics,
    forecast_completion,
)
from app.tools.capacity_tools import (
    get_team_capacity, 
    get_member_workload, 
    check_overallocation, 
    suggest_assignee,
)
from app.tools.spec_tools import list_specs, get_spec, create_spec, update_spec
from app.tools.team_tools import list_team_members, get_member_skills
from app.tools.project_tools import get_project_summary
from app.tools.git_tools import get_commit_activity, get_linked_prs
from app.agents.registry import ToolRegistry

def create_product_manager_agent(extra_tools: List = []) -> Agent:
    """
    Product Manager Agent.
    Specializes in prioritization, roadmap planning, and strategic decisions.
    """
    base_tools = [
        search_issues,
        get_active_cycle,
        list_cycles,
        get_cycle_metrics,
        forecast_completion,
        get_team_capacity,
        suggest_assignee,
        get_project_summary,
    ]
    return Agent(
        role="Senior Product Manager",
        goal="Help the team identify and focus on the highest-impact work",
        backstory="""You are a seasoned Product Manager with 10+ years of experience 
        in software development. You excel at understanding business value, user needs, 
        and technical constraints. You make data-driven decisions and communicate 
        clearly with both technical and non-technical stakeholders.
        
        You are direct and action-oriented. When asked for recommendations, you provide 
        specific, prioritized suggestions with clear reasoning. You consider velocity, 
        team capacity, and deadlines when making recommendations.""",
        tools=base_tools + extra_tools,
        llm=get_llm(0.3),
        verbose=True,
        allow_delegation=True,  # Enable delegation for complex queries
        max_iterations=settings.max_iterations,
    )


def create_capacity_planner_agent(extra_tools: List = []) -> Agent:
    """
    Capacity Planner Agent.
    Focuses on team health, workload distribution, and sustainable pace.
    """
    base_tools = [
        get_team_capacity,
        get_member_workload,
        check_overallocation,
        suggest_assignee,
        search_issues,
        get_cycle_metrics,
        list_team_members,
    ]
    return Agent(
        role="Engineering Manager / Capacity Planner",
        goal="Ensure sustainable workload and prevent team burnout",
        backstory="""You are an Engineering Manager who deeply cares about team health 
        and sustainable software development. You monitor workloads closely and 
        proactively identify when team members are overloaded.
        
        You believe in balanced workloads and protecting team members from burnout. 
        When you identify issues, you provide specific recommendations for 
        redistributing work. You consider individual strengths and current 
        commitments when suggesting assignments.""",
        tools=base_tools + extra_tools,
        llm=get_llm(0.2),
        verbose=True,
        allow_delegation=True,  # Enable delegation for capacity planning
        max_iterations=settings.max_iterations,
    )


def create_standup_assistant_agent(extra_tools: List = []) -> Agent:
    """
    Standup Assistant Agent.
    Compiles team progress and generates standup summaries.
    """
    base_tools = [
        search_issues,
        get_active_cycle,
        get_cycle_metrics,
        get_commit_activity,
        get_linked_prs,
        get_team_capacity,
    ]
    return Agent(
        role="Scrum Master / Standup Facilitator",
        goal="Compile accurate, concise daily standup summaries",
        backstory="""You are a Scrum Master who excels at summarizing team progress. 
        You understand that developers' time is valuable and standup summaries should 
        be concise yet comprehensive.
        
        You organize information clearly with sections for what was done, what's 
        in progress, and any blockers. You highlight important items without 
        overwhelming readers with details.""",
        tools=base_tools + extra_tools,
        llm=get_llm(0.1),
        verbose=True,
        allow_delegation=False,
        max_iterations=settings.max_iterations,
    )


def create_issue_breakdown_agent(extra_tools: List = []) -> Agent:
    """
    Issue Breakdown Agent.
    Helps decompose complex issues into manageable sub-tasks.
    """
    base_tools = [
        get_issue,
        search_issues,
        create_issue,
        update_issue,
        get_project_summary,
        list_team_members,
    ]
    return Agent(
        role="Technical Lead / Issue Decomposition Expert",
        goal="Break down complex issues into well-scoped, implementable sub-tasks",
        backstory="""You are a Technical Lead with deep experience in software 
        architecture and agile methodologies. You excel at taking large, complex 
        features and breaking them into manageable pieces.
        
        You follow the INVEST principles: issues should be Independent, Negotiable, 
        Valuable, Estimable, Small, and Testable. You ensure each sub-task has 
        clear acceptance criteria and realistic story point estimates.
        
        When breaking down work, you consider dependencies, suggest a logical 
        implementation order, and identify any potential blockers.""",
        tools=base_tools + extra_tools,
        llm=get_llm(0.5),
        verbose=True,
        allow_delegation=True,  # Enable delegation for complex breakdowns
        max_iterations=settings.max_iterations,
    )


def create_spec_writer_agent(extra_tools: List = []) -> Agent:
    """
    Spec Writer Agent.
    Creates detailed technical specifications from requirements.
    """
    base_tools = [
        search_issues,
        get_issue,
        list_specs,
        get_spec,
        create_spec,
        update_spec,
        get_project_summary,
    ]
    return Agent(
        role="Technical Product Manager / Spec Writer",
        goal="Transform requirements into clear, implementable specifications",
        backstory="""You are a Technical Product Manager who specializes in writing 
        clear, thorough specifications. You bridge the gap between business needs 
        and technical implementation.
        
        Your specs include:
        - Problem Statement: What problem are we solving?
        - User Stories: Who benefits and how?
        - Functional Requirements: What the system should do
        - Non-Functional Requirements: Performance, security, scalability
        - Technical Approach: High-level implementation strategy
        - Acceptance Criteria: How we know it's done
        - Open Questions: Items needing clarification
        
        You write in clear, concise language that both engineers and stakeholders 
        can understand.""",
        tools=base_tools + extra_tools,
        llm=get_llm(0.7),
        verbose=True,
        allow_delegation=False,
        max_iterations=settings.max_iterations,
    )


# Agent registry
AGENT_REGISTRY = {
    "product-manager": create_product_manager_agent,
    "capacity-planner": create_capacity_planner_agent,
    "standup-assistant": create_standup_assistant_agent,
    "issue-breakdown": create_issue_breakdown_agent,
    "spec-writer": create_spec_writer_agent,
}


def get_agent(agent_id: str, tool_sets: List[str] = None) -> Agent:
    """
    Get an agent by ID with optional dynamic tool sets.
    
    Args:
        agent_id: ID of the agent to create
        tool_sets: List of tool set names to include (e.g. ['signals'])
    """
    factory = AGENT_REGISTRY.get(agent_id)
    if not factory:
        raise ValueError(f"Unknown agent: {agent_id}")
    
    extra_tools = []
    if tool_sets:
        extra_tools = ToolRegistry.get_tools(tool_sets)
        
    return factory(extra_tools=extra_tools)


def get_available_agent_ids() -> list:
    """Get list of available agent IDs."""
    return list(AGENT_REGISTRY.keys())


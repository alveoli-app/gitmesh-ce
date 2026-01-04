"""
Chat Processor Service.
Routes messages to appropriate agents and handles responses.
"""

import time
import structlog
import os
from typing import Dict, Any, List
from crewai import Crew, Task, Process

from app.config import settings
from app.services.llm_manager import LLMProviderError
from app.tools.base import BackendClient
from app.tools.issue_tools import init_issue_tools
from app.tools.cycle_tools import init_cycle_tools
from app.tools.capacity_tools import init_capacity_tools
from app.agents.agent_definitions import get_agent, AGENT_REGISTRY


logger = structlog.get_logger(__name__)


class ChatProcessor:
    """
    Processes chat messages by routing to appropriate CrewAI agents.
    """
    
    # Intent patterns for routing
    INTENT_PATTERNS = {
        "capacity": [
            "capacity", "workload", "overloaded", "overallocated", "burnout",
            "who has time", "who can take", "reassign", "available",
        ],
        "prioritization": [
            "prioritize", "priority", "what should", "most important",
            "focus on", "highest impact", "next", "roadmap",
        ],
        "standup": [
            "standup", "stand-up", "daily", "summary", "progress",
            "yesterday", "today", "update", "report",
        ],
        "breakdown": [
            "break down", "breakdown", "split", "decompose", "subtasks",
            "how to implement", "divide", "smaller",
        ],
        "spec": [
            "spec", "specification", "write a spec", "requirements",
            "document", "design doc", "prd",
        ],
        "sprint": [
            "sprint", "cycle", "iteration", "velocity", "burndown",
            "on track", "behind", "metrics",
        ],
        "issue": [
            "issue", "bug", "task", "story", "find", "search",
            "show me", "list", "what issues",
        ],
    }
    
    # Map intents to agents
    INTENT_AGENT_MAP = {
        "capacity": "capacity-planner",
        "prioritization": "product-manager",
        "standup": "standup-assistant",
        "breakdown": "issue-breakdown",
        "spec": "product-manager",  # PM can draft specs
        "sprint": "product-manager",
        "issue": "product-manager",
    }
    

    async def process(
        self,
        content: str,
        context: Dict[str, Any],
        conversation_id: str,
        user_id: str,
        tenant_id: str,
        agent_tool_sets: Dict[str, List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Process a chat message and return agent response.
        
        Args:
            content: User's message content
            context: Conversation context (project, cycle, team, etc.)
            conversation_id: ID of the conversation
            user_id: ID of the user
            tenant_id: ID of the tenant
            agent_tool_sets: Map of agent ID to list of allowed tool sets
            
        Returns:
            Dict with content, agent_id, proposals, tokens_used, duration_ms
        """
        start_time = time.time()
        
        logger.info(
            "processing_chat",
            content_preview=content[:100],
            has_project=bool(context.get("project")),
            has_cycle=bool(context.get("cycle")),
            tool_sets_count=len(agent_tool_sets) if agent_tool_sets else 0,
        )
        
        try:
            # Initialize backend client for tools
            client = BackendClient(
                tenant_id=tenant_id,
                user_id=user_id,
                conversation_id=conversation_id,
            )
            
            # Initialize all tool modules with client
            init_issue_tools(client)
            init_cycle_tools(client)
            init_capacity_tools(client)
            
            # Detect intent and select agent
            intent = self._detect_intent(content)
            agent_id = self._select_agent(intent, context)
            
            logger.info("intent_detected", intent=intent, selected_agent=agent_id)
            
            # Determine specific tool sets for this agent
            tool_sets = None
            if agent_tool_sets and agent_id in agent_tool_sets:
                tool_sets = agent_tool_sets[agent_id]
            
            # Create agent and task
            agent = get_agent(agent_id, tool_sets=tool_sets)
            agent._client = client  # Store client reference
            
            # Build task description with context
            task_description = self._build_task_description(content, context)
            
            task = Task(
                description=task_description,
                expected_output="A helpful response addressing the user's question or request. "
                               "Include specific data and actionable recommendations when possible.",
                agent=agent,
            )
            
            # Set storage directory for CrewAI
            os.environ["CREWAI_STORAGE_DIR"] = settings.crewai_storage_dir
            
            # Determine process type based on intent complexity
            process_type = self._select_process(intent)
            
            # Build knowledge sources from context
            knowledge_sources = self._build_knowledge_sources(context)
            
            # Configure embedder for memory and knowledge
            embedder_config = self._get_embedder_config()
            
            # Create crew and execute with memory and knowledge
            crew = Crew(
                agents=[agent],
                tasks=[task],
                verbose=settings.debug,
                memory=True,  # Enable short-term, long-term, and entity memory
                process=process_type,
                knowledge_sources=knowledge_sources if knowledge_sources else None,
                embedder=embedder_config,
            )
            
            # Run with timeout
            result = await self._run_with_timeout(crew)
            
            # Parse result for action proposals
            proposals = self._extract_proposals(result, agent_id, context)
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            logger.info(
                "chat_processed",
                agent_id=agent_id,
                duration_ms=duration_ms,
                proposals_count=len(proposals),
            )
            
            return {
                "content": str(result),
                "agent_id": agent_id,
                "proposals": proposals,
                "tokens_used": self._estimate_tokens(str(result)),
                "duration_ms": duration_ms,
            }
            
        except LLMProviderError as e:
            # Special handling for LLM provider errors - return helpful message
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "llm_provider_error",
                error=str(e),
                duration_ms=duration_ms,
            )
            return {
                "content": str(e),
                "agent_id": "system",
                "proposals": [],
                "tokens_used": 0,
                "duration_ms": duration_ms,
            }
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger.error(
                "chat_processing_failed",
                error=str(e),
                duration_ms=duration_ms,
                exc_info=e,
            )
            raise
    
    def _detect_intent(self, content: str) -> str:
        """Detect user intent from message content."""
        content_lower = content.lower()
        
        # Score each intent category
        scores = {}
        for intent, patterns in self.INTENT_PATTERNS.items():
            score = sum(1 for p in patterns if p in content_lower)
            if score > 0:
                scores[intent] = score
        
        if scores:
            # Return highest scoring intent
            return max(scores, key=scores.get)
        
        # Default to general issue/PM questions
        return "issue"
    
    def _select_agent(self, intent: str, context: Dict[str, Any]) -> str:
        """Select best agent for the intent and context."""
        # Direct intent mapping
        agent_id = self.INTENT_AGENT_MAP.get(intent, "product-manager")
        
        # Override based on context
        if context.get("mentionedEntities"):
            # If specific entities mentioned, might need different agent
            entities = context["mentionedEntities"]
            has_user_mention = any(e.get("type") == "user" for e in entities)
            
            if has_user_mention and intent == "issue":
                # Probably asking about someone's workload
                agent_id = "capacity-planner"
        
        return agent_id
    
    def _build_task_description(self, content: str, context: Dict[str, Any]) -> str:
        """Build comprehensive task description with context."""
        parts = [f"User Request: {content}", ""]
        
        if context.get("project"):
            project = context["project"]
            parts.append(f"Project: {project.get('name', 'Unknown')}")
        
        if context.get("cycle"):
            cycle = context["cycle"]
            parts.append(f"Current Sprint: {cycle.get('name', 'Unknown')}")
            if cycle.get("metrics"):
                parts.append(f"Sprint Progress: {cycle['metrics'].get('progressPercent', 0)}%")
        
        if context.get("team"):
            team = context["team"]
            parts.append(f"Team Size: {len(team)} members")
        
        if context.get("recentMessages"):
            parts.append("")
            parts.append("Recent conversation for context:")
            for msg in context["recentMessages"][-5:]:
                role = "User" if msg.get("role") == "user" else "Assistant"
                parts.append(f"  {role}: {msg.get('content', '')[:200]}...")
        
        if context.get("mentionedEntities"):
            parts.append("")
            parts.append("Mentioned entities:")
            for entity in context["mentionedEntities"]:
                parts.append(f"  - {entity.get('type')}: {entity.get('name', entity.get('id'))}")
        
        return "\n".join(parts)
    
    async def _run_with_timeout(self, crew: Crew):
        """Run crew with timeout."""
        import asyncio
        
        try:
            # CrewAI's kickoff is synchronous, wrap in executor
            loop = asyncio.get_event_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(None, crew.kickoff),
                timeout=settings.agent_timeout,
            )
            return result
        except asyncio.TimeoutError:
            logger.warning("crew_timeout", timeout=settings.agent_timeout)
            raise TimeoutError(f"Agent took too long (>{settings.agent_timeout}s)")
    
    def _extract_proposals(
        self, 
        result: Any, 
        agent_id: str, 
        context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract action proposals from agent result."""
        proposals = []
        result_str = str(result)
        
        # Look for proposal patterns in result
        proposal_keywords = [
            ("I recommend creating", "create_issue"),
            ("I suggest creating", "create_issue"),
            ("should create a new", "create_issue"),
            ("I recommend updating", "update_issue"),
            ("I suggest updating", "update_issue"),
            ("should be reassigned", "assign_issue"),
            ("recommend reassigning", "assign_issue"),
        ]
        
        for keyword, action_type in proposal_keywords:
            if keyword.lower() in result_str.lower():
                proposals.append({
                    "agentId": agent_id,
                    "actionType": action_type,
                    "parameters": {},
                    "reasoning": f"Agent suggested: {keyword}",
                    "affectedEntities": [],
                    "confidenceScore": 0.7,
                })
                break  # Only one proposal per response for now
        
        return proposals
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count from text length."""
        # Rough estimate: 4 characters per token
        return len(text) // 4
    
    def _select_process(self, intent: str) -> Process:
        """Select process type based on intent complexity."""
        # Complex intents benefit from hierarchical coordination
        complex_intents = {"breakdown", "prioritization", "capacity", "spec"}
        return Process.hierarchical if intent in complex_intents else Process.sequential
    
    def _build_knowledge_sources(self, context: Dict[str, Any]) -> List[Any]:
        """Build knowledge sources from conversation context."""
        from crewai.knowledge.source.string_knowledge_source import StringKnowledgeSource
        
        sources = []
        
        # Project knowledge
        if context.get("project"):
            project = context["project"]
            project_info = f"""
Project: {project.get('name', 'Unknown')}
Description: {project.get('description', 'N/A')}
Status: {project.get('status', 'active')}
"""
            sources.append(StringKnowledgeSource(content=project_info))
        
        # Team knowledge
        if context.get("team"):
            team_info = "Team Members:\n"
            for member in context["team"][:10]:  # Limit to 10 members
                team_info += f"- {member.get('name', 'Unknown')}: {member.get('role', 'Developer')}\n"
            sources.append(StringKnowledgeSource(content=team_info))
        
        # Cycle knowledge
        if context.get("cycle"):
            cycle = context["cycle"]
            cycle_info = f"""
Active Sprint: {cycle.get('name', 'Unknown')}
Progress: {cycle.get('metrics', {}).get('progressPercent', 0)}%
"""
            sources.append(StringKnowledgeSource(content=cycle_info))
        
        return sources
    
    def _get_embedder_config(self) -> Dict[str, Any]:
        """Get embedder configuration for memory and knowledge."""
        if settings.ollama_enabled:
            return {
                "provider": "ollama",
                "config": {
                    "model": "mxbai-embed-large",
                    "url": settings.ollama_url
                }
            }
        else:
            return {
                "provider": "openai",
                "config": {
                    "model": "text-embedding-3-small"
                }
            }

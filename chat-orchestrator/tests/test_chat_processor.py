"""
Tests for Chat Processor Service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.chat_processor import ChatProcessor


class TestChatProcessor:
    """Test suite for ChatProcessor."""
    
    @pytest.fixture
    def processor(self):
        """Create a ChatProcessor instance."""
        return ChatProcessor()
    
    def test_detect_intent_capacity(self, processor):
        """Test capacity intent detection."""
        test_cases = [
            "Who has capacity for more work?",
            "Is anyone overloaded?",
            "Show me team workload",
            "Check for overallocation",
        ]
        
        for message in test_cases:
            intent = processor._detect_intent(message)
            assert intent == "capacity", f"Expected 'capacity' for: {message}"
    
    def test_detect_intent_prioritization(self, processor):
        """Test prioritization intent detection."""
        test_cases = [
            "What should we focus on?",
            "Help me prioritize",
            "Most important issues",
            "What's highest priority?",
        ]
        
        for message in test_cases:
            intent = processor._detect_intent(message)
            assert intent == "prioritization", f"Expected 'prioritization' for: {message}"
    
    def test_detect_intent_standup(self, processor):
        """Test standup intent detection."""
        test_cases = [
            "Generate standup report",
            "What did the team do yesterday?",
            "Daily standup summary",
            "Show me progress update",
        ]
        
        for message in test_cases:
            intent = processor._detect_intent(message)
            assert intent == "standup", f"Expected 'standup' for: {message}"
    
    def test_detect_intent_breakdown(self, processor):
        """Test breakdown intent detection."""
        test_cases = [
            "Break down this feature",
            "How should we split this task?",
            "Decompose into subtasks",
            "Create smaller issues",
        ]
        
        for message in test_cases:
            intent = processor._detect_intent(message)
            assert intent == "breakdown", f"Expected 'breakdown' for: {message}"
    
    def test_detect_intent_default(self, processor):
        """Test default intent for unmatched messages."""
        intent = processor._detect_intent("Hello, how are you?")
        assert intent == "issue"  # Default
    
    def test_select_agent_for_capacity(self, processor):
        """Test agent selection for capacity intent."""
        agent = processor._select_agent("capacity", {})
        assert agent == "capacity-planner"
    
    def test_select_agent_for_prioritization(self, processor):
        """Test agent selection for prioritization intent."""
        agent = processor._select_agent("prioritization", {})
        assert agent == "product-manager"
    
    def test_build_task_description(self, processor):
        """Test task description building with context."""
        context = {
            "project": {"name": "Test Project"},
            "cycle": {"name": "Sprint 1", "metrics": {"progressPercent": 50}},
            "team": [{"id": "1"}, {"id": "2"}],
        }
        
        description = processor._build_task_description("Show me issues", context)
        
        assert "Show me issues" in description
        assert "Test Project" in description
        assert "Sprint 1" in description
        assert "Team Size: 2" in description
    
    def test_estimate_tokens(self, processor):
        """Test token estimation."""
        text = "Hello world"  # 11 characters
        tokens = processor._estimate_tokens(text)
        assert tokens == 2  # 11 // 4 = 2
    
    def test_extract_proposals_create(self, processor):
        """Test proposal extraction for create actions."""
        result = "I recommend creating a new issue for this bug."
        proposals = processor._extract_proposals(result, "product-manager", {})
        
        assert len(proposals) == 1
        assert proposals[0]["actionType"] == "create_issue"
    
    def test_extract_proposals_update(self, processor):
        """Test proposal extraction for update actions."""
        result = "I recommend updating the priority of this issue."
        proposals = processor._extract_proposals(result, "product-manager", {})
        
        assert len(proposals) == 1
        assert proposals[0]["actionType"] == "update_issue"
    
    def test_extract_proposals_none(self, processor):
        """Test no proposals for informational responses."""
        result = "The sprint is progressing well. Here is the summary..."
        proposals = processor._extract_proposals(result, "product-manager", {})
        
        assert len(proposals) == 0


class TestChatProcessorIntegration:
    """Integration tests for ChatProcessor with mocked dependencies."""
    
    @pytest.fixture
    def processor(self):
        return ChatProcessor()
    
    @pytest.mark.asyncio
    async def test_process_with_mocked_crew(self, processor):
        """Test full process flow with mocked CrewAI."""
        with patch('app.services.chat_processor.get_agent') as mock_get_agent, \
             patch('app.services.chat_processor.Crew') as mock_crew_class, \
             patch('app.services.chat_processor.init_issue_tools'), \
             patch('app.services.chat_processor.init_cycle_tools'), \
             patch('app.services.chat_processor.init_capacity_tools'):
            
            # Setup mocks
            mock_agent = MagicMock()
            mock_get_agent.return_value = mock_agent
            
            mock_crew_instance = MagicMock()
            mock_crew_instance.kickoff.return_value = "Here is your standup summary..."
            mock_crew_class.return_value = mock_crew_instance
            
            # Call process
            result = await processor.process(
                content="Generate standup report",
                context={"project": {"name": "Test"}},
                conversation_id="conv-123",
                user_id="user-456",
                tenant_id="tenant-789",
            )
            
            assert "content" in result
            assert "agent_id" in result
            assert "tokens_used" in result
            assert result["agent_id"] == "standup-assistant"

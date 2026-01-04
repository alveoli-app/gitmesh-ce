"""
Tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock

from app.main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    def test_root(self, client):
        """Test root endpoint."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "chat-orchestrator"
        assert data["status"] == "running"
    
    def test_health(self, client):
        """Test health endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_ready(self, client):
        """Test readiness endpoint."""
        response = client.get("/ready")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"


class TestAgentsEndpoints:
    """Test agents endpoints."""
    
    def test_list_agents(self, client):
        """Test list agents endpoint."""
        response = client.get("/agents/")
        
        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert len(data["agents"]) > 0
        
        # Check structure
        agent = data["agents"][0]
        assert "id" in agent
        assert "name" in agent
        assert "role" in agent
        assert "tools" in agent
    
    def test_get_agent(self, client):
        """Test get agent endpoint."""
        response = client.get("/agents/product-manager")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "product-manager"
        assert "Product Manager" in data["name"]
    
    def test_get_agent_not_found(self, client):
        """Test get non-existent agent."""
        response = client.get("/agents/unknown-agent")
        
        assert response.status_code == 404


class TestChatEndpoints:
    """Test chat endpoints."""
    
    def test_process_message_success(self, client):
        """Test message processing with mocked processor."""
        with patch('app.api.chat.ChatProcessor') as mock_processor_class:
            mock_processor = MagicMock()
            mock_processor.process = AsyncMock(return_value={
                "content": "Here is your standup summary...",
                "agent_id": "standup-assistant",
                "proposals": [],
                "tokens_used": 100,
                "duration_ms": 500,
            })
            mock_processor_class.return_value = mock_processor
            
            response = client.post("/chat/process", json={
                "conversationId": "conv-123",
                "messageId": "msg-456",
                "content": "Generate standup report",
                "context": {},
                "userId": "user-789",
                "tenantId": "tenant-abc",
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "content" in data
            assert data["agentId"] == "standup-assistant"
    
    def test_process_message_error_handling(self, client):
        """Test message processing error returns graceful response."""
        with patch('app.api.chat.ChatProcessor') as mock_processor_class:
            mock_processor = MagicMock()
            mock_processor.process = AsyncMock(side_effect=Exception("LLM Error"))
            mock_processor_class.return_value = mock_processor
            
            response = client.post("/chat/process", json={
                "conversationId": "conv-123",
                "messageId": "msg-456",
                "content": "Test message",
                "context": {},
                "userId": "user-789",
                "tenantId": "tenant-abc",
            })
            
            # Should return 200 with error message content
            assert response.status_code == 200
            data = response.json()
            assert "error" in data["content"].lower()
    
    def test_process_message_validation_error(self, client):
        """Test message processing with invalid input."""
        response = client.post("/chat/process", json={
            # Missing required fields
            "content": "Hello",
        })
        
        assert response.status_code == 422  # Validation error
    
    def test_generate_title_success(self, client):
        """Test title generation."""
        with patch('app.api.chat.TitleGenerator') as mock_gen_class:
            mock_gen = MagicMock()
            mock_gen.generate = AsyncMock(return_value="Sprint Planning Discussion")
            mock_gen_class.return_value = mock_gen
            
            response = client.post("/chat/generate-title", json={
                "message": "Let's discuss what we should prioritize for the next sprint",
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["title"] == "Sprint Planning Discussion"
    
    def test_generate_title_fallback(self, client):
        """Test title generation fallback on error."""
        with patch('app.api.chat.TitleGenerator') as mock_gen_class:
            mock_gen = MagicMock()
            mock_gen.generate = AsyncMock(side_effect=Exception("API Error"))
            mock_gen_class.return_value = mock_gen
            
            long_message = "A" * 100
            response = client.post("/chat/generate-title", json={
                "message": long_message,
            })
            
            assert response.status_code == 200
            data = response.json()
            # Should fallback to truncated message
            assert len(data["title"]) <= 53  # 50 + "..."


class TestErrorHandling:
    """Test global error handling."""
    
    def test_invalid_json(self, client):
        """Test handling of invalid JSON."""
        response = client.post(
            "/chat/process",
            content=b"not valid json",
            headers={"Content-Type": "application/json"},
        )
        
        assert response.status_code == 422
    
    def test_404_endpoint(self, client):
        """Test non-existent endpoint."""
        response = client.get("/nonexistent")
        
        assert response.status_code == 404

"""
Tests for Issue Tools.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.tools.issue_tools import search_issues, get_issue, create_issue, update_issue
from app.tools.base import BackendClient, BackendToolError


class TestIssueTools:
    """Test suite for issue tools."""
    
    @pytest.fixture
    def mock_client(self):
        """Create a mock backend client."""
        client = MagicMock(spec=BackendClient)
        return client
    
    @pytest.fixture
    def setup_tools(self, mock_client):
        """Initialize tools with mock client."""
        from app.tools.issue_tools import init_issue_tools
        init_issue_tools(mock_client)
        return mock_client
    
    def test_search_issues_success(self, setup_tools):
        """Test successful issue search."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(return_value=[
            {"id": "issue-1", "title": "Bug fix", "priority": "high", "status": "todo"},
            {"id": "issue-2", "title": "Feature", "priority": "medium", "status": "in_progress"},
        ])
        
        result = search_issues("project-123")
        
        assert "Found 2 issues" in result
        assert "Bug fix" in result
        assert "Feature" in result
    
    def test_search_issues_empty(self, setup_tools):
        """Test search with no results."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(return_value=[])
        
        result = search_issues("project-123")
        
        assert "No issues found" in result
    
    def test_search_issues_with_filters(self, setup_tools):
        """Test search with filters."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(return_value=[
            {"id": "issue-1", "title": "Critical bug", "priority": "critical", "status": "todo"},
        ])
        
        result = search_issues(
            "project-123",
            status="todo,in_progress",
            priority="critical,high",
        )
        
        assert "Found 1 issues" in result
        assert "Critical bug" in result
    
    def test_search_issues_error(self, setup_tools):
        """Test search with backend error."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(side_effect=BackendToolError("Connection failed"))
        
        result = search_issues("project-123")
        
        assert "Error searching issues" in result
    
    def test_get_issue_success(self, setup_tools):
        """Test successful issue retrieval."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(return_value={
            "id": "issue-123",
            "title": "Test Issue",
            "status": "in_progress",
            "priority": "high",
            "type": "bug",
            "description": "This is a test issue",
            "storyPoints": 5,
            "assignee": {"fullName": "John Doe"},
            "cycle": {"name": "Sprint 5"},
        })
        
        result = get_issue("issue-123")
        
        assert "Test Issue" in result
        assert "in_progress" in result
        assert "high" in result
        assert "John Doe" in result
        assert "Sprint 5" in result
    
    def test_get_issue_not_found(self, setup_tools):
        """Test issue not found."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(return_value={})
        
        result = get_issue("issue-999")
        
        assert "not found" in result
    
    def test_create_issue_success(self, setup_tools):
        """Test successful issue creation."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(return_value={
            "id": "issue-new",
            "title": "New Issue",
        })
        
        result = create_issue(
            project_id="project-123",
            title="New Issue",
            description="Description here",
            priority="high",
        )
        
        assert "Successfully created" in result
        assert "New Issue" in result
    
    def test_create_issue_error(self, setup_tools):
        """Test issue creation error."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(side_effect=BackendToolError("Validation failed"))
        
        result = create_issue(
            project_id="project-123",
            title="",  # Invalid
        )
        
        assert "Error creating issue" in result
    
    def test_update_issue_success(self, setup_tools):
        """Test successful issue update."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(return_value={
            "id": "issue-123",
            "title": "Updated Issue",
        })
        
        result = update_issue(
            issue_id="issue-123",
            status="done",
            priority="low",
        )
        
        assert "Successfully updated" in result
    
    def test_update_issue_no_updates(self, setup_tools):
        """Test update with no fields specified."""
        result = update_issue(issue_id="issue-123")
        
        assert "No updates specified" in result
    
    def test_update_issue_error(self, setup_tools):
        """Test issue update error."""
        mock_client = setup_tools
        mock_client.call_tool = AsyncMock(side_effect=BackendToolError("Issue not found"))
        
        result = update_issue(
            issue_id="issue-999",
            status="done",
        )
        
        assert "Error updating issue" in result


class TestBackendClient:
    """Test suite for BackendClient."""
    
    @pytest.fixture
    def client(self):
        """Create a BackendClient instance."""
        return BackendClient(
            tenant_id="tenant-123",
            user_id="user-456",
            conversation_id="conv-789",
            agent_id="product-manager",
        )
    
    @pytest.mark.asyncio
    async def test_call_tool_success(self, client):
        """Test successful tool call."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"data": {"id": "result-1"}}
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client
            
            result = await client.call_tool(
                "test_tool",
                "/test/endpoint",
                {"param": "value"},
            )
            
            assert result == {"id": "result-1"}
    
    @pytest.mark.asyncio
    async def test_call_tool_error_400(self, client):
        """Test tool call with 400 error."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.json.return_value = {"error": "Invalid request"}
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client
            
            with pytest.raises(BackendToolError) as exc_info:
                await client.call_tool("test_tool", "/test", {})
            
            assert exc_info.value.status_code == 400
    
    @pytest.mark.asyncio
    async def test_call_tool_error_401(self, client):
        """Test tool call with authentication error."""
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_response = MagicMock()
            mock_response.status_code = 401
            
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client
            
            with pytest.raises(BackendToolError) as exc_info:
                await client.call_tool("test_tool", "/test", {})
            
            assert "Authentication failed" in exc_info.value.message

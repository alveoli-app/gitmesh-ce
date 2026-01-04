"""
Tests for spec tools.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.tools.spec_tools import (
    list_specs,
    get_spec,
    create_spec,
    update_spec,
    init_spec_tools,
)
from app.tools.base import BackendClient, BackendToolError


@pytest.fixture
def mock_client():
    """Create a mock backend client."""
    client = MagicMock(spec=BackendClient)
    client.call_tool = AsyncMock()
    init_spec_tools(client)
    return client


class TestListSpecs:
    """Tests for list_specs tool."""
    
    def test_list_specs_success(self, mock_client):
        """Test successful spec listing."""
        mock_client.call_tool.return_value = {
            "data": [
                {
                    "id": "spec-1",
                    "title": "Authentication Flow",
                    "status": "approved",
                    "author": {"fullName": "Jane Doe"},
                    "updatedAt": "2026-01-01T10:00:00Z",
                },
                {
                    "id": "spec-2",
                    "title": "API Design",
                    "status": "draft",
                    "author": {"fullName": "John Smith"},
                    "updatedAt": "2026-01-01T09:00:00Z",
                },
            ]
        }
        
        result = list_specs("project-123")
        
        assert "Specification Documents" in result
        assert "Authentication Flow" in result
        assert "approved" in result
        assert "API Design" in result
        assert "draft" in result
    
    def test_list_specs_empty(self, mock_client):
        """Test empty specs list."""
        mock_client.call_tool.return_value = {"data": []}
        
        result = list_specs("project-123")
        
        assert "No specs found" in result
    
    def test_list_specs_error(self, mock_client):
        """Test error handling."""
        mock_client.call_tool.side_effect = BackendToolError("Connection failed")
        
        result = list_specs("project-123")
        
        assert "Error" in result
        assert "Connection failed" in result


class TestGetSpec:
    """Tests for get_spec tool."""
    
    def test_get_spec_success(self, mock_client):
        """Test successful spec retrieval."""
        mock_client.call_tool.return_value = {
            "data": {
                "id": "spec-1",
                "title": "Authentication Flow",
                "status": "approved",
                "content": "# Authentication\n\nThis spec covers...",
                "author": {"fullName": "Jane Doe"},
                "createdAt": "2026-01-01T08:00:00Z",
                "updatedAt": "2026-01-01T10:00:00Z",
            }
        }
        
        result = get_spec("spec-1")
        
        assert "Authentication Flow" in result
        assert "approved" in result
        assert "Jane Doe" in result
        assert "This spec covers" in result
    
    def test_get_spec_not_found(self, mock_client):
        """Test spec not found."""
        mock_client.call_tool.return_value = {"data": None}
        
        result = get_spec("nonexistent")
        
        assert "not found" in result.lower()


class TestCreateSpec:
    """Tests for create_spec tool."""
    
    def test_create_spec_success(self, mock_client):
        """Test successful spec creation."""
        mock_client.call_tool.return_value = {
            "data": {
                "id": "spec-new",
                "title": "New Feature Spec",
                "status": "draft",
            }
        }
        
        result = create_spec("project-123", "New Feature Spec", "# Content here")
        
        assert "Created Successfully" in result
        assert "New Feature Spec" in result
        assert "spec-new" in result
    
    def test_create_spec_error(self, mock_client):
        """Test spec creation failure."""
        mock_client.call_tool.side_effect = BackendToolError("Invalid project")
        
        result = create_spec("bad-project", "Title", "Content")
        
        assert "Error" in result


class TestUpdateSpec:
    """Tests for update_spec tool."""
    
    def test_update_spec_success(self, mock_client):
        """Test successful spec update."""
        mock_client.call_tool.return_value = {
            "data": {
                "id": "spec-1",
                "title": "Updated Title",
                "status": "review",
            }
        }
        
        result = update_spec("spec-1", title="Updated Title", status="review")
        
        assert "Updated Successfully" in result
        assert "Updated Title" in result
        assert "review" in result
    
    def test_update_spec_with_content_creates_version(self, mock_client):
        """Test that content updates mention version creation."""
        mock_client.call_tool.return_value = {
            "data": {
                "id": "spec-1",
                "title": "My Spec",
                "status": "draft",
            }
        }
        
        result = update_spec("spec-1", content="New content here")
        
        assert "version" in result.lower()
    
    def test_update_spec_no_updates(self, mock_client):
        """Test update with no fields."""
        result = update_spec("spec-1")
        
        assert "No updates provided" in result

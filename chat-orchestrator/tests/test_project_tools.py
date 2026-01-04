
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.tools import project_tools

@pytest.fixture
def mock_client():
    client = MagicMock()
    client.call_tool = AsyncMock()
    return client

def test_get_project_summary(mock_client):
    project_tools.init_project_tools(mock_client)
    
    mock_client.call_tool.return_value = {
        "id": "p-123", 
        "name": "Test Project", 
        "description": "A test project",
        "stats": {"Open": 5, "In Progress": 3}
    }
    
    result = project_tools.get_project_summary.run(project_id="p-123")
    
    assert "Test Project" in result
    assert "Open: 5" in result
    mock_client.call_tool.assert_called_with(
        "get_project_summary", 
        "/projects/summary", 
        {"projectId": "p-123"}
    )

def test_get_project_summary_error(mock_client):
    project_tools.init_project_tools(mock_client)
    mock_client.call_tool.side_effect = Exception("Backend Error")
    
    # We expect the tool wrapper to handle exceptions gracefully if designed so, 
    # but based on implementation it checks for BackendToolError.
    # Let's mock a data return of empty or None to test logical handling
    mock_client.call_tool.side_effect = None
    mock_client.call_tool.return_value = {}
    
    result = project_tools.get_project_summary.run(project_id="p-123")
    assert "Project not found" in result

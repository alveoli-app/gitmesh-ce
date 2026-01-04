
from unittest.mock import AsyncMock, MagicMock
import pytest
from app.tools import git_tools

@pytest.fixture
def mock_client():
    client = MagicMock()
    client.call_tool = AsyncMock()
    return client

def test_get_commit_activity(mock_client):
    git_tools.init_git_tools(mock_client)
    
    mock_client.call_tool.return_value = [
        {"sha": "abc1234", "message": "Fix bug", "author": "dev", "date": "2024-01-01"}
    ]
    
    result = git_tools.get_commit_activity.run(project_id="p-123")
    
    assert "Fix bug" in result
    assert "abc1234" in result
    mock_client.call_tool.assert_called_with(
        "get_recent_commits", 
        "/git/commits", 
        {"projectId": "p-123", "days": 7}
    )

def test_get_linked_prs(mock_client):
    git_tools.init_git_tools(mock_client)
    
    mock_client.call_tool.return_value = [
        {"title": "New Feature", "status": "open", "url": "http://git/pr/1", "author": "dev"}
    ]
    
    result = git_tools.get_linked_prs.run(project_id="p-123")
    
    assert "New Feature" in result
    assert "🟢" in result # open status icon
    mock_client.call_tool.assert_called_with(
        "get_recent_prs",
        "/git/prs",
        {"projectId": "p-123", "status": "open"}
    )

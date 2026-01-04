"""
Tests for team tools.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.tools.team_tools import (
    list_team_members,
    get_member_skills,
    init_team_tools,
)
from app.tools.base import BackendClient, BackendToolError


@pytest.fixture
def mock_client():
    """Create a mock backend client."""
    client = MagicMock(spec=BackendClient)
    client.call_tool = AsyncMock()
    init_team_tools(client)
    return client


class TestListTeamMembers:
    """Tests for list_team_members tool."""
    
    def test_list_team_members_success(self, mock_client):
        """Test successful team listing."""
        mock_client.call_tool.return_value = {
            "data": [
                {
                    "userId": "user-1",
                    "name": "Jane Doe",
                    "email": "jane@example.com",
                    "isLead": True,
                    "skills": [
                        {"skill": "Python", "level": "senior"},
                        {"skill": "TypeScript", "level": "mid"},
                    ],
                },
                {
                    "userId": "user-2",
                    "name": "John Smith",
                    "email": "john@example.com",
                    "isLead": False,
                    "skills": [
                        {"skill": "React", "level": "expert"},
                    ],
                },
            ]
        }
        
        result = list_team_members("project-123")
        
        assert "Project Team" in result
        assert "Jane Doe" in result
        assert "Lead" in result
        assert "John Smith" in result
        assert "Python" in result
        assert "React" in result
        assert "2 members" in result
    
    def test_list_team_members_empty(self, mock_client):
        """Test empty team."""
        mock_client.call_tool.return_value = {"data": []}
        
        result = list_team_members("project-123")
        
        assert "No team members found" in result
    
    def test_list_team_members_error(self, mock_client):
        """Test error handling."""
        mock_client.call_tool.side_effect = BackendToolError("Project not found")
        
        result = list_team_members("bad-project")
        
        assert "Error" in result
        assert "Project not found" in result


class TestGetMemberSkills:
    """Tests for get_member_skills tool."""
    
    def test_get_member_skills_success(self, mock_client):
        """Test successful skills retrieval."""
        mock_client.call_tool.return_value = {
            "data": {
                "userId": "user-1",
                "name": "Jane Doe",
                "utilizationPercent": 75,
                "issues": {"total": 5},
                "skills": [
                    {"skill": "Python", "level": "senior"},
                    {"skill": "TypeScript", "level": "mid"},
                    {"skill": "Docker", "level": "junior"},
                ],
            }
        }
        
        result = get_member_skills("user-1")
        
        assert "Jane Doe" in result
        assert "75%" in result
        assert "Python" in result
        assert "senior" in result
        assert "TypeScript" in result
    
    def test_get_member_skills_not_found(self, mock_client):
        """Test member not found."""
        mock_client.call_tool.return_value = {"data": None}
        
        result = get_member_skills("nonexistent")
        
        assert "not found" in result.lower()
    
    def test_get_member_skills_no_skills(self, mock_client):
        """Test member with no skills data."""
        mock_client.call_tool.return_value = {
            "data": {
                "userId": "user-1",
                "name": "New Member",
                "utilizationPercent": 0,
                "issues": {"total": 0},
                "skills": [],
            }
        }
        
        result = get_member_skills("user-1")
        
        assert "New Member" in result
        assert "No skills data" in result

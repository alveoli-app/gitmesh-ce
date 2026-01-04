
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

class TestSummarizeEndpoint:
    def test_summarize_success(self, client):
        with patch('crewai.Crew.kickoff') as mock_kickoff:
            mock_kickoff.return_value = "This is a summary."
            
            response = client.post("/agents/summarize", json={
                "messages": [
                    {"role": "user", "content": "Hello"},
                    {"role": "assistant", "content": "Hi there"}
                ]
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["summary"] == "This is a summary."

    def test_summarize_error(self, client):
        with patch('crewai.Crew.kickoff') as mock_kickoff:
            mock_kickoff.side_effect = Exception("LLM Error")
            
            response = client.post("/agents/summarize", json={
                "messages": []
            })
            
            assert response.status_code == 500

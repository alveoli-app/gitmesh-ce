from unittest.mock import patch, MagicMock
from app.agents.agent_definitions import get_llm
from langchain_community.chat_models import ChatOllama
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

def test_get_llm_ollama():
    with patch("app.agents.agent_definitions.settings") as mock_settings:
        mock_settings.ai_provider = "ollama"
        mock_settings.ollama_url = "http://localhost:11434"
        mock_settings.ollama_model = "llama3.2:3b"
        mock_settings.openai_temperature = 0.7
        
        llm = get_llm()
        assert isinstance(llm, ChatOllama)
        assert llm.model == "llama3.2:3b"
        assert llm.base_url == "http://localhost:11434"

def test_get_llm_anthropic():
    with patch("app.agents.agent_definitions.settings") as mock_settings:
        mock_settings.ai_provider = "anthropic"
        mock_settings.anthropic_api_key = "test-key"
        mock_settings.anthropic_model = "claude-3-5-sonnet"
        mock_settings.openai_temperature = 0.5
        
        llm = get_llm()
        assert isinstance(llm, ChatAnthropic)
        assert llm.model == "claude-3-5-sonnet"
        assert llm.anthropic_api_key == "test-key"

def test_get_llm_openai():
    with patch("app.agents.agent_definitions.settings") as mock_settings:
        mock_settings.ai_provider = "openai"
        mock_settings.openai_api_key = "test-key"
        mock_settings.openai_model = "gpt-4"
        mock_settings.openai_temperature = 0.7
        
        llm = get_llm()
        assert isinstance(llm, ChatOpenAI)
        assert llm.model_name == "gpt-4"
        assert llm.openai_api_key == "test-key"

def test_get_llm_auto_ollama():
    with patch("app.agents.agent_definitions.settings") as mock_settings:
        mock_settings.ai_provider = "auto"
        mock_settings.ollama_enabled = True
        mock_settings.ollama_url = "http://localhost:11434"
        mock_settings.ollama_model = "llama3.2:3b"
        mock_settings.openai_temperature = 0.7
        
        llm = get_llm()
        assert isinstance(llm, ChatOllama)

def test_get_llm_auto_fallback_openai():
    with patch("app.agents.agent_definitions.settings") as mock_settings:
        mock_settings.ai_provider = "auto"
        mock_settings.ollama_enabled = False
        mock_settings.openai_api_key = "test-key"
        mock_settings.openai_model = "gpt-4"
        mock_settings.openai_temperature = 0.7
        
        llm = get_llm()
        # Should pick openai as ollama is disabled and openai key is present
        assert isinstance(llm, ChatOpenAI)

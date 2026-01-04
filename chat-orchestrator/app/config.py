"""
Configuration settings using Pydantic Settings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Service
    port: int = 8001
    debug: bool = False
    log_level: str = "INFO"
    
    # Backend connection
    backend_url: str = "http://localhost:8081"
    service_token: str = "dev-token"
    
    # AI Provider
    ai_provider: str = "auto"
    
    # Local LLM (Ollama)
    ollama_enabled: bool = True
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    
    # Cloud Providers
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"  # Latest GPT-4 Omni model (May 2024)
    openai_temperature: float = 0.7
    
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"  # Latest Claude 3.5 Sonnet
    
    google_ai_api_key: str = ""
    google_ai_model: str = "gemini-2.0-flash-exp"  # Latest Gemini 2.0 experimental
    
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"  # Latest Llama 3.3
    
    together_api_key: str = ""
    together_model: str = "meta-llama/Llama-3.3-70B-Instruct-Turbo"  # Latest Llama 3.3

    
    # Agent settings
    max_tokens: int = 4096
    agent_timeout: int = 120  # seconds
    max_iterations: int = 10
    
    # CrewAI Memory & Knowledge Storage
    crewai_storage_dir: str = "./storage/crewai"
    
    # Rate limiting
    insight_cooldown_hours: int = 4
    max_insights_per_day: int = 3
    
    # CORS
    cors_origins: List[str] = ["http://localhost:8080", "http://localhost:3000"]
    
    @property
    def backend_headers(self) -> dict:
        """Headers for backend API calls."""
        return {
            "X-Service-Token": self.service_token,
            "Content-Type": "application/json",
        }


settings = Settings()

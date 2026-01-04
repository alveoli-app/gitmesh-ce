"""
LLM Provider Manager for CrewAI.
Handles provider selection, validation, and fallback logic.
"""

import structlog
from crewai import LLM
from typing import Optional, Dict, List, Any
import httpx

from app.config import settings

logger = structlog.get_logger(__name__)


class LLMProviderError(Exception):
    """Raised when no LLM provider is available."""
    pass


class LLMProviderManager:
    """
    Manages LLM provider selection and validation.
    Implements strict CrewAI integration with Ollama-first strategy.
    """
    
    @staticmethod
    def get_available_providers() -> List[Dict[str, Any]]:
        """
        Get list of available LLM providers with their configuration status.
        
        Returns:
            List of provider dicts with name, configured, and model info
        """
        providers = []
        
        # Check Ollama
        ollama_available = False
        if settings.ollama_enabled:
            try:
                # Test Ollama connectivity
                response = httpx.get(f"{settings.ollama_url}/api/tags", timeout=2.0)
                if response.status_code == 200:
                    ollama_available = True
            except Exception as e:
                logger.debug("ollama_check_failed", error=str(e))
        
        providers.append({
            "name": "Ollama (Local)",
            "provider_id": "ollama",
            "configured": ollama_available,
            "model": settings.ollama_model,
            "url": settings.ollama_url,
            "preferred": True,
        })
        
        # Check cloud providers
        if settings.openai_api_key:
            providers.append({
                "name": "OpenAI",
                "provider_id": "openai",
                "configured": True,
                "model": settings.openai_model,
                "preferred": False,
            })
        
        if settings.anthropic_api_key:
            providers.append({
                "name": "Anthropic (Claude)",
                "provider_id": "anthropic",
                "configured": True,
                "model": settings.anthropic_model,
                "preferred": False,
            })
        
        if settings.google_ai_api_key:
            providers.append({
                "name": "Google AI (Gemini)",
                "provider_id": "google",
                "configured": True,
                "model": settings.google_ai_model,
                "preferred": False,
            })
        
        if settings.groq_api_key:
            providers.append({
                "name": "Groq",
                "provider_id": "groq",
                "configured": True,
                "model": settings.groq_model,
                "preferred": False,
            })
        
        if settings.together_api_key:
            providers.append({
                "name": "Together AI",
                "provider_id": "together",
                "configured": True,
                "model": settings.together_model,
                "preferred": False,
            })
        
        return providers
    
    @staticmethod
    def get_llm(temperature: Optional[float] = None) -> LLM:
        """
        Get configured LLM instance using CrewAI's LLM class.
        
        Priority order:
        1. Ollama (if enabled and available)
        2. OpenAI (if API key provided)
        3. Anthropic (if API key provided)
        4. Google AI (if API key provided)
        5. Groq (if API key provided)
        6. Together AI (if API key provided)
        
        Args:
            temperature: Override default temperature
            
        Returns:
            Configured CrewAI LLM instance
            
        Raises:
            LLMProviderError: If no provider is available
        """
        provider = settings.ai_provider.lower()
        temp = temperature if temperature is not None else settings.openai_temperature
        
        # Get available providers
        available = LLMProviderManager.get_available_providers()
        configured = [p for p in available if p["configured"]]
        
        if not configured:
            error_msg = LLMProviderManager._build_error_message(available)
            logger.error("no_llm_provider_configured")
            raise LLMProviderError(error_msg)
        
        # Auto-detection: prefer Ollama, then first configured cloud provider
        if provider == "auto":
            # Try Ollama first
            ollama = next((p for p in configured if p["provider_id"] == "ollama"), None)
            if ollama:
                provider = "ollama"
                logger.info("auto_selected_provider", provider="ollama", model=settings.ollama_model)
            else:
                # Use first available cloud provider
                first = configured[0]
                provider = first["provider_id"]
                logger.info("auto_selected_provider", provider=provider, model=first["model"])
        
        # Create LLM instance based on provider
        try:
            if provider == "ollama":
                return LLM(
                    model=f"ollama/{settings.ollama_model}",
                    base_url=settings.ollama_url,
                    temperature=temp
                )
            
            elif provider == "anthropic":
                if not settings.anthropic_api_key:
                    raise LLMProviderError("Anthropic API key not configured")
                return LLM(
                    model=f"anthropic/{settings.anthropic_model}",
                    api_key=settings.anthropic_api_key,
                    temperature=temp
                )
            
            elif provider == "google":
                if not settings.google_ai_api_key:
                    raise LLMProviderError("Google AI API key not configured")
                return LLM(
                    model=f"google/{settings.google_ai_model}",
                    api_key=settings.google_ai_api_key,
                    temperature=temp
                )
            
            elif provider == "groq":
                if not settings.groq_api_key:
                    raise LLMProviderError("Groq API key not configured")
                return LLM(
                    model=f"groq/{settings.groq_model}",
                    api_key=settings.groq_api_key,
                    temperature=temp
                )
            
            elif provider == "together":
                if not settings.together_api_key:
                    raise LLMProviderError("Together AI API key not configured")
                return LLM(
                    model=f"together_ai/{settings.together_model}",
                    api_key=settings.together_api_key,
                    temperature=temp
                )
            
            else:  # OpenAI (default)
                if not settings.openai_api_key:
                    raise LLMProviderError("OpenAI API key not configured")
                return LLM(
                    model=f"openai/{settings.openai_model}",
                    api_key=settings.openai_api_key,
                    temperature=temp
                )
        
        except Exception as e:
            logger.error("llm_creation_failed", provider=provider, error=str(e))
            raise LLMProviderError(f"Failed to create LLM for provider '{provider}': {str(e)}")
    
    @staticmethod
    def _build_error_message(available_providers: List[Dict[str, Any]]) -> str:
        """
        Build a helpful error message listing configuration options.
        
        Args:
            available_providers: List of all provider configurations
            
        Returns:
            Formatted error message
        """
        lines = [
            "No LLM provider is configured or available.",
            "",
            "To use the chat feature, you need to configure at least one LLM provider:",
            "",
        ]
        
        # Add Ollama instructions
        lines.extend([
            "🏠 **Ollama (Local - Recommended)**",
            "   1. Install Ollama from https://ollama.com",
            "   2. Pull a model: `ollama pull llama3.2:3b`",
            "   3. Ensure Ollama is running on http://localhost:11434",
            "   4. Set OLLAMA_ENABLED=true in your environment",
            "",
        ])
        
        # Add cloud provider instructions
        lines.extend([
            "☁️ **Cloud Providers (Fallback)**",
            "",
            "Set one of these API keys in your environment:",
            "   • OPENAI_API_KEY - Get from https://platform.openai.com/api-keys",
            "   • ANTHROPIC_API_KEY - Get from https://console.anthropic.com",
            "   • GOOGLE_AI_API_KEY - Get from https://makersuite.google.com/app/apikey",
            "   • GROQ_API_KEY - Get from https://console.groq.com/keys",
            "   • TOGETHER_API_KEY - Get from https://api.together.xyz/settings/api-keys",
            "",
        ])
        
        # Add current status
        lines.append("Current Configuration Status:")
        for provider in available_providers:
            status = "✅ Available" if provider["configured"] else "❌ Not configured"
            lines.append(f"   • {provider['name']}: {status}")
        
        return "\n".join(lines)


def get_llm(temperature: Optional[float] = None) -> LLM:
    """
    Get configured LLM instance. Wrapper for LLMProviderManager.get_llm().
    
    Args:
        temperature: Override default temperature
        
    Returns:
        Configured CrewAI LLM instance
        
    Raises:
        LLMProviderError: If no provider is available
    """
    return LLMProviderManager.get_llm(temperature)


def get_available_providers() -> List[Dict[str, Any]]:
    """
    Get list of available LLM providers.
    
    Returns:
        List of provider configurations
    """
    return LLMProviderManager.get_available_providers()

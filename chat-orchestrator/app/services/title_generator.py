"""
Title Generator Service.
Generates conversation titles from first messages.
"""

import structlog
from crewai import LLM

from app.config import settings


logger = structlog.get_logger(__name__)


class TitleGenerator:
    """Generates conversation titles from message content."""
    
    TITLE_PROMPT = """Generate a short, descriptive title (5-7 words max) for a conversation that starts with this message:

Message: {message}

Guidelines:
- Be concise and descriptive
- Capture the main topic or request
- Don't include punctuation at the end
- Don't use quotes

Title:"""
    
    def __init__(self):
        # Use OpenAI for title generation (fast and reliable)
        self.llm = LLM(
            model="openai/gpt-4o-mini",  # Fast model for simple task
            api_key=settings.openai_api_key,
            temperature=0.3,
        )
    
    async def generate(self, message: str) -> str:
        """
        Generate a conversation title from the first message.
        
        Args:
            message: First message of the conversation
            
        Returns:
            Generated title (5-7 words)
        """
        try:
            # Truncate long messages
            truncated = message[:500] if len(message) > 500 else message
            
            prompt = self.TITLE_PROMPT.format(message=truncated)
            
            # Call LLM
            result = self.llm.call([{"role": "user", "content": prompt}])
            
            # Extract title from response
            if isinstance(result, str):
                title = result.strip()
            else:
                # Handle various response formats
                title = str(result).strip()
            
            # Clean up title
            title = title.replace('"', '').replace("'", "")
            if title.endswith(('.', '!', '?')):
                title = title[:-1]
            
            # Truncate if too long
            if len(title) > 100:
                title = title[:97] + "..."
            
            logger.info("title_generated", title=title)
            return title
            
        except Exception as e:
            logger.error("title_generation_failed", error=str(e))
            # Fallback to truncated message
            fallback = message[:50] + ("..." if len(message) > 50 else "")
            return fallback

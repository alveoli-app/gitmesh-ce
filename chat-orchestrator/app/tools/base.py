"""
Base tool class with backend API integration.
Provides HTTP client for communicating with DevSpace backend.
"""

import httpx
import structlog
from typing import Any, Dict, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config import settings


logger = structlog.get_logger(__name__)


class BackendToolError(Exception):
    """Exception for backend tool errors."""
    def __init__(self, message: str, status_code: int = None, details: Any = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class BackendClient:
    """
    HTTP client for backend Agent Bridge API.
    Provides retry logic, error handling, and structured logging.
    """
    
    def __init__(
        self,
        tenant_id: str,
        user_id: str,
        conversation_id: str = None,
        agent_id: str = None,
    ):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.agent_id = agent_id
        self.base_url = f"{settings.backend_url}/agent-bridge"
        self.headers = settings.backend_headers.copy()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
    )
    async def call_tool(
        self,
        tool_name: str,
        endpoint: str,
        parameters: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Call a backend tool endpoint with retry logic.
        
        Args:
            tool_name: Name of the tool for logging
            endpoint: Backend endpoint path (e.g., "/issues/search")
            parameters: Tool parameters to send
            
        Returns:
            Tool response data
            
        Raises:
            BackendToolError: If tool call fails
        """
        url = f"{self.base_url}{endpoint}"
        
        # Add context to request
        body = {
            "tenantId": self.tenant_id,
            "userId": self.user_id,
            "conversationId": self.conversation_id,
            "agentId": self.agent_id,
            **parameters,
        }
        
        logger.info(
            "calling_backend_tool",
            tool=tool_name,
            endpoint=endpoint,
            parameters=list(parameters.keys()),
        )
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=self.headers, json=body)
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(
                        "tool_call_success",
                        tool=tool_name,
                        success=result.get("success", True),
                    )
                    return result.get("data", result)
                    
                elif response.status_code == 400:
                    error_data = response.json()
                    raise BackendToolError(
                        message=error_data.get("error", "Invalid request"),
                        status_code=400,
                        details=error_data,
                    )
                    
                elif response.status_code == 404:
                    raise BackendToolError(
                        message="Resource not found",
                        status_code=404,
                    )
                    
                elif response.status_code == 401:
                    raise BackendToolError(
                        message="Authentication failed - invalid service token",
                        status_code=401,
                    )
                    
                else:
                    error_text = response.text
                    raise BackendToolError(
                        message=f"Backend error: {error_text}",
                        status_code=response.status_code,
                    )
                    
        except httpx.ConnectError as e:
            logger.error("backend_connection_error", tool=tool_name, error=str(e))
            raise BackendToolError(
                message="Unable to connect to backend service",
                details=str(e),
            )
            
        except httpx.TimeoutException as e:
            logger.error("backend_timeout", tool=tool_name, error=str(e))
            raise BackendToolError(
                message="Backend request timed out",
                details=str(e),
            )
            
        except Exception as e:
            if isinstance(e, BackendToolError):
                raise
            logger.error("tool_call_failed", tool=tool_name, error=str(e), exc_info=e)
            raise BackendToolError(
                message=f"Unexpected error: {str(e)}",
                details=str(e),
            )

    async def propose_tool_call(
        self,
        action_type: str,
        parameters: Dict[str, Any],
        reasoning: str,
        affected_entities: list = None,
        confidence_score: float = 0.9,
    ) -> str:
        """
        Propose an action instead of executing it directly.
        
        Args:
            action_type: Type of action (e.g., 'create_issue')
            parameters: Parameters for the action
            reasoning: Why this action is being proposed
            affected_entities: List of entities affected
            confidence_score: Agent's confidence
            
        Returns:
            Formatted string with proposal ID
        """
        try:
            proposal = await self.call_tool(
                "create_proposal",
                "/proposals/create",
                {
                    "actionType": action_type,
                    "parameters": parameters,
                    "reasoning": reasoning,
                    "affectedEntities": affected_entities or [],
                    "confidenceScore": confidence_score,
                }
            )
            
            proposal_id = proposal.get("id")
            return f"Action proposed: {action_type}. [PROPOSAL_ID:{proposal_id}]"
            
        except Exception as e:
            logger.error("proposal_creation_failed", error=str(e))
            raise BackendToolError(f"Failed to create proposal: {str(e)}")

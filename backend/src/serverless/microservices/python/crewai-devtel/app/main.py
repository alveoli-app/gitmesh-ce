"""
DevTel AI Service
Multi-provider AI service supporting latest models (2024/2025):
- Ollama (development - local)
- OpenAI: GPT-4o, GPT-4o-mini, o1-preview
- Anthropic: Claude 3.5 Sonnet/Haiku
- Google: Gemini 2.0 Flash, 1.5 Pro
- Groq: Llama 3.3 70B (fast)
- Together AI: Open-source models
- DeepSeek: V3, R1 Reasoner

Run with: uvicorn app.main:app --host 0.0.0.0 --port 8001
"""
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import httpx
import json

app = FastAPI(
    title="DevTel AI Service",
    description="Multi-provider AI workflows for project management",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
SERVICE_TOKEN = os.getenv("CREWAI_SERVICE_TOKEN", "dev-token")
AI_PROVIDER = os.getenv("AI_PROVIDER", "auto")

# Ollama (local LLM)
OLLAMA_ENABLED = os.getenv("OLLAMA_ENABLED", "true").lower() == "true"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# Cloud providers
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

GOOGLE_AI_API_KEY = os.getenv("GOOGLE_AI_API_KEY", "")
GOOGLE_AI_MODEL = os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash-exp")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "")
TOGETHER_MODEL = os.getenv("TOGETHER_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")


def get_available_providers() -> List[Dict[str, Any]]:
    """Returns list of available providers with their configs"""
    providers = []
    
    if OLLAMA_ENABLED:
        providers.append({"name": "ollama", "model": OLLAMA_MODEL, "type": "local"})
    if OPENAI_API_KEY:
        providers.append({"name": "openai", "model": OPENAI_MODEL, "type": "cloud"})
    if ANTHROPIC_API_KEY:
        providers.append({"name": "anthropic", "model": ANTHROPIC_MODEL, "type": "cloud"})
    if GOOGLE_AI_API_KEY:
        providers.append({"name": "google", "model": GOOGLE_AI_MODEL, "type": "cloud"})
    if GROQ_API_KEY:
        providers.append({"name": "groq", "model": GROQ_MODEL, "type": "cloud"})
    if TOGETHER_API_KEY:
        providers.append({"name": "together", "model": TOGETHER_MODEL, "type": "cloud"})
    if DEEPSEEK_API_KEY:
        providers.append({"name": "deepseek", "model": DEEPSEEK_MODEL, "type": "cloud"})
    
    return providers


# ============================================
# AI Provider Clients
# ============================================
class AIClient:
    async def generate(self, prompt: str, system: str = None) -> str:
        raise NotImplementedError


class OllamaClient(AIClient):
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url
        self.model = model
    
    async def generate(self, prompt: str, system: str = None) -> str:
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {"model": self.model, "prompt": prompt, "stream": False}
            if system:
                payload["system"] = system
            try:
                r = await client.post(f"{self.base_url}/api/generate", json=payload)
                r.raise_for_status()
                return r.json().get("response", "")
            except Exception as e:
                print(f"Ollama error: {e}")
                return None
    
    async def is_available(self) -> bool:
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                r = await client.get(f"{self.base_url}/api/tags")
                return r.status_code == 200
            except:
                return False


class OpenAIClient(AIClient):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
    
    async def generate(self, prompt: str, system: str = None) -> str:
        if not self.api_key:
            return None
        async with httpx.AsyncClient(timeout=60.0) as client:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            try:
                r = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"model": self.model, "messages": messages},
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"OpenAI error: {e}")
                return None


class AnthropicClient(AIClient):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
    
    async def generate(self, prompt: str, system: str = None) -> str:
        if not self.api_key:
            return None
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                r = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": self.api_key, "anthropic-version": "2023-06-01"},
                    json={
                        "model": self.model,
                        "max_tokens": 4096,
                        "system": system or "",
                        "messages": [{"role": "user", "content": prompt}],
                    },
                )
                r.raise_for_status()
                return r.json()["content"][0]["text"]
            except Exception as e:
                print(f"Anthropic error: {e}")
                return None


class GoogleAIClient(AIClient):
    """Google Gemini"""
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
    
    async def generate(self, prompt: str, system: str = None) -> str:
        if not self.api_key:
            return None
        async with httpx.AsyncClient(timeout=60.0) as client:
            full_prompt = f"{system}\n\n{prompt}" if system else prompt
            try:
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
                    params={"key": self.api_key},
                    json={"contents": [{"parts": [{"text": full_prompt}]}]},
                )
                r.raise_for_status()
                return r.json()["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                print(f"Google AI error: {e}")
                return None


class GroqClient(AIClient):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
    
    async def generate(self, prompt: str, system: str = None) -> str:
        if not self.api_key:
            return None
        async with httpx.AsyncClient(timeout=30.0) as client:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            try:
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"model": self.model, "messages": messages},
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"Groq error: {e}")
                return None


class TogetherClient(AIClient):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
    
    async def generate(self, prompt: str, system: str = None) -> str:
        if not self.api_key:
            return None
        async with httpx.AsyncClient(timeout=60.0) as client:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            try:
                r = await client.post(
                    "https://api.together.xyz/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"model": self.model, "messages": messages},
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"Together error: {e}")
                return None


class DeepSeekClient(AIClient):
    """DeepSeek V3 / R1 Reasoner"""
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
    
    async def generate(self, prompt: str, system: str = None) -> str:
        if not self.api_key:
            return None
        async with httpx.AsyncClient(timeout=120.0) as client:
            messages = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})
            try:
                r = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"model": self.model, "messages": messages},
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"DeepSeek error: {e}")
                return None


def get_active_provider() -> str:
    """Determine which provider to use based on config and availability"""
    if AI_PROVIDER != "auto":
        return AI_PROVIDER
    
    # Auto-detect: prefer cloud providers, fallback to Ollama
    if OPENAI_API_KEY:
        return "openai"
    if ANTHROPIC_API_KEY:
        return "anthropic"
    if GROQ_API_KEY:
        return "groq"
    if GOOGLE_AI_API_KEY:
        return "google"
    if TOGETHER_API_KEY:
        return "together"
    if DEEPSEEK_API_KEY:
        return "deepseek"
    if OLLAMA_ENABLED:
        return "ollama"
    
    # Ultimate fallback
    return "ollama"


ACTIVE_PROVIDER = get_active_provider()


def get_ai_client() -> AIClient:
    """Factory to get the configured AI client"""
    provider = ACTIVE_PROVIDER
    
    if provider == "openai":
        return OpenAIClient(OPENAI_API_KEY, OPENAI_MODEL)
    elif provider == "anthropic":
        return AnthropicClient(ANTHROPIC_API_KEY, ANTHROPIC_MODEL)
    elif provider == "google":
        return GoogleAIClient(GOOGLE_AI_API_KEY, GOOGLE_AI_MODEL)
    elif provider == "groq":
        return GroqClient(GROQ_API_KEY, GROQ_MODEL)
    elif provider == "together":
        return TogetherClient(TOGETHER_API_KEY, TOGETHER_MODEL)
    elif provider == "deepseek":
        return DeepSeekClient(DEEPSEEK_API_KEY, DEEPSEEK_MODEL)
    else:
        return OllamaClient(OLLAMA_URL, OLLAMA_MODEL)


ai_client = get_ai_client()


# ============================================
# Authentication
# ============================================
async def verify_service_token(x_service_token: str = Header(None)):
    if x_service_token != SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid service token")
    return True


# ============================================
# Request Models
# ============================================
class WorkflowRequest(BaseModel):
    workspaceId: str
    input: Dict[str, Any]
    userId: str
    jobId: Optional[str] = None


# ============================================
# Health Check & Provider Info
# ============================================
@app.get("/health")
async def health_check():
    status = {
        "status": "healthy",
        "service": "devtel-ai",
        "configured_provider": AI_PROVIDER,
        "active_provider": ACTIVE_PROVIDER,
    }
    
    model_map = {
        "ollama": OLLAMA_MODEL,
        "openai": OPENAI_MODEL,
        "anthropic": ANTHROPIC_MODEL,
        "google": GOOGLE_AI_MODEL,
        "groq": GROQ_MODEL,
        "together": TOGETHER_MODEL,
        "deepseek": DEEPSEEK_MODEL,
    }
    status["model"] = model_map.get(ACTIVE_PROVIDER, "unknown")
    
    if OLLAMA_ENABLED and ACTIVE_PROVIDER == "ollama":
        ollama = OllamaClient(OLLAMA_URL, OLLAMA_MODEL)
        status["ollama_connected"] = await ollama.is_available()
    
    return status


@app.get("/providers")
async def list_providers():
    """List all available AI providers based on configuration"""
    return {
        "configured": AI_PROVIDER,
        "active": ACTIVE_PROVIDER,
        "ollama_enabled": OLLAMA_ENABLED,
        "available": get_available_providers(),
    }


# ============================================
# Workflow Endpoints
# ============================================
@app.post("/workflows/prioritize")
async def prioritize_issues(req: WorkflowRequest, _: bool = Depends(verify_service_token)):
    issues = req.input.get("issues", [])
    if not issues:
        return {"prioritized": [], "reasoning": "No issues provided"}
    
    issues_text = "\n".join([
        f"- ID: {i.get('id')}, Title: {i.get('title')}, Priority: {i.get('priority', 'medium')}"
        for i in issues[:15]
    ])
    
    prompt = f"""Prioritize these issues by urgency and business impact:
{issues_text}

Return valid JSON only: {{"prioritized": [{{"issueId": "...", "rank": 1}}], "reasoning": "..."}}"""
    
    response = await ai_client.generate(prompt, "You are an experienced project manager. Return only valid JSON.")
    
    if response:
        try:
            # Try to extract JSON from response
            json_str = response[response.find("{"):response.rfind("}")+1]
            return json.loads(json_str)
        except:
            pass
    
    # Fallback
    sorted_issues = sorted(issues, key=lambda x: {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}.get(x.get('priority', 'medium'), 2))
    return {
        "prioritized": [{"issueId": i.get("id"), "rank": idx+1} for idx, i in enumerate(sorted_issues)],
        "reasoning": "Prioritized by urgency level (fallback)",
    }


@app.post("/workflows/suggest-sprint")
async def suggest_sprint(req: WorkflowRequest, _: bool = Depends(verify_service_token)):
    backlog = req.input.get("backlog", [])
    capacity = req.input.get("targetCapacity", 40)
    
    if not backlog:
        return {"suggested": [], "totalPoints": 0, "remainingCapacity": capacity}
    
    prompt = f"""Select issues for a sprint with {capacity} story points capacity.
Backlog (max 15): {json.dumps(backlog[:15], indent=2)}
Return valid JSON only: {{"suggested": ["id1", "id2"], "totalPoints": X}}"""
    
    response = await ai_client.generate(prompt, "You are a sprint planner. Return only valid JSON.")
    
    if response:
        try:
            json_str = response[response.find("{"):response.rfind("}")+1]
            return json.loads(json_str)
        except:
            pass
    
    # Fallback: greedy
    selected, total = [], 0
    for issue in sorted(backlog, key=lambda x: {'urgent': 0, 'high': 1, 'medium': 2, 'low': 3}.get(x.get('priority', 'medium'), 2)):
        pts = issue.get('storyPoints', 1)
        if total + pts <= capacity:
            selected.append(issue)
            total += pts
    return {"suggested": selected, "totalPoints": total, "remainingCapacity": capacity - total}


@app.post("/workflows/breakdown")
async def breakdown_issue(req: WorkflowRequest, _: bool = Depends(verify_service_token)):
    issue = req.input.get("issue", {})
    
    prompt = f"""Break down this issue into subtasks:
Title: {issue.get('title', '')}
Description: {issue.get('description', '')}

Return valid JSON only: {{"subtasks": [{{"title": "...", "suggestedPoints": 2}}]}}"""
    
    response = await ai_client.generate(prompt, "You are a technical lead. Return only valid JSON.")
    
    if response:
        try:
            json_str = response[response.find("{"):response.rfind("}")+1]
            result = json.loads(json_str)
            return {"parentIssue": issue, **result}
        except:
            pass
    
    return {
        "parentIssue": issue,
        "subtasks": [
            {"title": f"Research: {issue.get('title', '')}", "suggestedPoints": 1},
            {"title": f"Implement: {issue.get('title', '')}", "suggestedPoints": 3},
            {"title": f"Test: {issue.get('title', '')}", "suggestedPoints": 2},
        ],
    }


@app.post("/workflows/suggest-assignee")
async def suggest_assignee(req: WorkflowRequest, _: bool = Depends(verify_service_token)):
    issue = req.input.get("issue", {})
    team = req.input.get("team", [])
    
    if not team:
        return {"issue": issue, "suggestions": []}
    
    prompt = f"""Suggest best team member for this issue:
Issue: {issue.get('title')} ({issue.get('type', 'story')})
Team (max 5): {json.dumps(team[:5], indent=2)}
Return valid JSON only: {{"suggestions": [{{"userId": "...", "score": 10, "reasoning": "..."}}]}}"""
    
    response = await ai_client.generate(prompt, "You are an engineering manager. Return only valid JSON.")
    
    if response:
        try:
            json_str = response[response.find("{"):response.rfind("}")+1]
            result = json.loads(json_str)
            return {"issue": issue, **result}
        except:
            pass
    
    sorted_team = sorted(team, key=lambda x: x.get('currentWorkload', 0))
    return {
        "issue": issue,
        "suggestions": [{"userId": m.get("id"), "score": 10, "reasoning": "Available"} for m in sorted_team[:3]],
    }


@app.post("/workflows/generate-spec")
async def generate_spec(req: WorkflowRequest, _: bool = Depends(verify_service_token)):
    title = req.input.get("title", "")
    description = req.input.get("description", "")
    
    prompt = f"""Write a Product Requirement Document (PRD) for:
Title: {title}
Description: {description}

Include: Overview, Goals, User Stories, Requirements, Success Metrics.
Write in markdown format."""
    
    response = await ai_client.generate(prompt, "You are a product manager writing clear specifications.")
    content = response if response else f"# {title}\n\n{description}"
    
    return {
        "title": title,
        "content": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": content}]}]},
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    print(f"Starting DevTel AI Service (provider: {AI_PROVIDER})")
    uvicorn.run(app, host="0.0.0.0", port=port)

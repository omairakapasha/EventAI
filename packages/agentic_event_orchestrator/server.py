"""FastAPI server for the Agentic Event Orchestrator using OpenAI Agent SDK."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import os
import sys
import uuid
from datetime import datetime

# Add the current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.sdk_agents import (
    run_orchestration,
    run_vendor_discovery,
    run_scheduler,
    run_triage,
    run_booking,
    run_event_planning,
    triage_agent,
)
from _agents_sdk import Runner

app = FastAPI(
    title="Agentic Event Orchestrator API",
    description="AI-powered event planning with OpenAI Agent SDK",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# SESSION MANAGEMENT (in-memory for now)
# ============================================================================

# Store conversation history per session
_sessions: Dict[str, List[Dict[str, str]]] = {}

def get_session(session_id: str) -> List[Dict[str, str]]:
    """Get or create a conversation session."""
    if session_id not in _sessions:
        _sessions[session_id] = []
    return _sessions[session_id]

def add_to_session(session_id: str, role: str, content: str):
    """Add a message to the session history."""
    session = get_session(session_id)
    session.append({
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat()
    })
    # Keep last 20 messages to avoid context overflow
    if len(session) > 20:
        _sessions[session_id] = session[-20:]


# ============================================================================
# REQUEST / RESPONSE MODELS
# ============================================================================

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_email: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    agent: str
    session_id: str

class PlanRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    success: bool
    result: str
    agent_used: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Agentic Event Orchestrator",
        "sdk": "OpenAI Agent SDK + LiteLLM/Gemini",
        "version": "3.0.0",
        "agents": [
            "TriageAgent", "VendorDiscoveryAgent", "SchedulerAgent",
            "ApprovalAgent", "MailAgent", "BookingAgent", "EventPlannerAgent",
            "OrchestratorAgent"
        ]
    }


@app.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    """Main chat endpoint — the primary way users interact with the system.
    
    Routes through the TriageAgent which delegates to specialized agents.
    Maintains conversation context across messages via session_id.
    """
    try:
        # Generate or use existing session ID
        session_id = request.session_id or str(uuid.uuid4())
        
        # Build conversation context
        history = get_session(session_id)
        
        # Construct input with context
        context_parts = []
        
        if request.user_email:
            context_parts.append(f"[User email: {request.user_email}]")
        
        # Include recent conversation history for context
        if history:
            recent = history[-6:]  # Last 3 exchanges  
            history_text = "\n".join([
                f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content'][:200]}"
                for m in recent
            ])
            context_parts.append(f"[Previous conversation:\n{history_text}]")
        
        context_prefix = "\n".join(context_parts)
        full_input = f"{context_prefix}\n\nUser: {request.message}" if context_parts else request.message
        
        # Run through triage agent
        result = Runner.run_sync(triage_agent, full_input)
        
        response_text = result.final_output
        agent_name = result.last_agent.name if hasattr(result, 'last_agent') and result.last_agent else "AI Assistant"
        
        # Save to session  
        add_to_session(session_id, "user", request.message)
        add_to_session(session_id, "assistant", response_text)
        
        return ChatResponse(
            response=response_text,
            agent=agent_name,
            session_id=session_id,
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return ChatResponse(
            response=f"I apologize, I encountered an issue processing your request. Please try again. (Error: {str(e)[:100]})",
            agent="System",
            session_id=request.session_id or str(uuid.uuid4()),
        )


@app.post("/api/agent/orchestrate")
def orchestrate_event(request: PlanRequest) -> AgentResponse:
    """Main orchestration endpoint using OpenAI Agent SDK."""
    try:
        result = run_orchestration(request.message)
        
        return AgentResponse(
            success=True,
            result=result.final_output,
            agent_used=result.last_agent.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/discover")
def discover_vendors(request: PlanRequest) -> AgentResponse:
    """Vendor discovery using specialized agent."""
    try:
        result = run_vendor_discovery(request.message)
        
        return AgentResponse(
            success=True,
            result=result.final_output,
            agent_used=result.last_agent.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/schedule")
def create_schedule(request: PlanRequest) -> AgentResponse:
    """Schedule optimization using scheduler agent."""
    try:
        result = run_scheduler({"event_type": "event", "date": "2026-01-01", "attendees": 50, "budget": 100000, "preferences": []})
        
        return AgentResponse(
            success=True,
            result=result.final_output,
            agent_used=result.last_agent.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent/plan")
def plan_event(request: PlanRequest) -> AgentResponse:
    """Plan endpoint (legacy compatibility for backend proxy)."""
    try:
        result = run_triage(request.message)
        
        return AgentResponse(
            success=True,
            result=result.final_output,
            agent_used=result.last_agent.name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

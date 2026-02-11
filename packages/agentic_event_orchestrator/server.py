"""FastAPI server for the Agentic Event Orchestrator using OpenAI Agent SDK."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
import os
import sys

# Add the current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.sdk_agents import run_orchestration, run_vendor_discovery, run_scheduler
from tools import (
    search_vendors,
    check_availability,
    get_pricing,
    optimize_schedule,
    calculate_budget,
    send_invitations,
)

app = FastAPI(
    title="Agentic Event Orchestrator API",
    description="AI-powered event planning with OpenAI Agent SDK",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class PlanRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class AgentResponse(BaseModel):
    success: bool
    result: str
    agent_used: str


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Agentic Event Orchestrator",
        "sdk": "OpenAI Agent SDK",
        "version": "2.0.0"
    }


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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

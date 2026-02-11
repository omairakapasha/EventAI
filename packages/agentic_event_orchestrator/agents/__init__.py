"""Agents package for the Agentic Event Orchestrator.

This package contains all agents using the OpenAI Agent SDK.
"""

from .sdk_agents import (
    # Agents
    triage_agent,
    vendor_discovery_agent,
    scheduler_agent,
    approval_agent,
    mail_agent,
    orchestrator_agent,
    # Runner functions
    run_triage,
    run_vendor_discovery,
    run_scheduler,
    run_approval,
    run_mail,
    run_orchestration,
)

# Keep old imports for backward compatibility (deprecated)
try:
    from .event_planner_agent import EventPlannerAgent
    from .orchestration_agent import OrchestrationAgent
except ImportError:
    EventPlannerAgent = None
    OrchestrationAgent = None

__all__ = [
    # OpenAI Agent SDK agents
    "triage_agent",
    "vendor_discovery_agent",
    "scheduler_agent",
    "approval_agent",
    "mail_agent",
    "orchestrator_agent",
    # Runner functions
    "run_triage",
    "run_vendor_discovery",
    "run_scheduler",
    "run_approval",
    "run_mail",
    "run_orchestration",
    # Deprecated (for backward compatibility)
    "EventPlannerAgent",
    "OrchestrationAgent",
]

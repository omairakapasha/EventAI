"""Tools package for the Agentic Event Orchestrator.

This package contains all function tools used by the agents.
"""

from .vendor_tools import (
    search_vendors,
    check_availability,
    get_vendor_details,
    get_pricing,
    get_vendor_recommendations,
)

from .scheduler_tools import (
    optimize_schedule,
    check_constraints,
    calculate_budget,
    suggest_event_timing,
)

from .mail_tools import (
    send_invitations,
    track_rsvps,
    get_detailed_rsvps,
    send_reminders,
    generate_invitation_text,
)

from .approval_tools import (
    request_approval,
    check_budget_approval_limits,
    notify_stakeholders,
    record_approval_decision,
    get_approval_history,
)

__all__ = [
    # Vendor tools
    "search_vendors",
    "check_availability",
    "get_vendor_details",
    "get_pricing",
    "get_vendor_recommendations",
    # Scheduler tools
    "optimize_schedule",
    "check_constraints",
    "calculate_budget",
    "suggest_event_timing",
    # Mail tools
    "send_invitations",
    "track_rsvps",
    "get_detailed_rsvps",
    "send_reminders",
    "generate_invitation_text",
    # Approval tools
    "request_approval",
    "check_budget_approval_limits",
    "notify_stakeholders",
    "record_approval_decision",
    "get_approval_history",
]

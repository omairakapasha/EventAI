"""OpenAI Agent SDK agents for the Agentic Event Orchestrator.

This module defines all agents using the OpenAI Agent SDK with proper
tool integration and agent handoffs.
"""

from agents import Agent, Runner, function_tool, handoff
from typing import Dict, Any, Optional

# Import all tools
from tools import (
    # Vendor tools
    search_vendors,
    check_availability,
    get_vendor_details,
    get_pricing,
    get_vendor_recommendations,
    # Scheduler tools
    optimize_schedule,
    check_constraints,
    calculate_budget,
    suggest_event_timing,
    # Mail tools
    send_invitations,
    track_rsvps,
    get_detailed_rsvps,
    send_reminders,
    generate_invitation_text,
    # Approval tools
    request_approval,
    check_budget_approval_limits,
    notify_stakeholders,
    record_approval_decision,
    get_approval_history,
)

# ============================================================================
# TRIAGE AGENT
# ============================================================================

triage_agent = Agent(
    name="TriageAgent",
    instructions="""You are the entry point for the Event Orchestrator system.

Your job is to understand the user's request and route it to the appropriate specialized agent.

CAPABILITIES:
- Parse natural language event requests
- Extract key details: event type, date, location, budget, attendees, preferences
- Route to the correct specialized agent based on the request type

ROUTING RULES:
- If the user wants to plan/find vendors/search → handoff to vendor_discovery_agent
- If the user wants to create/optimize a schedule → handoff to scheduler_agent  
- If the user has a plan ready and wants approval → handoff to approval_agent
- If the user wants to send invitations/track RSVPs → handoff to mail_agent
- For complex multi-step requests → handoff to orchestrator_agent

Always be helpful and extract as much detail as possible from the user's request before routing.
""",
    handoffs=[],  # Will be populated after agent definitions
)

# ============================================================================
# VENDOR DISCOVERY AGENT
# ============================================================================

vendor_discovery_agent = Agent(
    name="VendorDiscoveryAgent",
    instructions="""You are an expert at finding and recommending vendors for events in Pakistan.

Your expertise includes:
- Searching vendor databases and APIs
- Matching vendors to event requirements
- Checking availability and pricing
- Providing personalized recommendations

WORKFLOW:
1. Understand the event type, location, budget, and preferences
2. Use search_vendors to find candidates
3. Use get_vendor_recommendations for curated suggestions
4. Check availability with check_availability
5. Get pricing with get_pricing
6. Present options with clear reasoning

Always provide specific vendor names, pricing in PKR, and explain why each vendor is a good match.
Consider Pakistani cultural context (weddings, mehndi, baraat) when making recommendations.
""",
    tools=[
        search_vendors,
        check_availability,
        get_vendor_details,
        get_pricing,
        get_vendor_recommendations,
    ],
)

# ============================================================================
# SCHEDULER AGENT
# ============================================================================

scheduler_agent = Agent(
    name="SchedulerAgent",
    instructions="""You are an expert event scheduler and logistics coordinator.

Your expertise includes:
- Creating optimized event schedules
- Checking budget and constraint compliance
- Suggesting optimal timing for events
- Managing vendor coordination timing

WORKFLOW:
1. Understand event type, duration, and timing preferences
2. Use suggest_event_timing for recommendations
3. Use optimize_schedule to create detailed timeline
4. Use check_constraints to validate the plan
5. Use calculate_budget for cost breakdown
6. Present a clear, actionable schedule

Consider Pakistani event customs:
- Weddings: Evening events, multiple days (mehndi, baraat, walima)
- Birthdays: Afternoon or early evening
- Corporate: Business hours, mid-week preferred

Always provide specific times, durations, and vendor coordination points.
""",
    tools=[
        optimize_schedule,
        check_constraints,
        calculate_budget,
        suggest_event_timing,
    ],
)

# ============================================================================
# APPROVAL AGENT
# ============================================================================

approval_agent = Agent(
    name="ApprovalAgent",
    instructions="""You are responsible for managing the approval workflow for event plans.

Your duties include:
- Creating approval requests for event plans
- Checking budget approval limits
- Coordinating with stakeholders
- Recording approval decisions

WORKFLOW:
1. Review the event plan details (type, cost, vendors)
2. Use check_budget_approval_limits to determine approval requirements
3. Use request_approval to create formal approval request
4. Use notify_stakeholders to inform relevant parties
5. When decision is made, use record_approval_decision

APPROVAL LIMITS (PKR):
- Coordinator: Up to 50,000
- Manager: Up to 200,000
- Director: Up to 1,000,000
- Executive: Unlimited

Always ensure proper approval chain is followed for budget compliance.
Escalate to higher approval levels when budgets exceed current authority.
""",
    tools=[
        request_approval,
        check_budget_approval_limits,
        notify_stakeholders,
        record_approval_decision,
        get_approval_history,
    ],
)

# ============================================================================
# MAIL AGENT
# ============================================================================

mail_agent = Agent(
    name="MailAgent",
    instructions="""You are an expert at managing event communications and guest coordination.

Your expertise includes:
- Creating and sending elegant invitations
- Tracking RSVPs and guest responses
- Sending reminder emails
- Managing guest lists

WORKFLOW:
1. Use generate_invitation_text to create appropriate invitation
2. Use send_invitations to send to guest list
3. Use track_rsvps to monitor responses
4. Use get_detailed_rsvps for individual status
5. Use send_reminders for follow-ups

Always be courteous and professional. Include all essential details:
- Event type and purpose
- Date, time, and location
- Dress code if applicable
- RSVP deadline

Consider cultural norms for Pakistani events when crafting messages.
""",
    tools=[
        send_invitations,
        track_rsvps,
        get_detailed_rsvps,
        send_reminders,
        generate_invitation_text,
    ],
)

# ============================================================================
# ORCHESTRATOR AGENT
# ============================================================================

orchestrator_agent = Agent(
    name="OrchestratorAgent",
    instructions="""You are the master orchestrator for the Event Planning system.

Your role is to coordinate the entire event planning workflow by delegating
to specialized agents and ensuring all steps are completed successfully.

ORCHESTRATION WORKFLOW:
1. INTAKE: Understand the complete event requirements from the user
2. VENDOR DISCOVERY: Handoff to vendor_discovery_agent to find suitable vendors
3. SCHEDULING: Handoff to scheduler_agent to create optimal schedule
4. APPROVAL: Handoff to approval_agent to get plan approval
5. COMMUNICATION: Handoff to mail_agent to handle invitations

DELEGATION GUIDELINES:
- Always use handoffs to specialized agents for their domain
- Maintain context about event requirements across handoffs
- Track the progress of each sub-task
- Synthesize results from multiple agents into coherent responses
- If an agent needs more information, ask the user

When given a complex request, break it down and delegate to the appropriate
specialized agent. Don't try to do everything yourself - use the handoffs.

Always provide clear summaries of what each agent accomplished.
""",
    handoffs=[
        vendor_discovery_agent,
        scheduler_agent,
        approval_agent,
        mail_agent,
    ],
)

# Update triage agent to have orchestrator as handoff
triage_agent = triage_agent.model_copy(update={
    "handoffs": [vendor_discovery_agent, scheduler_agent, approval_agent, mail_agent, orchestrator_agent]
})

# ============================================================================
# RUNNER FUNCTIONS
# ============================================================================

def run_triage(user_input: str) -> Any:
    """Run the triage agent to route a user request."""
    return Runner.run_sync(triage_agent, user_input)


def run_vendor_discovery(query: str, context: Optional[Dict] = None) -> Any:
    """Run the vendor discovery agent."""
    input_text = query
    if context:
        input_text += f"\n\nContext: {context}"
    return Runner.run_sync(vendor_discovery_agent, input_text)


def run_scheduler(event_details: Dict[str, Any]) -> Any:
    """Run the scheduler agent with event details."""
    input_text = f"""Create a schedule for:
- Event Type: {event_details.get('event_type', 'event')}
- Date: {event_details.get('date', 'TBD')}
- Location: {event_details.get('location', 'TBD')}
- Attendees: {event_details.get('attendees', 0)}
- Budget: PKR {event_details.get('budget', 0):,.0f}
- Preferences: {', '.join(event_details.get('preferences', []))}
"""
    return Runner.run_sync(scheduler_agent, input_text)


def run_approval(plan_details: Dict[str, Any]) -> Any:
    """Run the approval agent for a plan."""
    input_text = f"""Process approval for:
- Event Type: {plan_details.get('event_type', 'event')}
- Total Cost: PKR {plan_details.get('total_cost', 0):,.0f}
- Vendors: {plan_details.get('vendor_count', 0)}
- Requester: {plan_details.get('requester', 'coordinator')}
"""
    return Runner.run_sync(approval_agent, input_text)


def run_mail(event_details: Dict[str, Any], guests: list) -> Any:
    """Run the mail agent for invitations."""
    input_text = f"""Handle invitations for:
- Event Type: {event_details.get('event_type', 'event')}
- Date: {event_details.get('date', 'TBD')}
- Location: {event_details.get('location', 'TBD')}
- Guests: {len(guests)} recipients
"""
    return Runner.run_sync(mail_agent, input_text)


def run_orchestration(user_input: str) -> Any:
    """Run the full orchestration workflow."""
    return Runner.run_sync(orchestrator_agent, user_input)


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Agents
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
]

"""Event management tools for the Agentic Event Orchestrator.

These tools enable the chatbot to create, list, and manage events
by calling the backend API.
"""

from typing import List, Dict, Any, Optional
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _agents_sdk import function_tool
from pydantic import BaseModel, Field
import requests

BACKEND_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api/v1")


class EventResult(BaseModel):
    """Result of an event operation."""
    success: bool = Field(..., description="Whether the operation succeeded")
    event_id: Optional[str] = Field(None, description="Event ID if created")
    message: str = Field(..., description="Human-readable result message")
    details: Optional[Dict[str, Any]] = Field(None, description="Full event details")


class EventSummary(BaseModel):
    """Summary of an event."""
    event_id: str = Field(..., description="Event ID")
    event_type: str = Field(..., description="Type of event")
    event_name: str = Field(..., description="Event name")
    event_date: str = Field(..., description="Event date")
    location: str = Field(..., description="Event location")
    status: str = Field(..., description="Event status")
    budget: float = Field(0, description="Budget in PKR")
    attendees: int = Field(0, description="Expected attendees")


@function_tool
def create_event(
    event_type: str,
    event_name: str,
    event_date: str,
    location: str = "",
    client_name: str = "",
    client_email: str = "",
    attendees: int = 0,
    budget: float = 0,
    preferences: str = "",
    requirements: str = ""
) -> EventResult:
    """Create a new event for planning.

    Args:
        event_type: Type of event (wedding, birthday, corporate, mehndi, conference, party)
        event_name: Name/title for the event
        event_date: Event date in YYYY-MM-DD format
        location: City or venue where the event will be held
        client_name: Name of the person organizing the event
        client_email: Email of the organizer
        attendees: Expected number of attendees
        budget: Total budget in PKR
        preferences: Comma-separated list of preferences
        requirements: Any special requirements

    Returns:
        Event creation result with ID
    """
    try:
        prefs_list = [p.strip() for p in preferences.split(",")] if preferences else []
        
        response = requests.post(
            f"{BACKEND_URL}/events",
            json={
                "eventType": event_type,
                "eventName": event_name,
                "eventDate": event_date,
                "location": location,
                "clientName": client_name,
                "clientEmail": client_email,
                "attendees": attendees,
                "budget": budget,
                "preferences": prefs_list,
                "requirements": requirements,
            },
            timeout=10,
        )

        if response.status_code == 201:
            data = response.json()
            event = data.get("event", {})
            budget_str = f"PKR {budget:,.0f}" if budget else "Not specified"
            return EventResult(
                success=True,
                event_id=event.get("id"),
                message=(
                    f"🎉 Event created successfully!\n\n"
                    f"**{event_name}** ({event_type})\n"
                    f"📅 Date: {event_date}\n"
                    f"📍 Location: {location or 'TBD'}\n"
                    f"👥 Attendees: {attendees or 'TBD'}\n"
                    f"💰 Budget: {budget_str}\n\n"
                    f"Event ID: `{event.get('id', 'N/A')[:8]}...`\n\n"
                    f"Would you like me to find vendors for this event?"
                ),
                details=event,
            )
        else:
            error = response.json().get("error", "Unknown error")
            return EventResult(
                success=False,
                message=f"❌ Could not create event: {error}",
            )
    except requests.exceptions.ConnectionError:
        return EventResult(
            success=False,
            message="❌ Backend service is not available. Please try again later.",
        )
    except Exception as e:
        return EventResult(
            success=False,
            message=f"❌ Error creating event: {str(e)}",
        )


@function_tool
def list_user_events(client_email: str) -> List[EventSummary]:
    """List all events for a user.

    Args:
        client_email: Email of the user

    Returns:
        List of event summaries
    """
    try:
        response = requests.get(
            f"{BACKEND_URL}/events",
            params={"email": client_email},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            events = data.get("events", [])
            results = []
            for e in events:
                results.append(EventSummary(
                    event_id=e["id"],
                    event_type=e.get("eventType", "unknown"),
                    event_name=e.get("eventName", "Unnamed Event"),
                    event_date=e.get("eventDate", "TBD"),
                    location=e.get("location", "TBD"),
                    status=e.get("status", "draft"),
                    budget=float(e.get("budget", 0) or 0),
                    attendees=e.get("attendees", 0) or 0,
                ))
            return results
        return []
    except Exception as e:
        print(f"Error fetching events: {e}")
        return []


@function_tool
def get_event_details(event_id: str) -> Dict[str, Any]:
    """Get full details of an event including linked vendors.

    Args:
        event_id: The event ID

    Returns:
        Complete event details
    """
    try:
        response = requests.get(
            f"{BACKEND_URL}/events/{event_id}",
            timeout=10,
        )

        if response.status_code == 200:
            return response.json().get("event", {})
        return {"error": f"Event {event_id} not found"}
    except Exception as e:
        return {"error": str(e)}


@function_tool
def update_event_status(event_id: str, status: str) -> EventResult:
    """Update the status of an event.

    Args:
        event_id: The event ID to update
        status: New status (draft, planning, quoted, approved, confirmed, completed, cancelled)

    Returns:
        Result of the update
    """
    try:
        response = requests.patch(
            f"{BACKEND_URL}/events/{event_id}/status",
            json={"status": status},
            timeout=10,
        )

        if response.status_code == 200:
            return EventResult(
                success=True,
                event_id=event_id,
                message=f"✅ Event status updated to **{status}**.",
            )
        else:
            error = response.json().get("error", "Unknown error")
            return EventResult(
                success=False,
                event_id=event_id,
                message=f"❌ Could not update event: {error}",
            )
    except Exception as e:
        return EventResult(
            success=False,
            message=f"❌ Error updating event: {str(e)}",
        )

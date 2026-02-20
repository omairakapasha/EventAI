"""Booking tools for the Agentic Event Orchestrator.

These tools enable the chatbot to create, list, cancel, and view bookings
by calling the backend API.
"""

from typing import List, Dict, Any, Optional
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from _agents_sdk import function_tool
from pydantic import BaseModel, Field
import requests

BACKEND_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api/v1")


class BookingResult(BaseModel):
    """Result of a booking operation."""
    success: bool = Field(..., description="Whether the operation succeeded")
    booking_id: Optional[str] = Field(None, description="Booking ID if created")
    message: str = Field(..., description="Human-readable result message")
    details: Optional[Dict[str, Any]] = Field(None, description="Full booking details")


class BookingSummary(BaseModel):
    """Summary of a booking."""
    booking_id: str = Field(..., description="Booking ID")
    vendor_name: str = Field(..., description="Vendor business name")
    service_name: str = Field(..., description="Service name")
    event_date: str = Field(..., description="Event date")
    status: str = Field(..., description="Booking status")
    total_price: float = Field(..., description="Total price in PKR")


@function_tool
def create_booking(
    vendor_id: str,
    service_id: str,
    event_date: str,
    client_name: str,
    client_email: str,
    guest_count: int = 1,
    notes: str = "",
    event_name: str = ""
) -> BookingResult:
    """Create a new booking for a vendor service.

    Args:
        vendor_id: The vendor's unique ID
        service_id: The service ID to book
        event_date: Event date in YYYY-MM-DD format
        client_name: Name of the client making the booking
        client_email: Email of the client
        guest_count: Number of guests expected
        notes: Any special notes or requirements
        event_name: Optional name for the event

    Returns:
        Booking result with ID and confirmation details
    """
    try:
        response = requests.post(
            f"{BACKEND_URL}/bookings",
            json={
                "vendorId": vendor_id,
                "serviceId": service_id,
                "eventDate": event_date,
                "clientName": client_name,
                "clientEmail": client_email,
                "guestCount": guest_count,
                "notes": notes,
                "eventName": event_name,
            },
            timeout=10,
        )

        if response.status_code == 201:
            data = response.json()
            booking = data.get("booking", {})
            vendor = booking.get("vendor", {})
            service = booking.get("service", {})
            return BookingResult(
                success=True,
                booking_id=booking.get("id"),
                message=f"✅ Booking confirmed! Your booking with **{vendor.get('name', 'vendor')}** for **{service.get('name', 'service')}** on **{event_date}** has been created. Booking ID: `{booking.get('id', 'N/A')[:8]}...`",
                details=booking,
            )
        else:
            error = response.json().get("error", "Unknown error")
            return BookingResult(
                success=False,
                message=f"❌ Could not create booking: {error}",
            )
    except requests.exceptions.ConnectionError:
        return BookingResult(
            success=False,
            message="❌ Backend service is not available. Please try again later.",
        )
    except Exception as e:
        return BookingResult(
            success=False,
            message=f"❌ Error creating booking: {str(e)}",
        )


@function_tool
def get_my_bookings(client_email: str) -> List[BookingSummary]:
    """Get all bookings for a user by their email address.

    Args:
        client_email: The email address of the client

    Returns:
        List of booking summaries
    """
    try:
        response = requests.get(
            f"{BACKEND_URL}/bookings",
            params={"email": client_email},
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            bookings = data.get("bookings", [])
            results = []
            for b in bookings:
                vendor = b.get("vendor", {})
                service = b.get("service", {})
                results.append(BookingSummary(
                    booking_id=b["id"],
                    vendor_name=vendor.get("name", "Unknown"),
                    service_name=service.get("name", "Unknown"),
                    event_date=b.get("eventDate", "TBD"),
                    status=b.get("status", "unknown"),
                    total_price=float(b.get("totalPrice", 0)),
                ))
            return results
        return []
    except Exception as e:
        print(f"Error fetching bookings: {e}")
        return []


@function_tool
def cancel_booking(booking_id: str, reason: str = "Cancelled by user") -> BookingResult:
    """Cancel an existing booking.

    Args:
        booking_id: The booking ID to cancel
        reason: Reason for cancellation

    Returns:
        Result of the cancellation
    """
    try:
        response = requests.patch(
            f"{BACKEND_URL}/bookings/{booking_id}/cancel",
            json={"reason": reason},
            timeout=10,
        )

        if response.status_code == 200:
            return BookingResult(
                success=True,
                booking_id=booking_id,
                message=f"✅ Booking `{booking_id[:8]}...` has been cancelled successfully.",
            )
        else:
            error = response.json().get("error", "Unknown error")
            return BookingResult(
                success=False,
                booking_id=booking_id,
                message=f"❌ Could not cancel booking: {error}",
            )
    except Exception as e:
        return BookingResult(
            success=False,
            message=f"❌ Error cancelling booking: {str(e)}",
        )


@function_tool
def get_booking_details(booking_id: str) -> Dict[str, Any]:
    """Get full details of a specific booking.

    Args:
        booking_id: The booking ID to look up

    Returns:
        Complete booking details including vendor and service info
    """
    try:
        response = requests.get(
            f"{BACKEND_URL}/bookings/{booking_id}",
            timeout=10,
        )

        if response.status_code == 200:
            return response.json().get("booking", {})
        return {"error": f"Booking {booking_id} not found"}
    except Exception as e:
        return {"error": str(e)}

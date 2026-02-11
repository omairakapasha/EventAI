"""Vendor tools for the Agentic Event Orchestrator.

These tools provide vendor discovery, availability checking, and pricing functionality.
"""

from typing import List, Dict, Any, Optional
from agents import function_tool
from pydantic import BaseModel, Field

# Import existing vendor integration modules
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vendor_integration.vendor_portal_client import VendorPortalClient
from vendor_integration.api_vendor_handler import ApiVendorHandler
from vendor_integration.manual_vendor_handler import ManualVendorHandler


class VendorSearchResult(BaseModel):
    """Result of a vendor search."""
    vendor_id: str = Field(..., description="Unique vendor identifier")
    name: str = Field(..., description="Business name")
    category: str = Field(..., description="Vendor category (e.g., catering, venue)")
    description: str = Field(..., description="Vendor description")
    location: str = Field(..., description="Service location")
    rating: float = Field(..., description="Vendor rating (0-5)")
    price_range: str = Field(..., description="Price range description")


class AvailabilityResult(BaseModel):
    """Result of an availability check."""
    vendor_id: str = Field(..., description="Vendor identifier")
    available: bool = Field(..., description="Whether vendor is available")
    alternative_dates: Optional[List[str]] = Field(None, description="Alternative available dates")


class PricingResult(BaseModel):
    """Result of a pricing query."""
    vendor_id: str = Field(..., description="Vendor identifier")
    service_id: str = Field(..., description="Service identifier")
    price: float = Field(..., description="Price in PKR")
    currency: str = Field(default="PKR", description="Currency")


# Initialize handlers
_client = None
_api_handler = None
_manual_handler = None


def _get_handlers():
    """Lazy initialization of vendor handlers."""
    global _client, _api_handler, _manual_handler
    if _client is None:
        _client = VendorPortalClient()
        _api_handler = ApiVendorHandler(_client)
        _manual_handler = ManualVendorHandler()
    return _api_handler, _manual_handler


@function_tool
def search_vendors(
    query: str,
    location: str,
    category: Optional[str] = None,
    budget_max: Optional[float] = None
) -> List[VendorSearchResult]:
    """Search for vendors matching the query and location.
    
    Args:
        query: The type of vendor to search for (e.g., "catering", "venue")
        location: City or area where the event will be held
        category: Optional specific category filter
        budget_max: Optional maximum budget constraint
    
    Returns:
        List of matching vendors with their details
    """
    api_handler, manual_handler = _get_handlers()
    
    # Search both API and manual vendors
    api_results = api_handler.search_vendors(query, category=category, budget=budget_max)
    manual_results = manual_handler.search_vendors(query, category=category)
    
    # Combine and deduplicate
    all_vendors = []
    seen_ids = set()
    
    for vendor in api_results + manual_results:
        vid = vendor.get('id') or vendor.get('vendor_id')
        if vid and vid not in seen_ids:
            seen_ids.add(vid)
            
            # Extract location from service_areas or default
            loc = location
            if 'service_areas' in vendor:
                loc = vendor['service_areas'][0] if vendor['service_areas'] else location
            
            # Format price range
            services = vendor.get('services', [])
            if services:
                prices = [s.get('price', 0) for s in services if s.get('price')]
                if prices:
                    min_p, max_p = min(prices), max(prices)
                    price_range = f"PKR {min_p:,.0f} - {max_p:,.0f}"
                else:
                    price_range = "Contact for pricing"
            else:
                price_range = vendor.get('pricing_range', 'Contact for pricing')
            
            all_vendors.append(VendorSearchResult(
                vendor_id=vid,
                name=vendor.get('name', vendor.get('business_name', 'Unknown')),
                category=vendor.get('category', 'general'),
                description=vendor.get('description', ''),
                location=loc,
                rating=vendor.get('rating', 3.0),
                price_range=price_range
            ))
    
    return all_vendors[:10]  # Return top 10


@function_tool
def check_availability(
    vendor_id: str,
    event_date: str
) -> AvailabilityResult:
    """Check if a vendor is available on a specific date.
    
    Args:
        vendor_id: The unique vendor identifier
        event_date: The proposed event date (YYYY-MM-DD format)
    
    Returns:
        Availability status and alternative dates if unavailable
    """
    api_handler, _ = _get_handlers()
    
    # Check availability via API
    is_available = api_handler.check_availability(vendor_id, event_date)
    
    alternatives = None
    if not is_available:
        # Generate some alternative dates (simplified)
        from datetime import datetime, timedelta
        base_date = datetime.strptime(event_date, "%Y-%m-%d")
        alternatives = [
            (base_date + timedelta(days=1)).strftime("%Y-%m-%d"),
            (base_date + timedelta(days=7)).strftime("%Y-%m-%d"),
            (base_date + timedelta(days=14)).strftime("%Y-%m-%d")
        ]
    
    return AvailabilityResult(
        vendor_id=vendor_id,
        available=is_available,
        alternative_dates=alternatives if not is_available else None
    )


@function_tool
def get_vendor_details(vendor_id: str) -> Dict[str, Any]:
    """Get detailed information about a specific vendor.
    
    Args:
        vendor_id: The unique vendor identifier
    
    Returns:
        Complete vendor details including services, pricing, contact info
    """
    _, manual_handler = _get_handlers()
    
    # Try manual handler first
    details = manual_handler.get_vendor_details(vendor_id)
    
    if not details and _client:
        # Try API
        details = _client.get_vendor_details(vendor_id)
    
    return details or {"error": f"Vendor {vendor_id} not found"}


@function_tool
def get_pricing(
    vendor_id: str,
    service_id: str
) -> PricingResult:
    """Get the price for a specific vendor service.
    
    Args:
        vendor_id: The vendor identifier
        service_id: The specific service identifier
    
    Returns:
        Pricing information for the service
    """
    api_handler, _ = _get_handlers()
    
    price = api_handler.get_quote(vendor_id, service_id)
    
    return PricingResult(
        vendor_id=vendor_id,
        service_id=service_id,
        price=price,
        currency="PKR"
    )


@function_tool
def get_vendor_recommendations(
    event_type: str,
    location: str,
    budget: float,
    preferences: List[str]
) -> List[VendorSearchResult]:
    """Get AI-recommended vendors based on event requirements.
    
    Args:
        event_type: Type of event (wedding, birthday, corporate, etc.)
        location: Event location
        budget: Total budget in PKR
        preferences: List of specific preferences/requirements
    
    Returns:
        Curated list of recommended vendors for the event
    """
    # Map event types to categories
    category_map = {
        "wedding": ["venue", "catering", "photography", "decoration", "music"],
        "birthday": ["venue", "catering", "decoration", "entertainment"],
        "corporate": ["venue", "catering", "av_equipment"],
        "mehndi": ["venue", "catering", "decoration", "music"],
    }
    
    categories = category_map.get(event_type.lower(), ["venue", "catering"])
    
    recommendations = []
    for category in categories:
        vendors = search_vendors(
            query=category,
            location=location,
            category=category,
            budget_max=budget / len(categories)  # Rough budget split
        )
        # Take top 2 from each category
        recommendations.extend(vendors[:2])
    
    return recommendations

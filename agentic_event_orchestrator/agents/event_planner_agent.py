from typing import Dict, Any
from vendor_integration.api_vendor_handler import ApiVendorHandler
from vendor_integration.manual_vendor_handler import ManualVendorHandler
from scheduler.optimizer import Optimizer
from nlp_processor.structured_output import EventRequirements, EventPlan

class EventPlannerAgent:
    def __init__(self, api_handler: ApiVendorHandler, manual_handler: ManualVendorHandler):
        self.api_handler = api_handler
        self.manual_handler = manual_handler
        self.optimizer = Optimizer()

    def plan_event(self, event_details: EventRequirements) -> EventPlan:
        """
        Orchestrate the planning process: search vendors, optimize, and create a plan.
        """
        print(f"Planning event: {event_details.event_type} for {event_details.attendees} people.")
        
        # 1. Search Vendors
        # Combine results from API and Manual handlers
        vendors = []
        vendors.extend(self.api_handler.search_vendors(query=event_details.event_type))
        vendors.extend(self.manual_handler.search_vendors(query=event_details.event_type))
        
        # 2. Optimize Schedule
        selected_vendors = self.optimizer.optimize_schedule(event_details, vendors)
        
        # 3. Create Plan
        total_cost = sum([1000.0 for _ in selected_vendors]) # Placeholder cost calculation
        
        plan = EventPlan(
            event_details=event_details,
            selected_vendors=selected_vendors,
            total_cost=total_cost,
            schedule=["10:00 AM - Setup", "12:00 PM - Start", "4:00 PM - End"] # Placeholder
        )
        
        return plan

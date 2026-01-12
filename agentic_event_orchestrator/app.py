import chainlit as cl
from agents.orchestration_agent import OrchestrationAgent
import json

# Initialize the orchestration agent
agent = OrchestrationAgent()

@cl.on_chat_start
async def start():
    await cl.Message(content="Welcome to the Agentic Event Orchestrator! How can I help you plan your event today?").send()

@cl.on_message
async def main(message: cl.Message):
    # 1. Process the request to get a plan
    await cl.Message(content="Analyzing your request and checking vendor availability...").send()
    
    try:
        plan = agent.process_request(message.content)
        
        # 2. Present the plan to the user
        plan_details = f"""
        **Event Plan Proposed:**
        - **Type:** {plan.event_details.event_type}
        - **Date:** {plan.event_details.date}
        - **Attendees:** {plan.event_details.attendees}
        - **Estimated Cost:** ${plan.total_cost}
        
        **Selected Vendors:**
        """
        for vendor in plan.selected_vendors:
            plan_details += f"\n- {vendor.vendor_id} ({vendor.reason})"
            
        await cl.Message(content=plan_details).send()
        
        # 3. Ask for approval
        res = await cl.AskActionMessage(
            content="Do you approve this plan?",
            actions=[
                cl.Action(name="approve", value="approve", label="Approve & Book"),
                cl.Action(name="reject", value="reject", label="Reject"),
            ],
        ).send()
        
        if res and res.get("value") == "approve":
            # 4. Execute booking
            result = agent.confirm_booking(plan)
            await cl.Message(content=f"✅ {result}").send()
        else:
            await cl.Message(content="❌ Plan rejected. Please provide feedback or a new request.").send()
            
    except Exception as e:
        await cl.Message(content=f"An error occurred: {str(e)}").send()

class MailProcessingAgent:
    def __init__(self):
        pass

    def send_invitations(self, event_plan: dict, guest_list: list):
        """
        Mock sending invitations.
        """
        print(f"Sending invitations to {len(guest_list)} guests for event on {event_plan.get('event_details', {}).get('date')}")
        return True

    def track_rsvps(self):
        """
        Mock tracking RSVPs.
        """
        return {"accepted": 10, "declined": 2, "pending": 38}

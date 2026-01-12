import os
import json
import google.generativeai as genai
from .structured_output import EventRequirements

class IntentExtractor:
    def __init__(self, api_key: str = None):
        api_key = api_key or os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro')

    def extract_event_details(self, user_input: str) -> EventRequirements:
        """
        Extract structured event details from natural language input.
        """
        prompt = f"""
        Extract the following event details from the user's request and return JSON matching this schema:
        {{
            "event_type": "string",
            "attendees": "integer",
            "date": "YYYY-MM-DD",
            "budget": "float",
            "location": "string (optional)",
            "preferences": ["string"]
        }}

        User Input: "{user_input}"
        
        Return ONLY the JSON object.
        """

        try:
            response = self.model.generate_content(prompt)
            # Clean up response to ensure it's valid JSON
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
            
            data = json.loads(text)
            return EventRequirements(**data)
        except Exception as e:
            print(f"Error extracting intent: {e}")
            raise e

import google.generativeai as genai
from rapidfuzz import fuzz

class DedupeAgent:
    def __init__(self, api_key):
        # Setup the AI
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def check_similarity(self, val1, val2):
        # Math-based similarity (0 to 100)
        return fuzz.token_set_ratio(str(val1), str(val2))

    def ai_decision(self, val1, val2):
        # AI-based reasoning
        prompt = f"Are these two records the same person? Answer 'YES' or 'NO' and give a 1-sentence reason. \n1: {val1}\n2: {val2}"
        response = self.model.generate_content(prompt)
        return response.text

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class OpenAIClient:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found in .env")
        self.client = OpenAI(api_key=self.api_key)
        self.text_model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.stt_model = "whisper-1"
        self.tts_model = "tts-1"

    def get_client(self):
        return self.client

import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from core.provider_openai import OpenAIProvider
from dotenv import load_dotenv

load_dotenv()

def test_provider():
    try:
        provider = OpenAIProvider()
        print(f"Provider initialized: {provider.name}")
        
        # Test STT (mocked base64 for now, just checking if method exists and errors correctly on bad input)
        try:
            provider.stt("invalid_base64", "audio/webm")
        except Exception as e:
            print(f"STT Error (expected): {e}")

        # Test TTS (simple text)
        print("Testing TTS generation...")
        audio = provider.tts("Hello world")
        print(f"TTS Audio keys: {audio.keys()}")
        
        print("Provider test successful.")
        
    except Exception as e:
        print(f"Provider test failed: {e}")

if __name__ == "__main__":
    test_provider()

import sys
import os
sys.path.append(os.getcwd())

from unittest.mock import MagicMock
from core import core_openai

# Mock provider
mock_provider = MagicMock()
core_openai.provider = mock_provider


# Setup mock returns
mock_provider.stt.return_value = "Test User Speech"
mock_provider.llm_stream.return_value = [
    {"type": "delta", "text": "Hello "},
    {"type": "delta", "text": "User."},
    {"type": "usage", "input_tokens": 10, "output_tokens": 5}
]
mock_provider.tts.return_value = {"mime": "audio/mpeg", "base64": "MOCKED_AUDIO"}

# Setup store mock
store = MagicMock()
session_id = "test_session"
store.get_session.return_value = {"session_id": session_id, "output_mode": "audio", "language": "en"}
store.get_summary.return_value = ""
store.get_recent_messages.return_value = []
store.count_messages.return_value = 0


# Test handle_message
msg = {"type": "audio", "audio": {"base64": "...", "mime": "audio/webm"}}
result = core_openai.handle_message(store, session_id, msg, None)

print("RESULT:", result)

if result.get("output", {}).get("user_text") == "Test User Speech":
    print("SUCCESS: user_text found")
else:
    print("FAILURE: user_text missing", result.get("output", {}).get("user_text"))

if result.get("output", {}).get("text") == "Hello User.":
    print("SUCCESS: bot text found")
else:
    print("FAILURE: bot text missing", result.get("output", {}).get("text"))

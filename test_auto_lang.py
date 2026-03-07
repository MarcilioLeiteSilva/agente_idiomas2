import sys
from unittest.mock import MagicMock
from core import core_openai

# Mock provider
mock_provider = MagicMock()
core_openai.provider = mock_provider
mock_provider.llm_stream.return_value = [{"type": "final", "text": "OK"}]

# Test detect_lang_simple
print("Testing detect_lang_simple...")
assert core_openai.detect_lang_simple("Hello world") == "en"
assert core_openai.detect_lang_simple("Bonjour le monde") == "fr"
assert core_openai.detect_lang_simple("Olá mundo") == "pt"
print("SUCCESS: detect_lang_simple passed.")

# Test handle_message with auto
print("Testing handle_message with auto...")
store = MagicMock()
store.get_session.return_value = {"language": "auto", "output_mode": "text"}
store.get_summary.return_value = ""
store.get_recent_messages.return_value = []

mock_provider.stt.return_value = "Hello"

gen = core_openai.handle_message_stream(store, "test", {"type": "text", "text": "Hello"}, None)
# Consuming generator to trigger logic
for _ in gen: pass

# Verify detect_lang_simple was called (implied by execution flow) or check logs?
# Actually we can check if _build_messages was called with 'en'
# But _build_messages is internal.
# We can check what mock_provider.llm_stream received.
args, _ = mock_provider.llm_stream.call_args
messages = args[0]
system_msg = messages[0]["content"]
user_msg = messages[-1]["content"]

print(f"System Prompt: {system_msg[:50]}...")
print(f"User Hint: {user_msg.splitlines()[0]}")

if "Reply in English" in user_msg:
    print("SUCCESS: Language detected as English.")
else:
    print("FAILURE: Language detection failed.", user_msg)

import requests
import base64
import json

URL = "http://127.0.0.1:8000/v1/message"

# Minimalistic valid audio (1 second silence MP3 or OGG)
# Using a text payload first to be safe, then audio if needed. 
# But user issue is with AUDIO.
# Let's try sending text first to see if THAT works (it should).
# Then try sending a dummy audio.

def test_text():
    print("Testing TEXT...")
    payload = {
        "session_id": "debug_session",
        "message": {"type": "text", "text": "Hello"}
    }
    try:
        res = requests.post(URL, json=payload)
        print("Status:", res.status_code)
        print("Response:", json.dumps(res.json(), indent=2))
    except Exception as e:
        print("Error:", e)

def test_audio():
    print("\nTesting AUDIO (valid silence)...")
    # Valid 1-byte WAV 
    # header (44 bytes) + 1 byte data
    b64 = "UklGRipWAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQABAA=="
    payload = {
        "session_id": "debug_session",
        "message": {
            "type": "audio", 
            "audio": {
                "mime": "audio/wav", 
                "base64": b64
            }
        }
    }
    try:
        res = requests.post(URL, json=payload)
        print("Status:", res.status_code)
        try:
            print("Response:", json.dumps(res.json(), indent=2))
        except Exception as e:
            print("Response Text (Not JSON):", res.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    # test_text()
    test_audio()

import urllib.request
import urllib.parse
import json
import time
import sys

API_URL = "http://127.0.0.1:8000"

def set_audio_mode(session_id):
    print(f"Setting audio mode for {session_id}...")
    payload = {
        "session_id": session_id,
        "output_mode": "audio"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{API_URL}/v1/settings", data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as res:
            if res.status == 200:
                print("Settings updated:", json.load(res))
            else:
                print("Error setting audio mode:", res.read().decode())
    except Exception as e:
        print(f"Failed to set audio mode: {e}")

def test_audio_stream_flow():
    session_id = "test_audio_session"
    set_audio_mode(session_id)
    
    print("Testing /v1/stream with text in AUDIO mode...")
    payload = {
        "session_id": session_id,
        "message": {"type": "text", "text": "Tell me a very short story."}
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{API_URL}/v1/stream", data=data, headers={'Content-Type': 'application/json'})
    
    try:
        final_count = 0
        audio_chunks = 0
        
        with urllib.request.urlopen(req) as res:
            if res.status == 200:
                for line in res:
                    decoded = line.decode('utf-8').strip()
                    if decoded.startswith("data: "):
                        content = decoded[6:]
                        try:
                            data = json.loads(content)
                            if data.get("type") == "final":
                                final_count += 1
                                print("\nFINAL event received:", data.keys())
                            elif data.get("type") == "audio_chunk":
                                audio_chunks += 1
                                print("A", end="", flush=True)
                            elif data.get("type") == "delta":
                                print(".", end="", flush=True)
                        except json.JSONDecodeError:
                            pass
                print("\nStream finished.")
                if final_count == 1:
                    print("SUCCESS: Received exactly 1 final event.")
                else:
                    print(f"FAILURE: Received {final_count} final events.")
                
                if audio_chunks > 0:
                    print(f"SUCCESS: Received {audio_chunks} audio chunks.")
                else:
                    print("FAILURE: No audio chunks received.")
            else:
                print("Error:", res.read().decode())
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_audio_stream_flow()

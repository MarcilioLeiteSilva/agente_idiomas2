import urllib.request
import urllib.parse
import json
import time
import sys

API_URL = "http://127.0.0.1:8001"

def test_text_flow():
    print("Testing /v1/message with text...")
    payload = {
        "session_id": "test_session",
        "message": {"type": "text", "text": "Hello, this is a test."}
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{API_URL}/v1/message", data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as res:
            if res.status == 200:
                print("Response:", json.load(res))
            else:
                print("Error:", res.read().decode())
    except Exception as e:
        print(f"Failed to connect: {e}")

def test_stream_flow():
    print("Testing /v1/stream with text...")
    payload = {
        "session_id": "test_session_stream",
        "message": {"type": "text", "text": "Tell me a short joke."}
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{API_URL}/v1/stream", data=data, headers={'Content-Type': 'application/json'})
    
    try:
        final_count = 0
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
                                print("\nFINAL event received:", data)
                            elif data.get("type") == "delta":
                                print(".", end="", flush=True)
                        except json.JSONDecodeError:
                            pass
                print("\nStream finished.")
                if final_count == 1:
                    print("SUCCESS: Received exactly 1 final event.")
                else:
                    print(f"FAILURE: Received {final_count} final events.")
            else:
                print("Error:", res.read().decode())
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    time.sleep(2)
    test_text_flow()
    test_stream_flow()

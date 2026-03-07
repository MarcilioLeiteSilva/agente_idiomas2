import requests
import json

URL = "http://127.0.0.1:8000/v1/credits?session_id=debug"

try:
    res = requests.get(URL)
    print("Status:", res.status_code)
    print("Response:", json.dumps(res.json(), indent=2))
except Exception as e:
    print("Error:", e)

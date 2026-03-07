import os
import sys
from fastapi.testclient import TestClient

# Add project root
sys.path.append(os.getcwd())

from app.main import app

client = TestClient(app)

def test_create_profile():
    print("Testing POST /v1/profile...")
    response = client.post("/v1/profile", json={
        "user_id": "api_test_user",
        "target_language": "de",
        "level": "C1",
        "goals": "Work",
        "correction_style": "heavy"
    })
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {data}")
        if data["target_language"] == "de":
            print("✅ POST /v1/profile passed.")
            return True
    print(f"❌ POST /v1/profile failed: {response.status_code} - {response.text}")
    return False

def test_get_profile():
    print("\nTesting GET /v1/profile...")
    response = client.get("/v1/profile", params={"user_id": "api_test_user"})
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {data}")
        if data["user_id"] == "api_test_user":
            print("✅ GET /v1/profile passed.")
            return True
    print(f"❌ GET /v1/profile failed: {response.status_code} - {response.text}")
    return False

if __name__ == "__main__":
    if test_create_profile() and test_get_profile():
        print("\n🎉 API CHECKS PASSED 🎉")
    else:
        print("\n💥 API CHECKS FAILED 💥")

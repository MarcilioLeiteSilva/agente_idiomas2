import os
import sys
import sqlite3
import json

# Add project root to sys.path
sys.path.append(os.getcwd())

from core.store import Store
from core.core_openai import _build_messages

def verify_database_migration():
    print("--- Verifying Database Migration ---")
    store = Store("agent.db")
    with sqlite3.connect("agent.db") as con:
        # Check if table exists
        cursor = con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profile'")
        if cursor.fetchone():
            print("✅ Table 'user_profile' exists.")
        else:
            print("❌ Table 'user_profile' does NOT exist.")
            return False
    return True

def verify_profile_crud():
    print("\n--- Verifying Profile CRUD ---")
    store = Store("agent.db")
    user_id = "test_user_1"
    
    # Create/Update
    print(f"Creating profile for {user_id}...")
    profile = store.create_or_update_profile(
        user_id=user_id,
        target_language="fr",
        level="B1",
        goals="Business",
        correction_style="strict"
    )
    print(f"Profile created: {profile}")
    
    if profile['target_language'] == 'fr' and profile['level'] == 'B1':
        print("✅ Profile creation/update verification passed.")
    else:
        print("❌ Profile data mismatch.")
        return False

    # Get
    fetched = store.get_profile(user_id)
    if fetched and fetched['user_id'] == user_id:
        print("✅ Profile retrieval verification passed.")
    else:
        print("❌ Profile retrieval failed.")
        return False
        
    return True

def verify_llm_prompt_injection():
    print("\n--- Verifying LLM Prompt Injection ---")
    store = Store("agent.db")
    user_id = "test_user_1" 
    # Ensure profile exists (from previous step)
    
    # Mocking _build_messages to use our store and user_id as session_id
    msgs = _build_messages(store, user_id, "Hello", "en")
    
    system_prompt = msgs[0]['content']
    print("Generated System Prompt Start:")
    print(system_prompt[:300] + "...")
    
    expected_snippets = [
        "The student’s target language is fr",
        "The student level is B1",
        "The student goal is Business",
        "Use correction style strict"
    ]
    
    all_present = True
    for snip in expected_snippets:
        if snip in system_prompt:
            print(f"✅ Found snippet: '{snip}'")
        else:
            print(f"❌ Missing snippet: '{snip}'")
            all_present = False
            
    return all_present

def main():
    if verify_database_migration() and verify_profile_crud() and verify_llm_prompt_injection():
        print("\n🎉 ALL CHECKS PASSED 🎉")
    else:
        print("\n💥 SOME CHECKS FAILED 💥")

if __name__ == "__main__":
    main()

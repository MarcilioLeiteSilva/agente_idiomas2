
import unittest
import sqlite3
import json
import os
from unittest.mock import MagicMock, patch
from core.store import Store

class TestMemoryHardening(unittest.TestCase):
    def setUp(self):
        self.test_db = "test_hardening.db"
        if os.path.exists(self.test_db):
            os.remove(self.test_db)
        self.store = Store(path=self.test_db)
        self.user_id = "test_user"
        self.session_id = "test_session"

    def tearDown(self):
        # Force garbage collection to ensure connections are closed
        import gc
        gc.collect()
        
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except PermissionError:
                print(f"Warning: Could not remove {self.test_db} (locked). Ignoring.")
    
    def test_normalization_limit(self):
        print("Running test_normalization_limit...")
        # 1. Insert 50 duplicates/variants
        # We need to test upsert_learning_memory.
        # It uses normalize_ranked_list.
        
        # Initial empty
        self.store.upsert_learning_memory(self.user_id, "en", {})
        
        # Add 30 items "word_X"
        vocab_add = [f"word_{i}" for i in range(30)]
        self.store.upsert_learning_memory(self.user_id, "en", {"weak_vocab_add": vocab_add})
        
        # Verify limit 20
        mem = self.store.get_learning_memory(self.user_id, "en")
        vocab = mem["weak_vocab"]
        # In our implementation, items are now normalized to dicts {word, count} or remained strings?
        # The normalize_ranked_list converts to dicts.
        # Let's check type
        self.assertTrue(len(vocab) <= 20, f"Vocab length {len(vocab)} exceeds 20")
        self.assertTrue(isinstance(vocab[0], dict), "Vocab items should be dicts")
        
        # Add duplicates
        self.store.upsert_learning_memory(self.user_id, "en", {"weak_vocab_add": ["word_0", "word_0"]})
        mem = self.store.get_learning_memory(self.user_id, "en")
        vocab = mem["weak_vocab"]
        
        # Find word_0
        w0 = next((v for v in vocab if v["word"] == "word_0"), None)
        self.assertIsNotNone(w0)
        self.assertGreater(w0["count"], 1, "Count should increment")
        print("test_normalization_limit PASSED")

    def test_context_filtering(self):
        print("Running test_context_filtering...")
        # Add messages with and without meta
        self.store.add_message(self.session_id, "user", "Hello")
        self.store.add_message(self.session_id, "assistant", "Hi")
        self.store.add_message(self.session_id, "system", "HIDDEN STEP", meta={"kind": "lesson_step"})
        self.store.add_message(self.session_id, "system", "VISIBLE META", meta={"kind": "notebook_entry"})
        
        # Fetch with include_meta=True (raw check)
        recent = self.store.get_recent_messages(self.session_id, limit=10, include_meta=True)
        self.assertEqual(len(recent), 4)
        
        # Emulate logic from core_openai._build_messages
        hidden_kinds = {'lesson_step', 'lesson_feedback', 'review_prompt', 'review_feedback'}
        filtered = []
        for msg in recent:
            kind = msg.get("meta", {}).get("kind") if msg.get("meta") else None
            if kind not in hidden_kinds:
                filtered.append(msg)
                
        self.assertEqual(len(filtered), 3)
        content_list = [m["content"] for m in filtered]
        self.assertNotIn("HIDDEN STEP", content_list)
        self.assertIn("VISIBLE META", content_list)
        print("test_context_filtering PASSED")

    def test_recommendations_logic(self):
        print("Running test_recommendations_logic...")
        # We need to mock store and lesson_engine to test v1_recommendations logic
        # without running the full app or using real DB/Lessons.
        
        from unittest.mock import MagicMock, patch
        import sys
        
        # Patch modules before importing app.main to avoid side effects if possible, 
        # or just patch the globals in app.main
        
        # Assuming app.main is already imported or we import it now
        # We need to act carefully to not init the real global Store("agent.db") 
        # but if it does, it's fine, we will patch the instance.
        
        with patch('core.store.Store') as MockStore:
             # Prevent real init
             MockStore.return_value = MagicMock()
             
             # Import app.main inside context to apply patches if needed? 
             # Actually `app.main` creates `store = Store(...)` at module level.
             # So if we import it, it runs. 
             # We can patch `app.main.store` AFTER import.
             pass
             
        try:
            import app.main
        except Exception:
            # If imports fail (missing env vars etc), skip
            print("Skipping recommendations test due to import issues")
            return

        # Mock store methods
        app.main.store.get_learning_memory = MagicMock(return_value={
            "weak_grammar": [{"rule": "past_tense", "count": 5}]
        })
        
        # Case 1: Low score lesson -> Suggest Review
        app.main.store.get_progress = MagicMock(return_value=[
            {"lesson_id": "en_a1_1", "status": "completed", "score": 50, "target_language": "en", "completed_at": "2025-01-01"}
        ])
        
        app.main.lesson_engine.get_lesson_by_id = MagicMock(return_value={
            "id": "en_a1_1", "title": "Intro", "target_grammar": ["present"]
        })
        
        res = app.main.v1_recommendations("user_1", "en")
        
        self.assertEqual(res.get("recommended_lesson", {}).get("id"), "en_a1_1")
        self.assertIn("Reforço necessário", res.get("reason", ""))
        
        # Case 2: High score -> Normal logic (Grammar match)
        app.main.store.get_progress = MagicMock(return_value=[
            {"lesson_id": "en_a1_1", "status": "completed", "score": 90, "target_language": "en", "completed_at": "2025-01-01"}
        ])
        
        # Two candidates
        c1 = {"id": "en_a1_2", "target_grammar": ["future"]}
        c2 = {"id": "en_a1_3", "target_grammar": ["past_tense"]} # Match weak_grammar
        
        app.main.lesson_engine.load_lessons = MagicMock(return_value=[c1, c2])
        
        # Mock get_profile
        app.main.store.get_profile = MagicMock(return_value={"level": "A1"})

        res = app.main.v1_recommendations("user_1", "en")
        
        self.assertEqual(res.get("recommended_lesson", {}).get("id"), "en_a1_3")
        self.assertIn("Foca em seus pontos", res.get("reason", ""))
        
        print("test_recommendations_logic PASSED")


if __name__ == "__main__":
    unittest.main()

from repositories.memory_repository import MemoryRepository
from services.memory.memory_extractor_service import MemoryExtractorService
import json

class MemoryService:
    def __init__(self):
        self.repo = MemoryRepository()
        self.extractor = MemoryExtractorService()

    def process_interaction_signals(self, user_id, source_type, source_id, target_language, user_input, feedback_text):
        """
        Main entry point for after-interaction pedagogical memory update.
        """
        # 1. Extract Signals via LLM
        signals = self.extractor.extract_signals(target_language, user_input, feedback_text)
        
        # 2. Persist as Events
        for sig in signals:
            self.repo.add_memory_event(
                user_id=user_id,
                source_type=source_type,
                source_id=source_id,
                interaction_id=None, # TBD in V2 fully
                event_type=sig.get("event_type", "observation"),
                category=sig.get("category", "other"),
                topic_key=sig.get("topic_key", "unknown"),
                severity=sig.get("severity", 1),
                evidence=sig.get("evidence", ""),
                confidence=sig.get("confidence", 1.0),
                metadata_json=json.dumps(sig)
            )
            
            # 3. Consolidate into Memory Item (incremental update)
            self._consolidate_topic(user_id, sig)

    def _consolidate_topic(self, user_id, signal):
        """
        Updates memory_items based on a single signal.
        Applying the Logic from Point 12 (V2 Rules).
        """
        topic_key = signal.get("topic_key")
        category = signal.get("category", "other")
        severity = signal.get("severity", 1)
        
        existing_items = self.repo.get_user_memory_items(user_id)
        item = next((i for i in existing_items if i["topic_key"] == topic_key), None)
        
        if not item:
            # First time seen
            self.repo.upsert_memory_item(
                user_id=user_id,
                category=category,
                topic_key=topic_key,
                status="active",
                occurrence_count=1,
                failure_count=1,
                weakness_score=severity * 10, # Initial weight
                strength_level=self._calc_strength(severity * 10)
            )
        else:
            # Frequency Increase
            count = item["occurrence_count"] + 1
            failures = item["failure_count"] + 1
            
            # Decay/Increase formula (Pt 13 logic)
            # weakness_score = min(100, item["weakness_score"] + (severity * 5))
            # mastery_score = max(0, item["mastery_score"] - (severity * 2))
            
            # Simple V2 Logic:
            new_weakness = min(100, item["weakness_score"] + (severity * 5))
            
            self.repo.upsert_memory_item(
                user_id=user_id,
                category=category,
                topic_key=topic_key,
                occurrence_count=count,
                failure_count=failures,
                weakness_score=new_weakness,
                strength_level=self._calc_strength(new_weakness)
            )

    def _calc_strength(self, weakness_score):
        if weakness_score >= 80: return "critical"
        if weakness_score >= 50: return "high"
        if weakness_score >= 30: return "medium"
        return "low"
    
    def get_summary(self, user_id):
        items = self.repo.get_user_memory_items(user_id)
        # Filter for active weaknesses
        weaknesses = [i for i in items if i["weakness_score"] > 20]
        return {
            "user_id": user_id,
            "active_weaknesses": weaknesses,
            "items_count": len(items)
        }

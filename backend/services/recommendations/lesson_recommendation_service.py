from services.memory.memory_service import MemoryService

class LessonRecommendationService:
    def __init__(self):
        self.memory_service = MemoryService()

    def get_next_recommendation(self, user_id, target_language="en"):
        # 1. Fetch Memory Summary
        summary = self.memory_service.get_summary(user_id)
        weaknesses = summary["active_weaknesses"]
        
        # 2. Logic: If there's a critical weakness (>80), recommend Review
        critical = [w for w in weaknesses if w["strength_level"] == "critical"]
        if critical:
            top = critical[0]
            return {
                "next_action": "review",
                "reason": f"Você demonstrou dificuldades críticas em: {top['topic_key']}.",
                "reference": {
                    "type": "memory_item",
                    "topic_key": top["topic_key"]
                },
                "priority": "high"
            }
            
        # 3. Else, recommend next lesson (simplification for now)
        return {
            "next_action": "lesson",
            "reason": "Continue sua jornada! Você está indo bem.",
            "reference": {
                "type": "lesson_catalog"
            },
            "priority": "medium"
        }

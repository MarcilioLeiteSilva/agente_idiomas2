from services.memory.memory_service import MemoryService
from services.ai.scenario_registry import ScenarioRegistry
import logging

logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self):
        self.memory_service = MemoryService()

    def get_recommendations(self, user_id: str, ctx: dict = None) -> dict:
        """
        Analisa a memória do usuário e gera recomendações inteligentes de estudo e prática.
        """
        try:
            # 1. Obter memória pedagógica
            # Se não houver user_id real (ex: guest), retornar defaults
            if not user_id or user_id == "guest":
                return self._get_default_recommendations()

            summary = self.memory_service.get_summary(user_id)
            weaknesses = summary.get("active_weaknesses", [])
            
            # 2. Identificar prioridade máxima (padrão recorrente)
            # Consideramos 'padrão' tópicos com falhas persistentes (failure_count >= 2)
            critical_patterns = [w for w in weaknesses if w.get("failure_count", 0) >= 2]
            
            priority_focus = "Conversação Geral"
            reason = "Continue praticando para ganhar confiança e fluência natural!"
            recommended_action = "roleplay"
            
            if critical_patterns:
                # Escolher o padrão com maior weakness_score (mais crítico)
                top = sorted(critical_patterns, key=lambda x: x.get('weakness_score', 0), reverse=True)[0]
                priority_focus = top['topic_key'].replace("_", " ").title()
                reason = f"Você apresentou instabilidades recorrentes em '{priority_focus}' nas últimas interações. Uma revisão focada ajudará você a destravar esse ponto."
                recommended_action = "micro_review"
            elif weaknesses:
                # Se houver fraquezas mas não persistentes
                top = sorted(weaknesses, key=lambda x: x.get('weakness_score', 0), reverse=True)[0]
                priority_focus = top['topic_key'].replace("_", " ").title()
                reason = f"Notamos que '{priority_focus}' pode ser melhorado. Que tal um pequeno treino sobre isso?"
                recommended_action = "review"

            # 3. Sugerir cenário de Roleplay adequado ao nível
            user_level = (ctx or {}).get("user_level", "A1")
            scenarios = ScenarioRegistry.get_all_scenarios()
            recommended_scenario_id = self._select_scenario_for_level(user_level, list(scenarios.keys()))
            
            scenario_name = scenarios.get(recommended_scenario_id, {}).get("title", "Cenário Prático")

            return {
                "priority_focus": priority_focus,
                "recommended_action": recommended_action,
                "recommended_scenario_id": recommended_scenario_id,
                "recommended_scenario_name": scenario_name,
                "reason": reason
            }
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return self._get_default_recommendations()

    def _select_scenario_for_level(self, level, scenario_ids):
        # Mapeamento básico de nível para cenário ideal
        if not scenario_ids:
            return "restaurant" # Fallback global
            
        if level in ["A1", "A2"]:
            # Prioridade para situações do dia a dia
            if "airport_checkin" in scenario_ids: return "airport_checkin"
            if "restaurant" in scenario_ids: return "restaurant"
        elif level == "B1":
            if "restaurant" in scenario_ids: return "restaurant"
        
        # Níveis altos ou se nada acima bater
        if "job_interview" in scenario_ids: return "job_interview"
        return scenario_ids[0] if scenario_ids else "restaurant"

    def _get_default_recommendations(self):
        return {
            "priority_focus": "Conversação Prática",
            "recommended_action": "roleplay",
            "recommended_scenario_id": "restaurant",
            "recommended_scenario_name": "Restaurante",
            "reason": "Você está começando agora! Praticar situações reais é a melhor forma de aprender."
        }

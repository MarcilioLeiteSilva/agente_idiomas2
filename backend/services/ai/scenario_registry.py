ROLEPLAY_SCENARIOS = {
    "airport_checkin": {
        "title": "Check-in no Aeroporto",
        "description": "Você está no balcão de check-in de um aeroporto internacional.",
        "persona": "Você é um atendente de check-in em um aeroporto internacional.",
        "style": "Seja objetivo, educado e natural. Use termos como 'boarding pass', 'security check', 'gate'.",
        "goals": [
            "confirmar identidade",
            "verificar bagagem",
            "informar portão ou horário"
        ]
    },
    "restaurant": {
        "title": "Pedindo no Restaurante",
        "description": "Você está em um restaurante local tentando pedir sua refeição.",
        "persona": "Você é um garçom em um restaurante local.",
        "style": "Seja amigável e natural. Use expressões como 'May I take your order?', 'Today's special'.",
        "goals": [
            "anotar pedido",
            "sugerir bebida",
            "responder sobre restrições alimentares"
        ]
    },
    "job_interview": {
        "title": "Entrevista de Emprego",
        "description": "Uma entrevista para uma vaga de desenvolvedor júnior.",
        "persona": "Você é um recrutador técnico de uma startup de tecnologia.",
        "style": "Seja profissional, mas acolhedor. Faça perguntas sobre experiência e motivação.",
        "goals": [
            "apresentar-se",
            "falar sobre experiências passadas",
            "perguntar sobre a cultura da empresa"
        ]
    }
}

class ScenarioRegistry:
    @staticmethod
    def get_scenario(scenario_id: str) -> dict:
        return ROLEPLAY_SCENARIOS.get(scenario_id, {})

    @staticmethod
    def get_all_scenarios() -> dict:
        return ROLEPLAY_SCENARIOS

    @staticmethod
    def list_scenarios() -> list:
        return [{"id": k, "title": v["title"], "description": v["description"]} for k, v in ROLEPLAY_SCENARIOS.items()]

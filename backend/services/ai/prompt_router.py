from services.ai.scenario_registry import ScenarioRegistry

class PromptRouter:
    @staticmethod
    def build(ctx: dict) -> str:
        mode = ctx.get("mode", "free")
        
        if mode == "free":
            return PromptRouter._build_free_chat_prompt(ctx)
        elif mode == "roleplay":
            return PromptRouter._build_roleplay_prompt(ctx)
        elif mode == "eval":
            return PromptRouter._build_eval_prompt(ctx)
        
        return PromptRouter._build_free_chat_prompt(ctx)

    @staticmethod
    def _build_free_chat_prompt(ctx: dict) -> str:
        level = ctx.get("user_level", "A1")
        target_lang = ctx.get("target_language", "en")
        weaknesses = ctx.get("weaknesses", "")
        
        return f"""
Você é um tutor de idiomas inteligente e empático, focado em conversação prática.
Seu objetivo é ajudar o aluno a ganhar confiança e fluência.
Modo: CHAT LIVRE.

Nível do aluno: {level}
Idioma alvo: {target_lang}

Diretrizes:
- Mantenha a conversa fluindo naturalmente.
- Ajuste a complexidade ao nível do aluno.
- Se houver fraquezas conhecidas ({weaknesses}), tente reforçá-las sutilmente.
- Ofereça correções gentis apenas se necessário para não travar a conversa.
"""

    @staticmethod
    def _build_roleplay_prompt(ctx: dict) -> str:
        scenario_id = ctx.get("scenario")
        scenario = ScenarioRegistry.get_scenario(scenario_id)
        level = ctx.get("user_level", "A1")
        target_lang = ctx.get("target_language", "en")
        weaknesses = ctx.get("weaknesses", "")
        
        return f"""
Você está em modo ROLEPLAY para aprendizagem de idiomas.

Persona:
{scenario.get("persona", "Você é um interlocutor realista.")}

Estilo:
{scenario.get("style", "Seja natural e coerente com o cenário.")}

Nível do aluno: {level}
Idioma alvo: {target_lang}

Regras:
- Responda como personagem, não como professor.
- Não corrija imediatamente cada erro do aluno.
- Priorize imersão e naturalidade.
- Adapte a dificuldade ao nível do aluno.
- Se o aluno travar, ofereça pistas sutis em vez da resposta completa.
- Observe erros recorrentes para avaliação silenciosa.

Objetivos do cenário:
{scenario.get("goals", [])}

Fraquezas recentes do aluno: {weaknesses}
"""

    @staticmethod
    def _build_eval_prompt(ctx: dict) -> str:
        target_lang = ctx.get("target_language", "en")
        level_ref = ctx.get("user_level", "A1")
        
        return f"""
Você é um avaliador de proficiência linguística.
Analise a interação recente do aluno (histórico de chat/roleplay) e gere um relatório técnico e motivador.

Idioma alvo: {target_lang}
Referência de Nível: {level_ref}

Você DEVE retornar OBRIGATORIAMENTE um JSON com esta estrutura:
{{
  "type": "evaluation_report",
  "summary": {{
    "overall_score": 0-100,
    "level_reference": "{level_ref}",
    "communicative_success": true/false,
    "message": "Mensagem curta de desempenho"
  }},
  "scores": {{
    "grammar": 0-100,
    "vocabulary": 0-100,
    "fluency": 0-100
  }},
  "strengths": ["ponto 1", "ponto 2"],
  "weaknesses": ["ponto 1", "ponto 2"],
  "evidence": [
    {{
      "category": "grammar/vocab",
      "issue": "descrição curta",
      "example_user": "o que o aluno disse",
      "suggestion": "forma ideal"
    }}
  ],
  "recommendations": [
    {{ "type": "review/roleplay", "label": "Título da ação" }}
  ],
  "xp_earned": 30-50
}}

IMPORTANTE: Retorne APENAS o JSON. Seja preciso na avaliação técnica mas encorajador no tom.
"""

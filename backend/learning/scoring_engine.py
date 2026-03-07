import json
from typing import Dict, Any, List
from core.provider_openai import OpenAIProvider

class ScoringEngine:
    def __init__(self):
        self.provider = OpenAIProvider()

    def evaluate_response(self, user_input: str, lesson_context: Dict[str, Any], target_language: str) -> Dict[str, Any]:
        """
        Avalia a resposta do usuário usando LLM.
        Retorna: {
            "grammar_score": 0-100,
            "vocabulary_score": 0-100,
            "fluency_score": 0-100,
            "overall_score": 0-100,
            "corrections": ["Corrected sentence 1", ...],
            "feedback_text": "Explanatory feedback..."
        }
        """
        
        # Montar Prompt de Avaliação
        lesson_title = lesson_context.get("title", "Unknown Lesson")
        objective = lesson_context.get("objective", "")
        target_vocab = ", ".join(lesson_context.get("target_vocab", []))
        target_grammar = ", ".join(lesson_context.get("target_grammar", []))
        current_step_instr = lesson_context.get("current_step_instruction", "")

        system_prompt = f"""
You are a strict but helpful language tutor evaluating a student's response.
Target Language: {target_language}
Lesson: {lesson_title}
Objective: {objective}
Target Vocab: {target_vocab}
Target Grammar: {target_grammar}
Current Instruction: {current_step_instr}

Analyze the Student Input: "{user_input}"

Provide a JSON output with the following keys:
- grammar_score (0-100): correctness of grammar.
- vocabulary_score (0-100): usage of target vocab and appropriateness.
- fluency_score (0-100): naturalness and flow.
- overall_score (0-100): weighted average.
- corrections (list of strings): correct versions of the input if errors exist.
- feedback_text (string): brief, encouraging feedback explaining the score and corrections in the target language or English (if beginner).

IMPORTANT: Return ONLY valid JSON. No markdown formatting.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ]

        try:
            # Usando provider.client diretamente pois llm_stream é generator
            # Ou adaptar llm_stream para pegar tudo. 
            # Como provider_openai expõe client, vamos usar completions normal para simplicidade e JSON mode se disponível (mas prompt instruction costuma bastar)
            
            # Vamos usar o client do provider (hacky, mas funcional dado o provider_openai.py)
            response = self.provider.client.chat.completions.create(
                model=self.provider.text_model,
                messages=messages,
                temperature=0.3, # Baixa temperatura para avaliação consistente
                response_format={ "type": "json_object" } # Forçar JSON
            )
            
            content = response.choices[0].message.content
            result = json.loads(content)
            return result
            
        except Exception as e:
            print(f"Error evaluating response: {e}")
            # Fallback seguro
            return {
                "grammar_score": 0,
                "vocabulary_score": 0,
                "fluency_score": 0,
                "overall_score": 0,
                "corrections": [],
                "feedback_text": "Error generating evaluation."
            }


import random
import uuid

class ExerciseEngine:
    def generate_review_items(self, user_id: str, learning_memory: dict, target_lang: str = "en") -> dict:
        """
        Gera uma lista de exercícios para micro-review baseada na memória de aprendizado.
        """
        weak_vocab = learning_memory.get("weak_vocab", [])
        weak_grammar = learning_memory.get("weak_grammar", [])
        
        items = []
        
        # 1. Vocab Exercises (Fill Blank / Translate)
        # Priorizar top 5
        for word in weak_vocab[:5]:
            # Simple template generation (na prática usaria LLM se tivesse budget, aqui templates simples)
            # Como não temos frases de exemplo salvas, vamos pedir ao aluno para TRADUZIR a palavra ou criar uma frase.
            # Melhor: "Translate this word to [Target]"
            
            items.append({
                "id": str(uuid.uuid4()),
                "type": "translate_word",
                "prompt": f"Como se diz **'{word}'** em {target_lang}?", # Simplificação: assumindo word seja a palavra alvo, o prompt fica estranho.
                # Se 'word' é em target lang (ex: 'Schedule'), o exercício é "Translate 'Schedule' to Portuguese" ou "Use 'Schedule' in a sentence".
                # Vamos assumir "Use in sentence" para ser mais robusto, ou "Translate to native".
                # Mas para simplificar a validação automática, vamos fazer "Translate [Native] -> [Target]" se tivéssemos a tradução.
                # Como só temos a palavra em Target, vamos fazer "Escreva uma frase usando '{word}'."
                "prompt": f"Escreva uma frase em {target_lang} usando a palavra: **{word}**",
                "expected_focus": word,
                "template": "sentence_creation"
            })
            
        # 2. Grammar Exercises
        # Para gramática, sem LLM on-the-fly é difícil gerar fill-in-the-blank específico.
        # Vamos gerar prompts abertos focados no tópico.
        for topic in weak_grammar[:3]:
            items.append({
                "id": str(uuid.uuid4()),
                "type": "grammar_practice",
                "prompt": f"Escreva uma frase demonstrando o uso correto de: **{topic}**.",
                "expected_focus": topic,
                "template": "open_grammar"
            })
            
        # Fallback se não tiver itens suficientes
        if len(items) < 3:
            default_words = ["Hello", "World", "Friend"] # Placeholder
            for w in default_words:
                 items.append({
                    "id": str(uuid.uuid4()),
                    "type": "translate_word", 
                    "prompt": f"Escreva uma frase em {target_lang} usando: **{w}**",
                    "expected_focus": w,
                    "template": "sentence_creation"
                })

        # Shuffle and limit
        random.shuffle(items)
        return {
            "items": items[:5],
            "focus_summary": {
                "vocab": weak_vocab[:5],
                "grammar": weak_grammar[:3]
            }
        }

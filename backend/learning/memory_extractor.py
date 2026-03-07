
import json

def extract_learning_signals(lesson_context: dict, user_input: str, scoring_result: dict):
    """
    Analisa a resposta do aluno e o feedback do tutor para extrair sinais de aprendizado.
    Retorna um dicionário (patch) com:
    - weak_vocab_add: lista de palavras
    - weak_grammar_add: lista de tópicos gramaticais
    - recurring_error_add: lista de erros
    - last_feedback: resumo do feedback
    """
    
    signals = {
        "weak_vocab_add": [],
        "weak_grammar_add": [],
        "recurring_error_add": [],
        "last_feedback": {
            "score": scoring_result.get("overall_score", 0),
            "text": scoring_result.get("feedback_text", "")
        }
    }
    
    feedback_text = scoring_result.get("feedback_text", "").lower()
    corrections = scoring_result.get("corrections", [])
    
    # 1. Analisar Correções para Gramática
    # Heurística simples: palavras-chave no feedback
    grammar_keywords = {
        "verb tense": "Verb Tenses",
        "conjugation": "Verb Conjugation",
        "article": "Articles",
        "preposition": "Prepositions",
        "gender": "Gender Agreement",
        "plural": "Pluralization",
        "word order": "Word Order"
    }
    
    for kw, topic in grammar_keywords.items():
        if kw in feedback_text:
            signals["weak_grammar_add"].append(topic)
            
    # 2. Analisar Vocabulário
    # Se o target_vocab da lição não foi usado ou foi corrigido
    target_vocab = lesson_context.get("target_vocab", [])
    
    # Normalizar input
    user_input_lower = user_input.lower()
    
    # Se o score foi baixo e tinha vocab alvo, talvez tenha errado o vocab
    if scoring_result.get("overall_score", 0) < 70:
        for word in target_vocab:
            # Se a palavra alvo não está no input, pode ser um ponto fraco (ou puramente esquecimento)
            # Vamos ser conservadores: só marcar se o feedback mencionar "vocabulary" ou "word"
            if "word" in feedback_text or "vocabulary" in feedback_text:
                if word.lower() not in user_input_lower:
                    signals["weak_vocab_add"].append(word)

    # 3. Erros Recorrentes (extraídos das correções estruturadas se houver)
    # Se `corrections` for uma lista de strings ou objetos
    if isinstance(corrections, list):
        for corr in corrections:
            if isinstance(corr, str):
                signals["recurring_error_add"].append(corr)
            elif isinstance(corr, dict) and "error_type" in corr:
                signals["recurring_error_add"].append(corr.get("error_type"))

    return signals

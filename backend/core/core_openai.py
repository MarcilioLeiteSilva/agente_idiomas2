import os
import base64
import re
import json
from typing import Generator
from core.provider_openai import OpenAIProvider
from core.logger import setup_logger
from services.ai.prompt_router import PromptRouter
from learning.scoring_engine import ScoringEngine
from services.memory.memory_service import MemoryService
from services.ai.recommendation_engine import RecommendationEngine

# Singletons
provider = OpenAIProvider()
scoring_engine = ScoringEngine()
memory_service = MemoryService()
recommendation_engine = RecommendationEngine()

MENU_MAIN = {
    "type": "menu",
    "title": "Configurações",
    "items": [
        {"id": "set_mode_text", "label": "📝 Texto"},
        {"id": "set_mode_audio", "label": "🎤 Áudio"},
        {"id": "set_lang_menu", "label": "🌍 Idioma"},
    ],
}

MENU_LANG = {
    "type": "menu",
    "title": "Idioma",
    "items": [
        {"id": "set_lang_pt", "label": "🇧🇷 Português"},
        {"id": "set_lang_en", "label": "🇺🇸 English"},
        {"id": "set_lang_fr", "label": "🇫🇷 Français"},
        {"id": "set_lang_auto", "label": "🔁 Automático"},
    ],
}

def is_menu_command(text: str) -> bool:
    return text.strip().lower() in {"menu", "config", "configurar", "idioma", "modo", "settings"}

def detect_lang_simple(text: str) -> str:
    t = text.lower()
    if re.search(r"\b(please|hello|thanks|what|how|help)\b", t):
        return "en"
    if re.search(r"\b(bonjour|merci|quoi|comment|aide)\b", t):
        return "fr"
    return "pt"

def _system_prompt():
    return (
        "Você é um tutor de idiomas inteligente e empático, focado em conversação prática. "
        "Seu objetivo é ajudar o aluno a ganhar confiança e fluência. "
        "Tente manter a conversa fluindo naturalmente, fazendo perguntas abertas. "
        "Ajuste sua complexidade de acordo com o nível do aluno."
    )

def _get_level_instruction(level: str, target_lang: str):
    # Map 'Básico', 'Intermediário', 'Avançado' or CEFR codes
    lvl = level.upper()
    
    if lvl in ["A1", "A2", "BÁSICO"]:
        return (
            "Nível: BÁSICO. Use frases curtas e vocabulário simples (A1/A2). "
            "Sempre forneça uma tradução entre parênteses para o português em frases complexas. "
            "Foqué em vocabulário de sobrevivência e situações cotidianas."
        )
    elif lvl in ["B1", "B2", "INTERMEDIÁRIO"]:
        return (
            "Nível: INTERMEDIÁRIO. Use frases mais estruturadas e vocabulário variado (B1/B2). "
            "Introduza gradualmente expressões idiomáticas. "
            "Traduza apenas termos técnicos ou gírias difíceis. Foque em fluência e gramática média."
        )
    elif lvl in ["C1", "C2", "AVANÇADO"]:
        return (
            "Nível: AVANÇADO. Fale como um nativo (C1/C2). Use gírias, phrasal verbs e expressões complexas. "
            "Não forneça traduções. Desafie o aluno com debates, temas abstratos e sutilezas culturais."
        )
    return ""

def _lang_hint(lang: str) -> str:
    return {
        "pt": "Responda em português do Brasil.",
        "en": "Reply in English.",
        "fr": "Réponds en français.",
    }.get(lang, "Responda em português do Brasil.")

# IMPORTE NO TOPO DO ARQUIVO (ajuste se necessário, mas como é função, podemos importar dentro ou garantir em topo global)
from learning.lesson_engine import LessonEngine
lesson_engine = LessonEngine()

def _build_messages(store, session_id: str, user_text: str, lang: str, mode: str = "free", scenario: str = None, user_level: str = None, target_language: str = None):
    summary = store.get_summary(session_id)
    # ✅ UPDATE (Fase 1 - Passo 9): Include meta and filter
    recent_all = store.get_recent_messages(session_id, limit=20, include_meta=True)
    
    # Filter hidden messages (automated feedback)
    hidden_kinds = {'lesson_step', 'lesson_feedback', 'review_prompt', 'review_feedback'}
    
    recent_filtered = []
    # We fetched 20 to hope for ~12 visible. 
    # Logic: Keep if meta is None or meta.kind not in hidden
    for msg in recent_all:
        kind = msg.get("meta", {}).get("kind") if msg.get("meta") else None
        if kind not in hidden_kinds:
            recent_filtered.append({"role": msg["role"], "content": msg["content"]})
            
    # Slice to original limit if needed, e.g. 12
    recent = recent_filtered[-12:]
    
    # ✅ NOVO: Busca perfil do aluno (assumindo session_id == user_id no contexto local)
    profile = store.get_profile(session_id)
    
    # ... (rest of the function remains mostly same, just updating variables if needed)
    
    # ✅ NOVO: Busca estado da lição (Fase 1 - Passo 3)
    lesson_state = store.get_lesson_state(session_id)
    
    # ✅ NOVO: Busca memória de aprendizado (Fase 1 - Passo 6)
    target_lang = "en"
    if profile: target_lang = profile["target_language"]
    
    # ... (learning memory fetching with normalization awareness)
    learning_mem = store.get_learning_memory(session_id, target_lang)
    
    # ✅ REPLACED: Use PromptRouter instead of hardcoded _system_prompt
    ctx = {
        "mode": mode,
        "scenario": scenario,
        "user_level": user_level or (profile.get("level") if profile else "A1"),
        "target_language": target_language or (profile.get("target_language") if profile else "en"),
        "weaknesses": "" # TODO: Extract from learning_mem
    }
    
    # Extract weaknesses for prompt
    if learning_mem:
        grammar_items = learning_mem.get("weak_grammar", [])
        weak_grammar = [g["rule"] for g in grammar_items] if grammar_items and isinstance(grammar_items[0], dict) else grammar_items
        ctx["weaknesses"] = ", ".join(weak_grammar[:5])

    base_prompt = PromptRouter.build(ctx)
    
    if profile:
        level_instruction = _get_level_instruction(profile.get('level', 'A1'), target_lang)
        profile_instruction = (
            f"DIRETRIZES DO ALUNO:\n"
            f"- Idioma Alvo: {profile['target_language']}\n"
            f"- Nível Atual: {profile['level']}\n"
            f"- Estilo de Correção: {profile['correction_style']}\n"
            f"{level_instruction}"
        )
        base_prompt = f"{base_prompt}\n\n{profile_instruction}"

    # Injeção de Memória de Aprendizado (Normalized items are dicts now, need extraction)
    if learning_mem:
        # Extract weak vocab strings
        vocab_items = learning_mem.get("weak_vocab", [])
        weak_vocab = [v["word"] for v in vocab_items] if vocab_items and isinstance(vocab_items[0], dict) else vocab_items
        
        grammar_items = learning_mem.get("weak_grammar", [])
        weak_grammar = [g["rule"] for g in grammar_items] if grammar_items and isinstance(grammar_items[0], dict) else grammar_items
        
        error_items = learning_mem.get("recurring_errors", [])
        recurring_errors = [e["error"] for e in error_items] if error_items and isinstance(error_items[0], dict) else error_items
        
        mem_prompt = ""
        if weak_vocab or weak_grammar or recurring_errors:
            mem_prompt = "\n\n[STUDENT DATA]\n"
            if weak_vocab:
                mem_prompt += f"Prioritize practice using these words: {', '.join(weak_vocab[:10])}.\n"
            if weak_grammar:
                mem_prompt += f"Student struggles with: {', '.join(weak_grammar[:5])}. Offer gentle corrections on these.\n"
            if recurring_errors:
                mem_prompt += f"Watch out for recurring errors: {', '.join(recurring_errors[:5])}.\n"
            
            base_prompt += mem_prompt

    # Injeção de Contexto da Lição
    if lesson_state and lesson_state["active"]:
        # Precisamos dos detalhes da lição.
        # store.get_progress tem target_language para recuperar o arquivo
        # mas por eficiência, vamos tentar inferir ou usar LessonEngine.
        # Infelizmente get_lesson_state nao tem target_lang. 
        # Vamos assumir perfil ou progress.
        
        # Estratégia: Tentar pegar lição pelo ID via LessonEngine (busca global simples ou cache seria melhor)
        # O lesson_engine.get_lesson_by_id precisa de target_lang.
        # Vamos usar o do perfil se disponivel
        tgt_lang = profile["target_language"] if profile else "en"
        
        # Pode haver mismatch se aluno mudou target_lang mas lição antiga ta ativa.
        # Idealmente user_lesson_state teria target_lang, mas não pus na task.
        # Vamos buscar no progress:
        progress_list = store.get_progress(session_id)
        # Acha o progress dessa lição
        prog = next((p for p in progress_list if p["lesson_id"] == lesson_state["lesson_id"]), None)
        if prog:
            tgt_lang = prog["target_language"]
            
        lesson = lesson_engine.get_lesson_by_id(tgt_lang, lesson_state["lesson_id"])
        
        if lesson:
            step_idx = lesson_state["step_index"]
            steps = lesson.get("script_steps", [])
            current_instr = steps[step_idx] if step_idx < len(steps) else "Review and finish."
            
            lesson_prompt = (
                f"\n\n[LESSON MODE ACTIVE]\n"
                f"You are guiding the student through a structured lesson: '{lesson['title']}'.\n"
                f"Objective: {lesson['objective']}\n"
                f"Target Vocab: {', '.join(lesson.get('target_vocab', []))}\n"
                f"Target Grammar: {', '.join(lesson.get('target_grammar', []))}\n"
                f"CURRENT STEP INSTRUCTION FOR TUTOR: {current_instr}\n"
                f"Follow this instruction strictly. Do not deviate to general chat unless asked.\n"
                f"After your response, if appropriate, ask the student to proceed to the next step."
            )
            base_prompt += lesson_prompt

    msgs = [{"role": "system", "content": base_prompt}]
    if summary:
        msgs.append({"role": "system", "content": f"Memória resumida da conversa:\n{summary}"})
    msgs.extend(recent)
    msgs.append({"role": "user", "content": f"{_lang_hint(lang)}\n\n{user_text}"})
    return msgs

def _maybe_update_summary(store, session_id: str):
    count = store.count_messages(session_id)
    if count < 20 or (count % 20) != 0:
        return

    summary_old = store.get_summary(session_id)
    recent = store.get_recent_messages(session_id, limit=20)

    summarizer = [
        {"role": "system", "content": (
            "Resuma a conversa em até 10 linhas, focando em preferências, decisões e contexto útil. "
            "Não inclua detalhes sensíveis. Seja objetivo."
        )},
        {"role": "user", "content": (
            f"Resumo anterior (se houver):\n{summary_old}\n\n"
            f"Últimas mensagens:\n{json.dumps(recent, ensure_ascii=False)}\n\n"
            "Gere um NOVO resumo compacto."
        )}
    ]

    # Usando o provider para resumo
    full_summary = ""
    for chunk in provider.llm_stream(summarizer):
        if chunk.get("type") == "delta":
            text_val = chunk.get("text")
            if isinstance(text_val, str):
                full_summary += text_val
    
    new_summary = full_summary.strip()
    if new_summary:
        store.upsert_summary(session_id, new_summary)

def handle_action(store, session_id: str, action_id: str):
    if action_id == "set_mode_text":
        sess = store.upsert_session(session_id, output_mode="text")
        return {"output": {"type": "text", "text": "✅ Modo definido: TEXTO."}, "ui": MENU_MAIN, "state": sess}

    if action_id == "set_mode_audio":
        sess = store.upsert_session(session_id, output_mode="audio")
        return {"output": {"type": "text", "text": "✅ Modo definido: ÁUDIO."}, "ui": MENU_MAIN, "state": sess}

    if action_id == "set_lang_menu":
        sess = store.get_session(session_id)
        current_lang = sess.get("language", "pt")
        
        items = [
            {"id": "set_lang_pt", "label": "🇧🇷 Português", "value": "pt"},
            {"id": "set_lang_en", "label": "🇺🇸 English", "value": "en"},
            {"id": "set_lang_fr", "label": "🇫🇷 Français", "value": "fr"},
            {"id": "set_lang_auto", "label": "🔁 Automático", "value": "auto"},
        ]
        
        # Mark active
        for item in items:
            if item["value"] == current_lang:
                item["active"] = True
            else:
                item["active"] = False
                
        menu_lang = {
            "type": "menu",
            "title": "Idioma",
            "items": items
        }
        return {"output": {"type": "text", "text": "Escolha o idioma:"}, "ui": menu_lang, "state": sess}

    if action_id == "set_lang_pt":
        sess = store.upsert_session(session_id, language="pt")
        return {"output": {"type": "text", "text": "✅ Idioma: Português."}, "ui": MENU_MAIN, "state": sess}

    if action_id == "set_lang_en":
        sess = store.upsert_session(session_id, language="en")
        return {"output": {"type": "text", "text": "✅ Language: English."}, "ui": MENU_MAIN, "state": sess}

    if action_id == "set_lang_fr":
        sess = store.upsert_session(session_id, language="fr")
        return {"output": {"type": "text", "text": "✅ Langue : Français."}, "ui": MENU_MAIN, "state": sess}

    if action_id == "set_lang_auto":
        sess = store.upsert_session(session_id, language="auto")
        return {"output": {"type": "text", "text": "✅ Idioma: Automático."}, "ui": MENU_MAIN, "state": sess}

    sess = store.get_session(session_id)
    return {"output": {"type": "text", "text": "Ação não reconhecida."}, "state": sess}

def handle_message(store, session_id: str, message: dict, ui_action: dict | None, 
                   mode: str = "free", scenario: str = None, evaluation: bool = False,
                   user_level: str = None, target_language: str = None, native_language: str = None):
    # Fallback para o modo stream se não for uma ação de UI simples
    if ui_action and ui_action.get("action_id"):
        return handle_action(store, session_id, ui_action["action_id"])
    
    gen = handle_message_stream(
        store, session_id, message, ui_action,
        mode=mode, scenario=scenario, evaluation=evaluation,
        user_level=user_level, target_language=target_language, native_language=native_language
    )
    last_final = None
    last_error = None
    transcription = None
    
    audio_parts = []
    
    for chunk in gen:
        ctype = chunk.get("type")
        if ctype == "transcription":
            transcription = chunk.get("text")
        elif ctype == "audio_chunk":
            # Coleta partes do áudio para resposta única
            audio_data = chunk.get("audio")
            if audio_data and "base64" in audio_data:
                try:
                    audio_parts.append(base64.b64decode(audio_data["base64"]))
                except Exception as e:
                    print(f"Erro ao decodificar chunk de áudio: {e}")
        elif ctype == "final":
            last_final = chunk
        elif ctype == "evaluation_report":
            return chunk
        elif ctype == "error":
            last_error = chunk
    
    if last_final and isinstance(last_final, dict):
        response = {
            "output": {
                "type": "text", 
                "text": last_final.get("text"), 
                "user_text": transcription 
            }, 
            "state": last_final.get("state")
        }

        # Se houver áudio acumulado, monta o blob final
        if audio_parts:
            full_audio = b"".join(audio_parts)
            response["output"]["audio"] = {
                "mime": "audio/mpeg", 
                "base64": base64.b64encode(full_audio).decode("utf-8")
            }
            response["output"]["type"] = "audio"
            
        return response
    
    if last_error and isinstance(last_error, dict):
        return {"error": last_error.get("message", "Erro desconhecido")}
        
    return {"error": "Sem resposta do servidor"}

def split_sentences(text: str) -> list[str]:
    # Divisão aprimorada focando em pontuação clássica
    if not text: return []
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def handle_message_stream(store, session_id: str, message: dict, ui_action: dict | None,
                          mode: str = "free", scenario: str = None, evaluation: bool = False,
                          user_level: str = None, target_language: str = None, native_language: str = None):
    from core.logger import setup_logger
    logger = setup_logger("core_openai")
    
    # sess = store.get_session(session_id)
    # credits = store.get_credits(session_id)
    # logger.info(f"Sessão: {session_id} | Modo: {sess['output_mode']} | Créditos: {credits}")
    
    # if credits <= 0:
    #     logger.warning(f"Créditos insuficientes para {session_id}")
    #     yield {"type": "error", "message": "Créditos insuficientes. Por favor, recarregue."}
    #     return

    sess = store.get_session(session_id)
    logger.info(f"Sessão: {session_id} | Modo: {sess['output_mode']} (Créditos desativados)")

    if ui_action and ui_action.get("action_id"):
        logger.info(f"Ação UI: {ui_action.get('action_id')}")
        out = handle_action(store, session_id, ui_action["action_id"])
        yield {"type": "final", **out}
        return

    # entrada -> texto
    user_text = ""
    if message.get("type") == "audio":
        audio = message.get("audio") or {}
        try:
            logger.info("Processando STT...")
            user_text = provider.stt(audio.get("base64", ""), audio.get("mime", "audio/ogg"))
            logger.info(f"STT Result: '{user_text}'")
            if not user_text.strip():
                yield {"type": "error", "message": "Não foi possível entender o áudio. Tente falar mais alto ou claro."}
                return
            yield {"type": "transcription", "text": user_text}
            store.add_usage_log(session_id, provider.name, provider.stt_model, "stt", 0, 1, 5)
        except Exception as e:
            logger.error(f"Erro no STT: {e}")
            yield {"type": "error", "message": f"Erro no reconhecimento de voz: {str(e)}"}
            return
    else:
        user_text = message.get("text") or ""
        logger.info(f"Mensagem de texto: '{user_text}'")

    if is_menu_command(user_text):
        yield {"type": "final", "output": {"type": "text", "text": "Escolha uma opção:"}, "ui": MENU_MAIN, "state": sess}
        return

    lang = sess["language"]
    if lang == "auto":
        lang = detect_lang_simple(user_text)

    messages = _build_messages(
        store, session_id, user_text, lang, 
        mode=mode, scenario=scenario, user_level=user_level, target_language=target_language
    )
    
    # ✅ NOVO: Injetar recomendações na memória se for modo Eval
    recommendations_data = None
    if mode == "eval":
        recommendations_data = recommendation_engine.get_recommendations(session_id, {"user_level": user_level})
        # Podemos injetar isso como um "Contexto de Recomendação" no prompt via _build_messages se quisermos
        # Por enquanto, usaremos para enriquecer o JSON final
    full_text = ""
    sentence_buffer = ""
    sentences_processed = 0

    logger.info("Iniciando streaming do LLM...")
    # Streaming do LLM
    try:
        for chunk in provider.llm_stream(messages):
            if chunk.get("type") == "delta":
                delta_val = chunk.get("text")
                if isinstance(delta_val, str):
                    full_text += delta_val
                    sentence_buffer += delta_val
                    yield {"type": "delta", "text": delta_val}
                
                # Sentence-Streaming TTS
                if sess["output_mode"] == "audio":
                    logger.info(f"Modo áudio ativo. Buffer atual: '{sentence_buffer}'")
                    # Busca pontuação final (.) (!) (?) seguido ou não de espaço
                    if any(p in sentence_buffer for p in ".!?"):
                        parts = split_sentences(sentence_buffer)
                        if len(parts) > 1:
                            sentence_to_play = parts[0]
                            sentence_buffer = sentence_buffer[len(sentence_to_play):].lstrip()
                            
                            logger.info(f"Gerando áudio (TTS) para: '{sentence_to_play}'")
                            audio_out = provider.tts(sentence_to_play)
                            logger.info(f"Chunk de áudio gerado, index={sentences_processed}")
                            yield {"type": "audio_chunk", "audio": audio_out, "index": sentences_processed}
                            sentences_processed += 1
                            store.add_usage_log(session_id, provider.name, provider.tts_model, "tts", 0, len(sentence_to_play), 2)
            
            elif chunk["type"] == "usage":
                store.add_usage_log(session_id, provider.name, provider.text_model, "text", 
                                    chunk["input_tokens"], chunk["output_tokens"], 1)
                # store.deduct_credits(session_id, 1) # Desativado
    except Exception as e:
        logger.error(f"Erro no stream do LLM: {e}")
        yield {"type": "error", "message": f"Erro no processamento: {str(e)}"}
        return

    # Processa o que restou no buffer de sentenças
    if sess["output_mode"] == "audio" and sentence_buffer.strip():
        logger.info(f"Gerando áudio final (TTS) para: '{sentence_buffer.strip()}'")
        audio_out = provider.tts(sentence_buffer.strip())
        yield {"type": "audio_chunk", "audio": audio_out, "index": sentences_processed}
        store.add_usage_log(session_id, provider.name, provider.tts_model, "tts", 0, len(sentence_buffer), 1)
        logger.info("Final audio chunk yielded.")

    full_text = full_text.strip() or "(sem resposta)"
    
    # ✅ NOVO: Tratamento de Modo Eval (Relatórios JSON)
    if mode == "eval":
        try:
            # Tentar limpar possíveis markdown code blocks do LLM
            clean_text = full_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text.replace("```json", "", 1).replace("```", "", 1).strip()
            elif clean_text.startswith("```"):
                clean_text = clean_text.replace("```", "", 2).strip()
            
            report = json.loads(clean_text)
            
            # ✅ Injetar Recomendações do Engine no Relatório do LLM
            if recommendations_data:
                # Merge: Manter o que o LLM sugeriu, mas priorizar o engine para consistência
                engine_rec = {
                    "type": recommendations_data["recommended_action"],
                    "label": f"{recommendations_data['recommended_action'].title()}: {recommendations_data['priority_focus']}"
                }
                # Adicionar ao topo das recomendações
                llm_recs = report.get("recommendations", [])
                report["recommendations"] = [engine_rec] + llm_recs
                report["engine_reason"] = recommendations_data["reason"]

            logger.info(f"Evaluation report generated for {session_id}")
            yield {"type": "evaluation_report", **report, "state": store.get_session(session_id)}
            return
        except Exception as e:
            logger.error(f"Failed to parse evaluation report JSON: {e}. Raw: {full_text}")
            # Se falhar o parse, envia como texto normal (fallback)

    store.add_message(session_id, "user", user_text)
    store.add_message(session_id, "assistant", full_text)
    
    # ✅ NOVO: Silent Scoring e Extração de Memória (exceto no modo eval)
    if mode != "eval" and user_text.strip():
        try:
            # Avaliação em background (ou síncrona aqui no final do stream)
            eval_ctx = {
                "title": f"Chat Mode: {mode}",
                "objective": "General practice/Roleplay",
                "target_vocab": [],
                "target_grammar": [],
                "current_step_instruction": "Evaluate natural conversation"
            }
            eval_result = scoring_engine.evaluate_response(user_text, eval_ctx, lang)
            
            # Processar sinais para a memória v2
            memory_service.process_interaction_signals(
                user_id=session_id,
                source_type="chat",
                source_id=mode,
                target_language=lang,
                user_input=user_text,
                feedback_text=eval_result.get("feedback_text", "")
            )
            logger.info(f"Silent scoring completed for {session_id}")
        except Exception as e:
            logger.error(f"Error in silent scoring: {e}")

    _maybe_update_summary(store, session_id)

    logger.info("Finalizado com sucesso.")
    yield {"type": "final", "text": full_text, "state": store.get_session(session_id)}


def handle_translate(source_lang: str, target_lang: str, text: str):
    logger = setup_logger("core_openai")
    
    if not text or not text.strip():
        return {"error": "Texto vazio"}

    # 1. Tradução via LLM
    system_prompt = (
        f"Você é um tradutor profissional. Traduza o texto a seguir de {source_lang} para {target_lang}. "
        "Retorne APENAS o texto traduzido, sem explicações ou aspas extras."
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": text}
    ]
    
    logger.info(f"Traduzindo '{text}' de {source_lang} para {target_lang}")
    
    translated_text = ""
    try:
        # Usando stream para simplificar, mas vamos pegar tudo de uma vez
        for chunk in provider.llm_stream(messages):
            if chunk.get("type") == "delta":
                translated_text += chunk.get("text", "")
    except Exception as e:
        logger.error(f"Erro na tradução: {e}")
        return {"error": f"Erro na tradução: {str(e)}"}
        
    translated_text = translated_text.strip()
    logger.info(f"Tradução: '{translated_text}'")

    audio_src_b64 = None
    audio_tgt_b64 = None

    # 2. TTS Texto Original (Opcional, mas pedido)
    try:
        if source_lang != "auto": # Se auto, pode ser difícil saber a voz certa, mas vamos tentar 'pt' default ou detectar?
             # Por simplicidade/custo, vamos gerar sempre? O user pediu "player de audio com o texto digitado".
             # Vamos gerar.
             pass
        
        # Para simplificar, usamos o modelo TTS padrão. O modelo tts-1 da OpenAI suporta input multilingue.
        audio_src = provider.tts(text)
        if audio_src and audio_src.get("base64"):
            audio_src_b64 = audio_src["base64"]
            
    except Exception as e:
        logger.error(f"Erro TTS Source: {e}")

    # 3. TTS Texto Traduzido
    try:
        audio_tgt = provider.tts(translated_text)
        if audio_tgt and audio_tgt.get("base64"):
            audio_tgt_b64 = audio_tgt["base64"]
    except Exception as e:
        logger.error(f"Erro TTS Target: {e}")

    return {
        "source_text": text,
        "translated_text": translated_text,
        "audio_source": audio_src_b64,
        "audio_target": audio_tgt_b64
    }

def handle_interpret(audio_path: str, source_lang: str, target_lang: str):
    logger = setup_logger("core_openai")
    logger.info(f"Interpreting audio from {source_lang} to {target_lang}")
    
    try:
        # 1. Transcribe (STT)
        with open(audio_path, "rb") as audio_file:
            transcription_response = provider.client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                language=source_lang if source_lang != "auto" else None
            )
        
        source_text = transcription_response.text
        logger.info(f"Transcription: {source_text}")
        
        if not source_text.strip():
            return {"error": "No speech detected"}

        # 2. Translate (LLM)
        sys_prompt = f"You are a professional interpreter. Translate the following text from {source_lang} to {target_lang}. Return ONLY the translated text, nothing else."
        
        completion = provider.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": source_text}
            ]
        )
        
        target_text = completion.choices[0].message.content
        logger.info(f"Translation: {target_text}")

        # 3. Generate Audio (TTS)
        # TTS only for target text (to be played to the other person)
        response_audio = provider.client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=target_text
        )
        
        audio_b64 = base64.b64encode(response_audio.content).decode("utf-8")
        
        return {
            "source_text": source_text,
            "target_text": target_text,
            "target_audio": audio_b64
        }
        
    except Exception as e:
        logger.error(f"Error in handle_interpret: {e}")
        return {"error": str(e)}

def handle_interpret_auto(audio_path: str, lang_a: str, lang_b: str):
    logger = setup_logger("core_openai")
    logger.info(f"Interpreting Auto-Detect between {lang_a} and {lang_b}")
    
    try:
        # 1. Transcribe (STT) with Auto-Detect
        # We don't specify language, so Whisper detects it.
        # To get the detected language, we need verbose_json response if using the API directly,
        # but the standard response object might have it?
        # Actually, standard response is just text. We might need verbose_json.
        # Let's try to infer from the text or use verbose_json.
        # Using verbose_json to get language.
        
        with open(audio_path, "rb") as audio_file:
            transcription = provider.client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="verbose_json"
            )
        
        source_text = transcription.text
        detected_lang = transcription.language # 'english', 'portuguese', etc. (full name usually)
        
        # Map full name to code if necessary, or just rely on what we have.
        # Whisper returns full language names usually (e.g. "portuguese").
        # Our codes are 'pt', 'en', 'fr'.
        # Simple mapping:
        map_lang = {
            "portuguese": "pt", "english": "en", "french": "fr",
            "spanish": "es", "german": "de", "italian": "it"
        }
        
        detected_code = map_lang.get(detected_lang, "en") # Default to en?
        
        logger.info(f"Detected: {detected_lang} (mapped: {detected_code}). Text: {source_text}")
        
        if not source_text.strip():
            return {"error": "No speech detected"}

        # 2. Determine Target
        # Logic: If detected is closer to A, target is B. If closer to B, target is A.
        # If ambiguous, maybe check string overlap?
        # For now, strict match.
        
        target_code = lang_b
        final_source_code = detected_code
        
        if detected_code == lang_a:
            target_code = lang_b
        elif detected_code == lang_b:
            target_code = lang_a
        else:
            # Fallback: If not A or B, assume it's A translating to B (default) 
            # OR return error? 
            # Let's assume user spoke Lang A.
            target_code = lang_b 
            final_source_code = lang_a
            
        logger.info(f"Direction: {final_source_code} -> {target_code}")

        # 3. Translate (LLM)
        sys_prompt = f"You are a professional interpreter. Translate the following text from {final_source_code} to {target_code}. Return ONLY the translated text."
        
        completion = provider.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": source_text}
            ]
        )
        
        target_text = completion.choices[0].message.content
        logger.info(f"Translation: {target_text}")

        # 4. Generate Audio (TTS)
        response_audio = provider.client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=target_text
        )
        
        audio_b64 = base64.b64encode(response_audio.content).decode("utf-8")
        
        return {
            "source_text": source_text,
            "target_text": target_text,
            "detected_language": detected_code,
            "target_audio": audio_b64
        }
        
    except Exception as e:
        logger.error(f"Error in handle_interpret_auto: {e}")
        return {"error": str(e)}

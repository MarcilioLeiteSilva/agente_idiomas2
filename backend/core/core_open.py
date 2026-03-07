import os
import base64
import re
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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
    # detector simples (p/ teste). Depois podemos trocar por algo melhor.
    t = text.lower()
    if re.search(r"\b(please|hello|thanks|what|how|help)\b", t):
        return "en"
    if re.search(r"\b(bonjour|merci|quoi|comment|aide)\b", t):
        return "fr"
    return "pt"

def stt_openai(audio_b64: str, mime: str) -> str:
    audio_bytes = base64.b64decode(audio_b64)
    model = os.getenv("OPENAI_STT_MODEL", "gpt-4o-mini-transcribe")

    resp = client.audio.transcriptions.create(
        model=model,
        file=("audio", audio_bytes, mime),
    )
    return resp.text

def llm_openai_reply(user_text: str, lang: str) -> str:
    model = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")

    lang_hint = {
        "pt": "Responda em português do Brasil.",
        "en": "Reply in English.",
        "fr": "Réponds en français.",
    }.get(lang, "Responda em português do Brasil.")

    system = (
        "Você é um assistente de conversação útil e direto. "
        "Responda no idioma indicado. "
        "Se o usuário pedir configurações, sugira 'menu'."
    )

    resp = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"{lang_hint}\n\n{user_text}"},
        ],
    )
    return resp.output_text

def tts_openai(text: str) -> dict:
    tts_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    voice = os.getenv("OPENAI_TTS_VOICE", "marin")
    fmt = os.getenv("OPENAI_TTS_FORMAT", "mp3")

    audio_bytes = client.audio.speech.create(
        model=tts_model,
        voice=voice,
        input=text,
        format=fmt,
    ).read()

    mime = "audio/mpeg" if fmt == "mp3" else f"audio/{fmt}"
    return {"mime": mime, "base64": base64.b64encode(audio_bytes).decode("utf-8")}

def handle_action(store, session_id: str, action_id: str):
    if action_id == "set_mode_text":
        sess = store.upsert_session(session_id, output_mode="text")
        return {"output": {"type": "text", "text": "✅ Modo definido: TEXTO."}, "ui": MENU_MAIN, "state": sess}

    if action_id == "set_mode_audio":
        sess = store.upsert_session(session_id, output_mode="audio")
        return {"output": {"type": "text", "text": "✅ Modo definido: ÁUDIO."}, "ui": MENU_MAIN, "state": sess}

    if action_id == "set_lang_menu":
        sess = store.get_session(session_id)
        return {"output": {"type": "text", "text": "Escolha o idioma:"}, "ui": MENU_LANG, "state": sess}

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

def handle_message(store, session_id: str, message: dict, ui_action: dict | None):
    sess = store.get_session(session_id)

    # clique/ação de menu
    if ui_action and ui_action.get("action_id"):
        return handle_action(store, session_id, ui_action["action_id"])

    # entrada -> texto
    if message.get("type") == "audio":
        audio = message.get("audio") or {}
        user_text = stt_openai(audio.get("base64", ""), audio.get("mime", "audio/ogg"))
    else:
        user_text = message.get("text") or ""

    # menu sob demanda (não inicia conversa)
    if is_menu_command(user_text):
        return {"output": {"type": "text", "text": "Escolha uma opção:"}, "ui": MENU_MAIN, "state": sess}

    # idioma
    lang = sess["language"]
    if lang == "auto":
        lang = detect_lang_simple(user_text)

    # resposta
    reply_text = llm_openai_reply(user_text, lang)

    # salvar histórico mínimo
    store.add_message(session_id, "user", user_text)
    store.add_message(session_id, "assistant", reply_text)

    # saída pelo modo fixo escolhido
    if sess["output_mode"] == "audio":
        audio_out = tts_openai(reply_text)
        return {"output": {"type": "audio", "audio": audio_out}, "state": sess}

    return {"output": {"type": "text", "text": reply_text}, "state": sess}

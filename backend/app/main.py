from core.config import config
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Form, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, Literal, Any, Dict
from pathlib import Path
import json

from core.store import Store
from core.core_openai import handle_message, handle_message_stream
from core.logger import setup_logger
from core.metrics import metrics
from services.memory.memory_service import MemoryService # Novo
import time

logger = setup_logger("agente_idiomas")

memory_service = MemoryService() # Novo global


# Configuração do FastAPI com suporte a roteamento flexível
app = FastAPI(title="Agente Idiomas (Local)", redirect_slashes=True)

# Manual Brute-Force CORS Middleware
from fastapi import Request, Response

@app.middleware("http")
async def manual_cors(request: Request, call_next):
    # Handle OPTIONS preflight
    if request.method == "OPTIONS":
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response
    
    # Process request
    response = await call_next(request)
    
    # Add CORS to real response
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# REMOVIDO CORSMiddleware padrão para evitar conflitos

from fastapi.staticfiles import StaticFiles

WEB_DIR = config.WEB_DIR

from app.api.routes.memory import router as memory_router
app.include_router(memory_router)

store = Store(config.DB_PATH)

@app.get("/")
def index():
    # Landing page é agora o index.html
    if WEB_DIR.exists() and (WEB_DIR / "index.html").exists():
        return FileResponse(WEB_DIR / "index.html")
    return {"message": "Agente Idiomas API is running."}

@app.get("/dashboard")
def dashboard():
    if WEB_DIR.exists() and (WEB_DIR / "dashboard.html").exists():
        return FileResponse(WEB_DIR / "dashboard.html")
    return {"error": "Dashboard not found"}

# --- AUTH ENDPOINTS ---
from core.auth import get_password_hash, verify_password, create_access_token
import uuid

# --- MODELS ---
class RegisterReq(BaseModel):
    email: str
    password: str
    full_name: str

class LoginReq(BaseModel):
    email: str
    password: str

class MessageItem(BaseModel):
    role: str
    content: str
    meta: Optional[Dict] = None

class MessageReq(BaseModel):
    session_id: str
    message: Any # Suporta string (texto direto) ou dict (áudio/complexo)
    mode: Optional[str] = "free"
    scenario: Optional[str] = None
    evaluation: Optional[bool] = False
    user_level: Optional[str] = None
    target_language: Optional[str] = None
    native_language: Optional[str] = None
    output_mode: Optional[str] = None # 'text' ou 'audio'
    ui_action: Optional[Dict] = None

class SettingsReq(BaseModel):
    session_id: str
    output_mode: Literal["text", "audio"] # Corrigido de "voice" para "audio"
    language: str

class ProfileReq(BaseModel):
    user_id: str
    native_language: str = "pt"
    target_language: str
    level: str = "A1"
    goals: Optional[str] = ""
    correction_style: str = "moderado"

class TranslateReq(BaseModel):
    source_lang: str
    target_lang: str
    text: str

class LessonStartReq(BaseModel):
    user_id: str
    lesson_id: str

class LessonNextReq(BaseModel):
    user_id: str
    user_input: str

class LessonCompleteReq(BaseModel):
    user_id: str
    score: int = -1

class ReviewStartReq(BaseModel):
    user_id: str
    items: int = 5

class ReviewAnswerReq(BaseModel):
    user_id: str
    review_session_id: str
    exercise_id: str
    type: str 
    user_input: str
    expected_focus: str

class ReviewCompleteReq(BaseModel):
    user_id: str
    review_session_id: str

class LessonStopReq(BaseModel):
    user_id: str

# --- AUTH ENDPOINTS ---
@app.post("/v1/auth/register")
def register(req: RegisterReq):
    try:
        if not req.email or "@" not in req.email:
            raise HTTPException(status_code=400, detail="E-mail inválido")
            
        # Argon2 has no practical length limit like Bcrypt (max 4GB theoretically)
        # We set 256 for basic security sanity.
        password_bytes = len(req.password.encode('utf-8'))
        if password_bytes > 256:
            raise HTTPException(status_code=400, detail="Sua senha é excessivamente longa. Por favor, use no máximo 256 caracteres.")

        existing = store.get_user_by_email(req.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        user_id = str(uuid.uuid4())
        pw_hash = get_password_hash(req.password)
        store.create_user(user_id, req.email, pw_hash, req.full_name)
        
        return {"ok": True, "user_id": user_id}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/auth/login")
def login(req: LoginReq):
    try:
        # Relaxed limit for Argon2
        password_bytes = len(req.password.encode('utf-8'))
        if password_bytes > 256:
             raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

        user = store.get_user_by_email(req.email)
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
        
        token = create_access_token({"sub": user["id"]})
        # Note: store uses field 'name'. Check if it matches frontend expectation.
        return {
            "ok": True, 
            "access_token": token, 
            "user": {
                "id": user["id"], 
                "name": user.get("name", user.get("full_name", ""))
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- HEALTH & DIAGNOSTICS ---
@app.get("/health")
def root_health():
    return {"ok": True, "version": "v15.0-argon2"}

@app.get("/v1/health")
def v1_health():
    return {"ok": True}

@app.get("/v1/diagnostics")
def v1_diagnostics():
    if os.getenv("ENABLE_DIAGNOSTICS") != "1":
        raise HTTPException(status_code=403, detail="Diagnostics disabled")
        
    data = metrics.get_metrics()
    data["db_path"] = store.path
    data["app_version"] = "agente_idiomas2_v14_debug"
    return data

# Middleware/Decorator for logging
from functools import wraps
def log_execution(endpoint_name):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start
                
                # Metrics
                metrics.observe_request(endpoint_name, duration)
                
                # Structured Log
                # Extract user_id if possible (from args or result?)
                # req object is usually in args[0] if it's a Pydantic model
                user_id = "unknown"
                ref_id = None
                
                # Basic inspection of kwargs or args[0]
                if kwargs.get("req"):
                    if hasattr(kwargs["req"], "user_id"):
                        user_id = kwargs["req"].user_id
                    elif hasattr(kwargs["req"], "session_id"):
                        user_id = kwargs["req"].session_id
                        
                # Log JSON
                log_entry = {
                    "endpoint": endpoint_name,
                    "user_id": user_id,
                    "status_code": 200,
                    "duration_ms": int(duration * 1000),
                }
                logger.info(json.dumps(log_entry, ensure_ascii=False))
                
                return result
            except Exception as e:
                duration = time.time() - start
                metrics.observe_request(endpoint_name, duration)
                logger.error(json.dumps({
                    "endpoint": endpoint_name,
                    "status_code": 500,
                    "error": str(e),
                    "duration_ms": int(duration * 1000)
                }))
                raise e
        return wrapper
    return decorator


@app.post("/v1/message")
def v1_message(req: MessageReq):
    # Padronizar entrada: se for string vira objeto de texto, se já for dict segue direto
    msg_input = req.message
    if isinstance(msg_input, str):
        msg_input = {"type": "text", "text": msg_input}
    
    return handle_message(
        store=store,
        session_id=req.session_id,
        message=msg_input,
        ui_action=req.ui_action if req.ui_action else None,
        mode=req.mode,
        scenario=req.scenario,
        evaluation=req.evaluation,
        user_level=req.user_level,
        target_language=req.target_language,
        native_language=req.native_language,
        output_mode=req.output_mode
    )

# ✅ NOVO: streaming SSE
@app.post("/v1/stream")
def v1_stream(req: MessageReq):
    msg_input = req.message
    if isinstance(msg_input, str):
        msg_input = {"type": "text", "text": msg_input}

    def gen():
        try:
            for chunk in handle_message_stream(
                store=store,
                session_id=req.session_id,
                message=msg_input,
                ui_action=req.ui_action if req.ui_action else None,
                mode=req.mode,
                scenario=req.scenario,
                evaluation=req.evaluation,
                user_level=req.user_level,
                target_language=req.target_language,
                native_language=req.native_language,
                output_mode=req.output_mode
            ):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
            
    return StreamingResponse(gen(), media_type="text/event-stream; charset=utf-8")

@app.post("/v1/settings")
def v1_settings(req: SettingsReq):
    state = store.upsert_session(req.session_id, output_mode=req.output_mode, language=req.language)
    return {"ok": True, "state": state}

@app.get("/v1/credits")
def v1_credits(session_id: str):
    return {"credits": store.get_credits(session_id)}

# ✅ NOVO: Endpoint de Tradução
class TranslateReq(BaseModel):
    source_lang: str
    target_lang: str
    text: str

@app.post("/v1/translate")
def v1_translate(req: TranslateReq):
    from core.core_openai import handle_translate
    return handle_translate(req.source_lang, req.target_lang, req.text)

# ✅ NOVO: Endpoint de Intérprete
from typing import Annotated

@app.post("/v1/interpret")
async def v1_interpret(
    source_lang: Annotated[str, Form()],
    target_lang: Annotated[str, Form()],
    file: Annotated[UploadFile, File()]
):
    # Save temp file
    temp_filename = f"temp_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await file.read())
        
    try:
        from core.core_openai import handle_interpret
        response = handle_interpret(temp_filename, source_lang, target_lang)
        return response
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.post("/v1/interpret-auto")
async def v1_interpret_auto(
    source_lang_a: Annotated[str, Form()],
    source_lang_b: Annotated[str, Form()],
    file: Annotated[UploadFile, File()]
):
    # Save temp file
    temp_filename = f"temp_auto_{file.filename}"
    with open(temp_filename, "wb") as buffer:
        buffer.write(await file.read())
        
    try:
        from core.core_openai import handle_interpret_auto
        response = handle_interpret_auto(temp_filename, source_lang_a, source_lang_b)
        return response
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

# ✅ NOVO: Endpoints de Perfil (Fase 1)
# ✅ NOVO: Endpoints de Perfil (Fase 1)
class ProfileReq(BaseModel):
    user_id: str
    native_language: str = "pt" # Novo campo (Fase 1 - Passo 2)
    target_language: str
    level: str = "A1"
    goals: Optional[str] = ""
    correction_style: str = "moderado"

@app.post("/v1/profile")
def v1_create_profile(req: ProfileReq):
    return store.create_or_update_profile(
        user_id=req.user_id,
        native_language=req.native_language,
        target_language=req.target_language,
        level=req.level,
        goals=req.goals,
        correction_style=req.correction_style
    )

@app.get("/v1/profile")
def v1_get_profile(user_id: str):
    profile = store.get_profile(user_id)
    if not profile:
        return {"error": "Profile not found"}
    return profile

# ✅ NOVO: Endpoint de Lições (Fase 1 - Passo 2)
# ✅ NOVO: Endpoint de Lições (Fase 1 - Passo 2)
from learning.lesson_engine import LessonEngine
from learning.scoring_engine import ScoringEngine # Fase 1 - Passo 4

lesson_engine = LessonEngine()
scoring_engine = ScoringEngine()

@app.get("/v1/lessons")
def v1_lessons(target_language: Optional[str] = None, level: Optional[str] = None, user_id: Optional[str] = None):
    # Se user_id fornecido, carregar defaults do perfil
    if user_id:
        profile = store.get_profile(user_id)
        if profile:
            if not target_language: target_language = profile.get("target_language")
            if not level: level = profile.get("level")
            
    # Fallbacks globais
    if not target_language: target_language = "en"
    if not level: level = "A1"
    
    return lesson_engine.load_lessons(target_language, level)

# ✅ NOVO: Fluxo de Lição e Progresso (Fase 1 - Passo 3)

class LessonStartReq(BaseModel):
    user_id: str
    lesson_id: str

@app.post("/v1/lesson/start")
@log_execution("v1_lesson_start")
def v1_lesson_start(req: LessonStartReq):
    logger.info(f"[lesson/start] user_id={req.user_id}, lesson_id={req.lesson_id}")
    logger.info(f"[lesson/start] lessons_dir={lesson_engine.lessons_dir}, exists={lesson_engine.lessons_dir.exists()}")

    # 1. Inferir idioma do prefixo do lesson_id (ex: "en_a1_01" → "en")
    parts = req.lesson_id.split("_")
    target_lang = parts[0] if len(parts) >= 2 else "en"

    lesson = lesson_engine.get_lesson_by_id(target_lang, req.lesson_id)
    logger.info(f"[lesson/start] target_lang={target_lang}, found={lesson is not None}")

    # 2. Busca global: se não achou, tenta outros idiomas disponíveis
    if not lesson:
        lang_parent = lesson_engine.lessons_dir
        if lang_parent.exists():
            other_langs = [d.name for d in lang_parent.iterdir() if d.is_dir() and d.name != target_lang]
            logger.warning(f"[lesson/start] Not found in '{target_lang}', trying: {other_langs}")
            for lang in other_langs:
                lesson = lesson_engine.get_lesson_by_id(lang, req.lesson_id)
                if lesson:
                    target_lang = lang
                    logger.info(f"[lesson/start] Found via fallback lang={lang}")
                    break

    if not lesson:
        logger.error(f"[lesson/start] Lesson '{req.lesson_id}' not found in any language. lessons_dir={lesson_engine.lessons_dir}")
        return {"error": "Lesson not found"}

    # 3. Inferir nível do lesson_id
    level = "A1"
    lid_lower = req.lesson_id.lower()
    if "_a2_" in lid_lower or lid_lower.endswith("_a2"): level = "A2"
    elif "_a1_" in lid_lower or lid_lower.endswith("_a1"): level = "A1"
    elif "_b2_" in lid_lower or lid_lower.endswith("_b2"): level = "B2"
    elif "_b1_" in lid_lower or lid_lower.endswith("_b1"): level = "B1"
    elif "_c1_" in lid_lower or lid_lower.endswith("_c1"): level = "C1"
    elif "_c2_" in lid_lower or lid_lower.endswith("_c2"): level = "C2"

    store.start_lesson(req.user_id, req.lesson_id, target_lang, level)

    return {
        "status": "started",
        "lesson": lesson,
        "first_step": lesson.get("script_steps", [])[0] if lesson.get("script_steps") else "Start!"
    }


class LessonNextReq(BaseModel):
    user_id: str
    user_input: str

@app.post("/v1/lesson/next")
@log_execution("v1_lesson_next")
def v1_lesson_next(req: LessonNextReq):
    state = store.get_lesson_state(req.user_id)
    if not state or not state["active"]:
        return {"error": "No active lesson"}
    
    current_step_idx = state["step_index"]
    
    # Carregar dados da lição
    prog_rows = store.get_progress(req.user_id)
    prog = next((p for p in prog_rows if p["lesson_id"] == state["lesson_id"]), None)
    
    if not prog:
        return {"error": "Progress not found for active lesson"}
        
    target_lang = prog["target_language"]
    lesson = lesson_engine.get_lesson_by_id(target_lang, state["lesson_id"])
    
    if not lesson:
        return {"error": "Lesson content missing"}
        
    steps = lesson.get("script_steps", [])
    
    # --- Scoring (Fase 1 - Passo 4) ---
    # Avaliar a resposta ANTES de avançar
    current_instruction = steps[current_step_idx] if current_step_idx < len(steps) else "Review"
    
    # Contexto para o prompt
    eval_context = {
        "title": lesson.get("title"),
        "objective": lesson.get("objective"),
        "target_vocab": lesson.get("target_vocab", []),
        "target_grammar": lesson.get("target_grammar", []),
        "current_step_instruction": current_instruction
    }
    
    eval_result = scoring_engine.evaluate_response(req.user_input, eval_context, target_lang)
    
    # Persistir tentativa
    store.add_lesson_attempt(
        user_id=req.user_id,
        lesson_id=state["lesson_id"],
        step_index=current_step_idx,
        user_input=req.user_input,
        overall_score=eval_result.get("overall_score", 0),
        feedback_json=json.dumps(eval_result, ensure_ascii=False)
    )
    
    # --- Learning Memory Update (Fase 1 - Passo 6) ---
    # 🔄 UPDATE (V13): Migração para Memory Engine v2
    try:
        # Sistema V1 (Legado)
        from learning.memory_extractor import extract_learning_signals
        mem_context = {
            "target_vocab": lesson.get("target_vocab", []),
            "target_grammar": lesson.get("target_grammar", [])
        }
        signals_v1 = extract_learning_signals(mem_context, req.user_input, eval_result)
        store.upsert_learning_memory(req.user_id, target_lang, signals_v1)
        
        # Sistema V2 (Novo Blueprint)
        memory_service.process_interaction_signals(
            user_id=req.user_id,
            source_type="lesson",
            source_id=state["lesson_id"],
            target_language=target_lang,
            user_input=req.user_input,
            feedback_text=eval_result.get("feedback_text", "")
        )
    except Exception as e:
        print(f"Erro ao atualizar Learning Memory (v1/v2): {e}")
    # -------------------------------------------------

    next_step = current_step_idx + 1
    
    if next_step >= len(steps):
        # Lição acabando, mas ainda retornamos o feedback do ultimo input
        return {
            "status": "finished", 
            "message": "Lesson steps completed. Call /complete to finish.",
            "feedback": eval_result # Retorna feedback da ultima interacao
        }
        
    store.set_lesson_state(req.user_id, next_step, active=1)
    
    # Store interaction for chat history
    store.add_message(req.user_id, "user", req.user_input)
    # Adicionar também o feedback do tutor no histórico
    if eval_result.get("feedback_text"):
        store.add_message(req.user_id, "assistant", f"[Feedback]: {eval_result['feedback_text']}")

    instruction = steps[next_step]
    store.add_message(req.user_id, "assistant", f"[Lesson Tutor]: {instruction}")

    return {
        "status": "ongoing",
        "step_index": next_step,
        "instruction": instruction,
        "feedback": eval_result # Feedback da resposta anterior
    }

class LessonCompleteReq(BaseModel):
    user_id: str
    score: int = -1 # Default -1 para indicar "calcular média"

@app.post("/v1/lesson/complete")
@log_execution("v1_lesson_complete")
def v1_lesson_complete(req: LessonCompleteReq):
    state = store.get_lesson_state(req.user_id)
    if not state:
        return {"error": "No active lesson"}
    
    lesson_id = state["lesson_id"]
    
    # 1. Obter score final
    final_score = store.get_lesson_average_score(req.user_id, lesson_id)
    
    # 2. Marcar Completed
    store.complete_lesson(req.user_id, lesson_id, final_score)
    
    # ✅ NOVO: Gamification Logic (Fase 1 - Passo 8)
    xp_gained = 0
    bonus_xp = 0
    bonus_reason = ""
    
    # Base XP Logic based on Score
    base_xp = 30
    multiplier = 1.0
    if final_score >= 90: multiplier = 1.5
    elif final_score >= 75: multiplier = 1.2
    elif final_score >= 60: multiplier = 1.0
    elif final_score >= 40: multiplier = 0.7
    else: multiplier = 0.5
    
    xp_amount = int(base_xp * multiplier)
    
    # Award Lesson XP
    if store.add_xp(req.user_id, xp_amount, "lesson_complete", lesson_id):
        xp_gained += xp_amount
        
    # Check Unit Bonus (Every 5 lessons in same level/lang)
    # We need to knowlang/level. Fetch from progress just updated.
    progress_rows = store.get_progress(req.user_id)
    # Filter for same lang/level as current lesson
    # We need to fetch lesson metadata again or rely on progress info
    completed_lesson_entry = next((p for p in progress_rows if p["lesson_id"] == lesson_id), None)
    
    if completed_lesson_entry:
        target_lang = completed_lesson_entry["target_language"]
        level = completed_lesson_entry["level"]
        
        # Count completed in this scope
        completed_in_unit = [
            p for p in progress_rows 
            if p["target_language"] == target_lang and p["level"] == level and p["status"] == "completed"
        ]
        count = len(completed_in_unit)
        
        if count > 0 and count % 5 == 0:
            unit_index = count // 5
            unit_ref = f"{target_lang}_{level}_unit_{unit_index}"
            if store.add_xp(req.user_id, 50, "unit_complete", unit_ref):
                bonus_xp = 50
                bonus_reason = f"Unit {unit_index} Completed!"
                xp_gained += 50

    return {
        "status": "completed", 
        "final_score": final_score,
        "xp_gained": xp_gained,
        "bonus_reason": bonus_reason
    }

class LessonStopReq(BaseModel):
    user_id: str

@app.post("/v1/lesson/stop")
@log_execution("v1_lesson_stop")
def v1_lesson_stop(req: LessonStopReq):
    store.stop_lesson(req.user_id)
    return {"status": "stopped"}

@app.get("/v1/progress")
def v1_progress(user_id: str):
    return store.get_progress(user_id)

# ✅ NOVO: Endpoints de Memory e Recommendations (Fase 1 - Passo 6)
@app.get("/v1/learning_memory")
def v1_learning_memory(user_id: str, target_language: str = "en"):
    return store.get_learning_memory(user_id, target_language)

@app.get("/v1/recommendations")
@log_execution("v1_recommendations")
def v1_recommendations(user_id: str, target_language: str = "en"):
    # Lógica de recomendação com suporte a memória normalizada
    mem = store.get_learning_memory(user_id, target_language)
    
    # Extrair regras gramaticais da memória (pode ser lista de strings ou dicts normalizados)
    raw_grammar = mem.get("weak_grammar", [])
    weak_grammar_rules = []
    for item in raw_grammar:
        if isinstance(item, dict):
            weak_grammar_rules.append(item.get("rule", ""))
        elif isinstance(item, str):
            weak_grammar_rules.append(item)
            
    # 1. Verificar se precisa de reforço imediato (Last Lesson Score < 60)
    progress = store.get_progress(user_id)
    # Ordenar por data de conclusão desc
    completed = [p for p in progress if p["status"] == "completed"]
    completed.sort(key=lambda x: x.get("completed_at", "") or "", reverse=True)
    
    if completed:
        last = completed[0]
        if last.get("score", 100) < 60:
            # Sugerir revisão ou refazer
            # Por enquanto, sugerimos refazer a lição
            lesson = lesson_engine.get_lesson_by_id(last["target_language"], last["lesson_id"])
            if lesson:
                return {
                    "recommended_lesson": lesson,
                    "reason": f"Reforço necessário: Score anterior foi {last['score']}. Vamos tentar novamente?"
                }

    # 2. Pegar todas as lições do nível atual do usuário
    profile = store.get_profile(user_id)
    level = profile.get("level", "A1") if profile else "A1"
    
    raw_data = lesson_engine.load_lessons(target_language, level)
    
    all_lessons = []
    if isinstance(raw_data, list):
        all_lessons = raw_data
    elif isinstance(raw_data, dict):
        all_lessons = raw_data.get("lessons", [])
    
    # 3. Filtrar as que não foram completadas
    completed_ids = {p["lesson_id"] for p in completed}
    
    candidates = [l for l in all_lessons if l.get("id") not in completed_ids]
    
    # 4. Rankear candidatos
    # Se a lição foca num tópico onde o usuário é fraco, bump it up.
    best_match = None
    match_reason = "Sequência do curso"
    
    for lesson in candidates:
        lesson_grammar = lesson.get("target_grammar", [])
        # Interseção
        common = set(lesson_grammar).intersection(set(weak_grammar_rules))
        if common:
            best_match = lesson
            match_reason = f"Foca em seus pontos de atenção: {', '.join(common)}"
            break
            
    if not best_match and candidates:
        best_match = candidates[0]
        
    if best_match:
        return {
            "recommended_lesson": best_match,
            "reason": match_reason
        }
    
    return {"message": "All lessons completed for this level!", "recommended_lesson": None}



# ✅ NOVO: Micro Review Endpoints (Fase 1 - Passo 7)
from learning.exercise_engine import ExerciseEngine

exercise_engine = ExerciseEngine()

class ReviewStartReq(BaseModel):
    user_id: str
    items: int = 5

@app.post("/v1/review/start")
@log_execution("v1_review_start")
def v1_review_start(req: ReviewStartReq):
    # 1. Fetch memory
    profile = store.get_profile(req.user_id)
    target_lang = profile["target_language"] if profile else "en"
    
    mem = store.get_learning_memory(req.user_id, target_lang)
    
    # 2. Generate exercises
    gen_result = exercise_engine.generate_review_items(req.user_id, mem, target_lang)
    items = gen_result["items"]
    focus = gen_result["focus_summary"]
    
    # 3. Create Session
    import uuid
    session_id = str(uuid.uuid4())
    store.create_review_session(session_id, req.user_id, len(items), focus)
    
    return {
        "review_session_id": session_id,
        "items": items,
        "focus": focus
    }

class ReviewAnswerReq(BaseModel):
    user_id: str
    review_session_id: str
    exercise_id: str
    type: str # 'translate_word', 'grammar_practice'
    user_input: str
    expected_focus: str

@app.post("/v1/review/answer")
@log_execution("v1_review_answer")
def v1_review_answer(req: ReviewAnswerReq):
    # Avaliação rápida
    # Como são prompts abertos ("Use X in a sentence"), usamos o ScoringEngine simplificado
    # ou uma heurística se quisermos economizar tokens.
    # Vamos usar ScoringEngine com um contexto ad-hoc.
    
    profile = store.get_profile(req.user_id)
    target_lang = profile["target_language"] if profile else "en"
    
    # Contexto "fake" de lição para o ScoringEngine entender
    eval_context = {
        "title": "Micro Review",
        "objective": f"Practice {req.expected_focus}",
        "target_vocab": [req.expected_focus] if req.type == 'translate_word' else [],
        "target_grammar": [req.expected_focus] if req.type == 'grammar_practice' else [],
        "current_step_instruction": f"Exercise: {req.type}. Focus: {req.expected_focus}"
    }
    
    eval_result = scoring_engine.evaluate_response(req.user_input, eval_context, target_lang)
    
    # Persistir
    store.add_review_attempt(
        req.review_session_id, 
        req.exercise_id, 
        req.type, 
        req.user_input, 
        eval_result.get("overall_score", 0), 
        eval_result
    )
    
    # Atualizar Memory (reforço)
    try:
        from learning.memory_extractor import extract_learning_signals
        signals = extract_learning_signals(eval_context, req.user_input, eval_result)
        store.upsert_learning_memory(req.user_id, target_lang, signals)
    except Exception as e:
        print(f"Erro update memory review: {e}")
        
    return {
        "score": eval_result.get("overall_score", 0),
        "feedback": eval_result.get("feedback_text", ""),
        "corrections": eval_result.get("corrections", [])
    }

class ReviewCompleteReq(BaseModel):
    user_id: str
    review_session_id: str

@app.post("/v1/review/complete")
@log_execution("v1_review_complete")
def v1_review_complete(req: ReviewCompleteReq):
    store.finish_review_session(req.review_session_id)
    
    # ✅ NOVO: Gamification for Review
    session = store.get_review_session(req.review_session_id)
    xp_gained = 0
    if session:
        avg = session["avg_score"]
        base = 10
        bonus = 0
        if avg >= 85: bonus = 10
        elif avg >= 70: bonus = 5
        
        total_review_xp = base + bonus
        if store.add_xp(req.user_id, total_review_xp, "review_complete", req.review_session_id):
            xp_gained = total_review_xp

    return {"status": "completed", "xp_gained": xp_gained}

@app.get("/v1/stats")
@log_execution("v1_stats")
def v1_stats(user_id: str):
    return store.get_stats(user_id)

@app.get("/v1/review/history")
def v1_review_history(user_id: str):
    return store.get_review_history(user_id)

if WEB_DIR.exists():
    app.mount("/", StaticFiles(directory=WEB_DIR), name="static")

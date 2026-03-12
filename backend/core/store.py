from db.postgres_adapter import PostgresShim as pg
from datetime import datetime
from pathlib import Path

class Store:
    def __init__(self, db_path=None):
        self.path = db_path
        self._init()

    def _init(self):
        with pg.connect(self.path) as con:
            con.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
              session_id TEXT PRIMARY KEY,
              output_mode TEXT NOT NULL DEFAULT 'text',
              language TEXT NOT NULL DEFAULT 'pt',
              updated_at TEXT NOT NULL
            )""")

            con.execute("""
            CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              meta TEXT DEFAULT NULL,
              created_at TEXT NOT NULL
            )""")

            # Garantir coluna meta no Postgres (migração passiva compatível)
            try:
                con.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta TEXT DEFAULT NULL")
            except Exception:
                pass

            # ✅ NOVO: resumo persistido da conversa
            con.execute("""
            CREATE TABLE IF NOT EXISTS summaries (
              session_id TEXT PRIMARY KEY,
              summary TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )""")

            # ✅ NOVO: sistema de créditos
            con.execute("""
            CREATE TABLE IF NOT EXISTS credits (
              session_id TEXT PRIMARY KEY,
              balance_cents INTEGER NOT NULL DEFAULT 100,
              updated_at TEXT NOT NULL
            )""")


            # ✅ NOVO: log de uso
            con.execute("""
            CREATE TABLE IF NOT EXISTS usage_logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id TEXT NOT NULL,
              provider TEXT NOT NULL,
              model TEXT NOT NULL,
              type TEXT NOT NULL, -- 'text', 'stt', 'tts'
              input_units INTEGER NOT NULL DEFAULT 0, -- tokens or chars
              output_units INTEGER NOT NULL DEFAULT 0, -- tokens or chars
              cost_millicents INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            )""")

            # ✅ NOVO: sistema de usuários (Fase 1 - Passo 4)
            con.execute("""
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              name TEXT,
              role TEXT DEFAULT 'student',
              created_at TEXT NOT NULL
            )""")


            # Migração passiva removida para Postgres compatibility


            # ✅ NOVO: perfil do aluno (Fase 1 - Passo 1)
            # 🔄 UPDATE (Fase 1 - Passo 2): Adicionado native_language
            con.execute("""
            CREATE TABLE IF NOT EXISTS user_profile (
              user_id TEXT PRIMARY KEY,
              native_language TEXT DEFAULT 'pt', -- Novo campo
              target_language TEXT NOT NULL,
              level TEXT DEFAULT 'A1',
              goals TEXT,
              correction_style TEXT DEFAULT 'moderado',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            )""")
            

            # Migração automática removida para Postgres compatibility


            # ✅ NOVO: Progresso do aluno (Fase 1 - Passo 3)
            con.execute("""
            CREATE TABLE IF NOT EXISTS user_progress (
              user_id TEXT,
              lesson_id TEXT,
              target_language TEXT,
              level TEXT,
              status TEXT, -- started, completed
              score INTEGER DEFAULT 0,
              started_at TEXT,
              completed_at TEXT,
              attempts INTEGER DEFAULT 1,
              PRIMARY KEY (user_id, lesson_id)
            )""")

            # ✅ NOVO: Estado da lição ativa (Fase 1 - Passo 3)
            con.execute("""
            CREATE TABLE IF NOT EXISTS user_lesson_state (
              user_id TEXT PRIMARY KEY,
              lesson_id TEXT,
              step_index INTEGER DEFAULT 0,
              active INTEGER DEFAULT 0,
              updated_at TEXT
            )""")

            # ✅ NOVO: Detalhes das tentativas (Fase 1 - Passo 4)
            con.execute("""
            CREATE TABLE IF NOT EXISTS lesson_attempt_details (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT,
              lesson_id TEXT,
              step_index INTEGER,
              user_input TEXT,
              overall_score INTEGER,
              feedback_json TEXT,
              timestamp TEXT
            )""")

            # ✅ NOVO: Memória de Aprendizado (Fase 1 - Passo 6)
            con.execute("""
            CREATE TABLE IF NOT EXISTS learning_memory (
              user_id TEXT,
              target_language TEXT,
              weak_vocab TEXT DEFAULT '[]',   -- JSON list
              weak_grammar TEXT DEFAULT '[]', -- JSON list
              recurring_errors TEXT DEFAULT '[]', -- JSON list
              last_feedback TEXT DEFAULT '{}',    -- JSON dict
              updated_at TEXT,
              PRIMARY KEY (user_id, target_language)
            )""")
            
            # ✅ NOVO: Micro Review Engine (Fase 1 - Passo 7)
            con.execute("""
            CREATE TABLE IF NOT EXISTS review_sessions (
              session_id TEXT PRIMARY KEY,
              user_id TEXT,
              started_at TEXT,
              ended_at TEXT,
              items_total INTEGER,
              items_done INTEGER DEFAULT 0,
              avg_score INTEGER DEFAULT 0,
              focus TEXT -- JSON
            )""")
            
            con.execute("""
            CREATE TABLE IF NOT EXISTS review_attempts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              session_id TEXT,
              exercise_id TEXT,
              type TEXT,
              user_input TEXT,
              score INTEGER,
              feedback_json TEXT,
              created_at TEXT
            )""")

            # ✅ NOVO: Gamification (Fase 1 - Passo 8)
            con.execute("""
            CREATE TABLE IF NOT EXISTS user_stats (
              user_id TEXT PRIMARY KEY,
              xp INTEGER DEFAULT 0,
              streak_days INTEGER DEFAULT 0,
              last_active_date TEXT,
              daily_goal_xp INTEGER DEFAULT 50,
              daily_xp INTEGER DEFAULT 0,
              daily_xp_date TEXT,
              updated_at TEXT
            )""")

            con.execute("""
            CREATE TABLE IF NOT EXISTS xp_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT,
              event_type TEXT, -- lesson_complete, review_complete, unit_complete
              ref_id TEXT,     -- lesson_id or session_id
              xp INTEGER,
              created_at TEXT
            )""")
            

            # ✅ NOVO: Meta-dados nas mensagens (Fase 1 - Passo 9)

            # Migração de meta-dados removida para Postgres compatibility

            # ✅ PERFORMANCE: Índices PostgreSQL
            con.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            con.execute("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)")
            con.execute("CREATE INDEX IF NOT EXISTS idx_progress_user ON user_progress(user_id)")
            con.execute("CREATE INDEX IF NOT EXISTS idx_progress_lesson ON user_progress(lesson_id)")
            con.execute("CREATE INDEX IF NOT EXISTS idx_stats_user ON user_stats(user_id)")

            # ✅ STABILITY: Ajuste de sequences (SERIAL)
            tables_with_serial = ["messages", "usage_logs", "lesson_attempt_details", "review_attempts", "xp_events"]
            for table in tables_with_serial:
                try:
                    # Ajusta o valor atual da sequence para o maior ID + 1
                    con.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)")
                except Exception:
                    pass

            
    def _exists(self, session_id: str) -> bool:
        with pg.connect(self.path) as con:
            row = con.execute("SELECT 1 FROM sessions WHERE session_id=?", (session_id,)).fetchone()
        return bool(row)
    
    # ✅ NOVO: Helper de normalização (Fase 1 - Passo 9)
    def normalize_ranked_list(self, items: list, key_field: str = "item", max_items: int = 20) -> list:
        # 1. Normalize input to list of dicts
        normalized = []
        for x in items:
            if isinstance(x, str):
                normalized.append({key_field: x, "count": 1})
            elif isinstance(x, dict):
                if key_field not in x: continue # Skip invalid
                if "count" not in x: x["count"] = 1
                normalized.append(x)
        
        # 2. Merge duplicates
        merged = {}
        for x in normalized:
            k = x[key_field]
            if k in merged:
                merged[k]["count"] += x["count"]
                # Start decay logic later if needed, for now just sum
            else:
                merged[k] = x
        
        # 3. Sort by count desc
        result = sorted(merged.values(), key=lambda x: x["count"], reverse=True)
        
        # 4. Limit
        if len(result) > max_items:
            # Optional Decay: reduce count of tail? 
            # For MVP, just slice.
            result = result[:max_items]
            
        return result

    def get_session(self, session_id: str):
        with pg.connect(self.path) as con:
            row = con.execute(
                "SELECT session_id, output_mode, language FROM sessions WHERE session_id=?",
                (session_id,)
            ).fetchone()

        if not row:
            return self.upsert_session(session_id, output_mode="text", language="pt")

        return {"session_id": row[0], "output_mode": row[1], "language": row[2]}

    def upsert_session(self, session_id: str, output_mode: str | None = None, language: str | None = None):
        now = datetime.now().isoformat()
        current = self.get_session(session_id) if self._exists(session_id) else {"output_mode": "text", "language": "pt"}

        out = output_mode or current["output_mode"]
        lang = language or current["language"]

        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO sessions(session_id, output_mode, language, updated_at)
            VALUES(?,?,?,?)
            ON CONFLICT(session_id) DO UPDATE SET
              output_mode=excluded.output_mode,
              language=excluded.language,
              updated_at=excluded.updated_at
            """, (session_id, out, lang, now))

        return {"session_id": session_id, "output_mode": out, "language": lang}

    def add_message(self, session_id: str, role: str, content: str, meta: dict = None):
        now = datetime.now().isoformat()
        import json
        meta_json = json.dumps(meta, ensure_ascii=False) if meta else None
        
        with pg.connect(self.path) as con:
            con.execute(
                "INSERT INTO messages(session_id, role, content, meta, created_at) VALUES(?,?,?,?,?)",
                (session_id, role, content, meta_json, now)
            )

    # ✅ NOVO: puxar últimas mensagens (janela curta) com suporte a meta e filtro
    def get_recent_messages(self, session_id: str, limit: int = 12, include_meta: bool = False):
        query = "SELECT role, content FROM messages"
        if include_meta:
            query = "SELECT role, content, meta FROM messages"
            
        with pg.connect(self.path) as con:
            rows = con.execute(f"""
              {query}
              WHERE session_id=?
              ORDER BY id DESC
              LIMIT ?
            """, (session_id, limit)).fetchall()
        rows.reverse()
        
        if include_meta:
            import json
            return [{"role": r[0], "content": r[1], "meta": json.loads(r[2]) if r[2] else None} for r in rows]
            
        return [{"role": r[0], "content": r[1]} for r in rows]

    # ✅ NOVO: contagem de mensagens (para decidir quando resumir)
    def count_messages(self, session_id: str) -> int:
        with pg.connect(self.path) as con:
            row = con.execute("""
              SELECT COUNT(*) FROM messages WHERE session_id=?
            """, (session_id,)).fetchone()
        return int(row[0] if row else 0)

    # ✅ NOVO: resumo
    def get_summary(self, session_id: str) -> str:
        with pg.connect(self.path) as con:
            row = con.execute("SELECT summary FROM summaries WHERE session_id=?", (session_id,)).fetchone()
        return row[0] if row else ""

    def upsert_summary(self, session_id: str, summary: str):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO summaries(session_id, summary, updated_at)
            VALUES(?,?,?)
            ON CONFLICT(session_id) DO UPDATE SET
              summary=excluded.summary,
              updated_at=excluded.updated_at
            """, (session_id, summary, now))

    # ✅ NOVO: créditos e uso
    def get_credits(self, session_id: str) -> int:
        with pg.connect(self.path) as con:
            row = con.execute("SELECT balance_cents FROM credits WHERE session_id=?", (session_id,)).fetchone()
        if not row:
            self.upsert_credits(session_id, 100) # 100 centavos default
            return 100
        return row[0]

    def upsert_credits(self, session_id: str, balance: int):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO credits(session_id, balance_cents, updated_at)
            VALUES(?,?,?)
            ON CONFLICT(session_id) DO UPDATE SET
              balance_cents=excluded.balance_cents,
              updated_at=excluded.updated_at
            """, (session_id, balance, now))

    def deduct_credits(self, session_id: str, amount_cents: int):
        with pg.connect(self.path) as con:
            con.execute("""
            UPDATE credits SET balance_cents = MAX(0, balance_cents - ?), updated_at = ?
            WHERE session_id = ?
            """, (amount_cents, datetime.now().isoformat(), session_id))

    def add_usage_log(self, session_id: str, provider: str, model: str, utype: str, input_units: int, output_units: int, cost_milli: int):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO usage_logs(session_id, provider, model, type, input_units, output_units, cost_millicents, created_at)
            VALUES(?,?,?,?,?,?,?,?)
            """, (session_id, provider, model, utype, input_units, output_units, cost_milli, now))

    # ✅ NOVO: Perfil do Aluno
    def get_profile(self, user_id: str):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            row = con.execute("SELECT * FROM user_profile WHERE user_id=?", (user_id,)).fetchone()
        return dict(row) if row else None

    def create_or_update_profile(self, user_id: str, target_language: str, native_language: str = 'pt', level: str = 'A1', goals: str = '', correction_style: str = 'moderado'):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            # Check if exists to preserve created_at if updating
            existing = con.execute("SELECT created_at FROM user_profile WHERE user_id=?", (user_id,)).fetchone()
            created_at = existing[0] if existing else now
            
            # Garantir default se native_language vier None
            if not native_language: native_language = 'pt'

            con.execute("""
            INSERT INTO user_profile(user_id, native_language, target_language, level, goals, correction_style, created_at, updated_at)
            VALUES(?,?,?,?,?,?,?,?)
            ON CONFLICT(user_id) DO UPDATE SET
              native_language=excluded.native_language,
              target_language=excluded.target_language,
              level=excluded.level,
              goals=excluded.goals,
              correction_style=excluded.correction_style,
              updated_at=excluded.updated_at
            """, (user_id, native_language, target_language, level, goals, correction_style, created_at, now))
        
        return self.get_profile(user_id)

    def add_lesson_attempt(self, user_id: str, lesson_id: str, step_index: int, user_input: str, overall_score: int, feedback_json: str):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO lesson_attempt_details(user_id, lesson_id, step_index, user_input, overall_score, feedback_json, timestamp)
            VALUES(?,?,?,?,?,?,?)
            """, (user_id, lesson_id, step_index, user_input, overall_score, feedback_json, now))

    def get_lesson_average_score(self, user_id: str, lesson_id: str) -> int:
        with pg.connect(self.path) as con:
            # 1. Pegar quando a lição começou
            start_row = con.execute("SELECT started_at FROM user_progress WHERE user_id=? AND lesson_id=?", (user_id, lesson_id)).fetchone()
            if not start_row: return 0
            
            started_at = start_row[0]
            
            # 2. Pegar média de tentativas após started_at
            avg_row = con.execute("""
            SELECT AVG(overall_score) FROM lesson_attempt_details 
            WHERE user_id=? AND lesson_id=? AND timestamp >= ?
            """, (user_id, lesson_id, started_at)).fetchone()
            
            if avg_row and avg_row[0] is not None:
                return int(avg_row[0])
            return 0

    # ✅ NOVO: Lições e Progresso (Fase 1 - Passo 3)
    def start_lesson(self, user_id: str, lesson_id: str, target_language: str, level: str):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            # 1. Update user_progress (init or increment attempts)
            existing = con.execute("SELECT attempts FROM user_progress WHERE user_id=? AND lesson_id=?", (user_id, lesson_id)).fetchone()
            attempts = existing[0] + 1 if existing else 1
            
            con.execute("""
            INSERT INTO user_progress(user_id, lesson_id, target_language, level, status, score, started_at, attempts)
            VALUES(?,?,?,?,?,?,?,?)
            ON CONFLICT(user_id, lesson_id) DO UPDATE SET
              status='started',
              started_at=excluded.started_at,
              attempts=excluded.attempts
            """, (user_id, lesson_id, target_language, level, "started", 0, now, attempts))
            
            # 2. Update active lesson state
            con.execute("""
            INSERT INTO user_lesson_state(user_id, lesson_id, step_index, active, updated_at)
            VALUES(?,?,?,?,?)
            ON CONFLICT(user_id) DO UPDATE SET
              lesson_id=excluded.lesson_id,
              step_index=excluded.step_index,
              active=excluded.active,
              updated_at=excluded.updated_at
            """, (user_id, lesson_id, 0, 1, now))

    def get_lesson_state(self, user_id: str):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            row = con.execute("SELECT * FROM user_lesson_state WHERE user_id=?", (user_id,)).fetchone()
        return dict(row) if row else None

    def set_lesson_state(self, user_id: str, step_index: int, active: int = 1):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("""
            UPDATE user_lesson_state SET step_index=?, active=?, updated_at=? WHERE user_id=?
            """, (step_index, active, now, user_id))

    def stop_lesson(self, user_id: str):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("UPDATE user_lesson_state SET active=0, updated_at=? WHERE user_id=?", (now, user_id))

    def complete_lesson(self, user_id: str, lesson_id: str, score: int = -1):
        # Se score -1, calcular média
        if score == -1:
            score = self.get_lesson_average_score(user_id, lesson_id)
            
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
             # Mark progress as completed
             con.execute("""
             UPDATE user_progress SET status='completed', score=?, completed_at=? 
             WHERE user_id=? AND lesson_id=?
             """, (score, now, user_id, lesson_id))
             
             # Deactivate lesson state
             con.execute("UPDATE user_lesson_state SET active=0, updated_at=? WHERE user_id=?", (now, user_id))

    def get_progress(self, user_id: str):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            rows = con.execute("SELECT * FROM user_progress WHERE user_id=?", (user_id,)).fetchall()
        return [dict(r) for r in rows]

    # ✅ NOVO: Learning Memory (Fase 1 - Passo 6)
    def get_learning_memory(self, user_id: str, target_language: str = "en"):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            row = con.execute(
                "SELECT * FROM learning_memory WHERE user_id=? AND target_language=?", 
                (user_id, target_language)
            ).fetchone()
        
        if not row:
            return {
                "user_id": user_id,
                "target_language": target_language,
                "weak_vocab": [],
                "weak_grammar": [],
                "recurring_errors": [],
                "last_feedback": {}
            }
            
        import json
        return {
            "user_id": row["user_id"],
            "target_language": row["target_language"],
            "weak_vocab": json.loads(row["weak_vocab"] or "[]"),
            "weak_grammar": json.loads(row["weak_grammar"] or "[]"),
            "recurring_errors": json.loads(row["recurring_errors"] or "[]"),
            "last_feedback": json.loads(row["last_feedback"] or "{}"),
            "updated_at": row["updated_at"]
        }

    def upsert_learning_memory(self, user_id: str, target_language: str, patch: dict):
        # patch pode conter: weak_vocab_add, weak_grammar_add, recurring_error_add, last_feedback
        # Precisamos carregar o atual, fazer merge e salvar.
        
        current = self.get_learning_memory(user_id, target_language)
        import json
        from datetime import datetime
        
        # Normalização com limite e dedup (Fase 1 - Passo 9)
        weak_vocab = self.normalize_ranked_list(
            current["weak_vocab"] + patch.get("weak_vocab_add", []), 
            key_field="word", 
            max_items=20
        )
        
        weak_grammar = self.normalize_ranked_list(
            current["weak_grammar"] + patch.get("weak_grammar_add", []), 
            key_field="rule", 
            max_items=20
        )
        
        recurring = self.normalize_ranked_list(
            current["recurring_errors"] + patch.get("recurring_error_add", []), 
            key_field="error", 
            max_items=20
        )
        
        last_fb = patch.get("last_feedback") or current["last_feedback"]
        
        now = datetime.now().isoformat()
        
        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO learning_memory(user_id, target_language, weak_vocab, weak_grammar, recurring_errors, last_feedback, updated_at)
            VALUES(?,?,?,?,?,?,?)
            ON CONFLICT(user_id, target_language) DO UPDATE SET
              weak_vocab=excluded.weak_vocab,
              weak_grammar=excluded.weak_grammar,
              recurring_errors=excluded.recurring_errors,
              last_feedback=excluded.last_feedback,
              updated_at=excluded.updated_at
            """, (
                user_id, 
                target_language, 
                json.dumps(weak_vocab, ensure_ascii=False),
                json.dumps(weak_grammar, ensure_ascii=False),
                json.dumps(recurring, ensure_ascii=False),
                json.dumps(last_fb, ensure_ascii=False),
                now
            ))

    def recompute_learning_memory_from_attempts(self, user_id: str, target_language: str, limit: int = 50):
        # Scan last N attempts details to rebuild/refine memory
        pass 

    # ✅ NOVO: Micro Review Engine (Fase 1 - Passo 7)
    def create_review_session(self, session_id: str, user_id: str, items_total: int, focus: dict):
        now = datetime.now().isoformat()
        import json
        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO review_sessions(session_id, user_id, started_at, items_total, items_done, avg_score, focus)
            VALUES(?,?,?,?,?,?,?)
            """, (session_id, user_id, now, items_total, 0, 0, json.dumps(focus, ensure_ascii=False)))

    def get_review_session(self, session_id: str):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            row = con.execute("SELECT * FROM review_sessions WHERE session_id=?", (session_id,)).fetchone()
        return dict(row) if row else None

    def add_review_attempt(self, session_id: str, exercise_id: str, r_type: str, user_input: str, score: int, feedback: dict):
        now = datetime.now().isoformat()
        import json
        with pg.connect(self.path) as con:
            # Add attempt
            con.execute("""
            INSERT INTO review_attempts(session_id, exercise_id, type, user_input, score, feedback_json, created_at)
            VALUES(?,?,?,?,?,?,?)
            """, (session_id, exercise_id, r_type, user_input, score, json.dumps(feedback, ensure_ascii=False), now))
            
            # Update session stats
            # Recalculate avg
            attempts = con.execute("SELECT score FROM review_attempts WHERE session_id=?", (session_id,)).fetchall()
            if attempts:
                scores = [r[0] for r in attempts]
                avg = int(sum(scores) / len(scores))
                count = len(scores)
                con.execute("""
                UPDATE review_sessions SET items_done=?, avg_score=? WHERE session_id=?
                """, (count, avg, session_id))

    def finish_review_session(self, session_id: str):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("UPDATE review_sessions SET ended_at=? WHERE session_id=?", (now, session_id))
            
    def get_review_history(self, user_id: str, limit: int = 10):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            rows = con.execute("""
            SELECT * FROM review_sessions 
            WHERE user_id=? AND ended_at IS NOT NULL 
            ORDER BY started_at DESC LIMIT ?
            """, (user_id, limit)).fetchall()
        return [dict(r) for r in rows]

    # ✅ NOVO: Gamification Methods (Fase 1 - Passo 8)
    def get_stats(self, user_id: str):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            row = con.execute("SELECT * FROM user_stats WHERE user_id=?", (user_id,)).fetchone()
            if not row:
                # Initialize default stats
                now = datetime.now().isoformat()
                con.execute("""
                INSERT INTO user_stats(user_id, xp, streak_days, last_active_date, daily_goal_xp, daily_xp, daily_xp_date, updated_at)
                VALUES(?, 0, 0, NULL, 50, 0, ?, ?)
                """, (user_id, now, now))
                return {
                    "user_id": user_id,
                    "xp": 0,
                    "streak_days": 0,
                    "last_active_date": None,
                    "daily_goal_xp": 50,
                    "daily_xp": 0,
                    "daily_xp_date": now,
                    "updated_at": now
                }
            return dict(row)

    def update_streak(self, user_id: str):
        stats = self.get_stats(user_id)
        from datetime import datetime, timedelta
        today = datetime.now().strftime("%Y-%m-%d")
        last_active = stats.get("last_active_date") # Can be full ISO or YYYY-MM-DD. Let's assume we store ISO but compare YYYY-MM-DD
        
        last_date_str = last_active.split("T")[0] if last_active else None
        
        new_streak = stats["streak_days"]
        
        if last_date_str == today:
            pass # Already active today
        else:
            # Check if yesterday
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            if last_date_str == yesterday:
                new_streak += 1
            else:
                new_streak = 1 # Reset or start
        
        # Update daily metrics
        daily_xp = stats["daily_xp"]
        if stats.get("daily_xp_date", "").split("T")[0] != today:
            daily_xp = 0 # Reset daily XP
            
        with pg.connect(self.path) as con:
            con.execute("""
            UPDATE user_stats 
            SET streak_days=?, last_active_date=?, daily_xp=?, daily_xp_date=? 
            WHERE user_id=?
            """, (new_streak, datetime.now().isoformat(), daily_xp, datetime.now().isoformat(), user_id))

    def add_xp(self, user_id: str, amount: int, event_type: str, ref_id: str):
        # 1. Idempotency check
        with pg.connect(self.path) as con:
            exists = con.execute("""
            SELECT 1 FROM xp_events WHERE user_id=? AND event_type=? AND ref_id=?
            """, (user_id, event_type, ref_id)).fetchone()
            
            if exists:
                return False # Already awarded
                
            # 2. Add Event
            now = datetime.now().isoformat()
            con.execute("""
            INSERT INTO xp_events(user_id, event_type, ref_id, xp, created_at)
            VALUES(?,?,?,?,?)
            """, (user_id, event_type, ref_id, amount, now))
            
            # 3. Update User Stats (Atomic update)
            # Ensure stats exist and streak is up to date first? 
            # Ideally update_streak matches date logic.
            # But let's just add to total and daily.
            
            # Need to get current daily_xp to safely increment?
            # Or just UPDATE ... SET xp = xp + ?, daily_xp = daily_xp + ?
            # But we need to handle day reset. update_streak handles reset check given we call it before or after.
            # Let's call update_streak FIRST to ensure day boundary is respected.
            pass
            
        self.update_streak(user_id) 
        
        with pg.connect(self.path) as con:
             con.execute("""
             UPDATE user_stats 
             SET xp = xp + ?, daily_xp = daily_xp + ?
             WHERE user_id=?
             """, (amount, amount, user_id))
             
        return True

    # ✅ NOVO: Métodos de Usuário (Fase 1 - Passo 4)
    def create_user(self, user_id: str, email: str, password_hash: str, name: str):
        now = datetime.now().isoformat()
        with pg.connect(self.path) as con:
            con.execute("""
            INSERT INTO users (id, email, password_hash, name, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (user_id, email, password_hash, name, now))
            return True

    def get_user_by_email(self, email: str):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            row = con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: str):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            row = con.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            return dict(row) if row else None

    # NOVO: Moderação (Fase 2)
    def update_user_role(self, user_id: str, new_role: str):
        with pg.connect(self.path) as con:
            con.execute("UPDATE users SET role=? WHERE id=?", (new_role, user_id))
            return True

    # NOVO MÉTODOS EM store.py PARA O ADMIN:
    def get_all_users_basic_info(self):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            rows = con.execute("SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

    def get_admin_dashboard_stats(self):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            total_users = con.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            total_lessons = con.execute("SELECT COUNT(*) FROM user_progress WHERE status='completed'").fetchone()[0]
        return {"total_users": total_users, "completed_lessons": total_lessons}

    def get_admin_recent_activity(self, limit: int = 15):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            # Fetch recent lesson activities from user_progress
            rows = con.execute("""
            SELECT 'lesson' as type, up.lesson_id as item_id, up.user_id, u.name as user_name, u.email as user_email, up.status, up.started_at, up.completed_at
            FROM user_progress up
            LEFT JOIN users u ON up.user_id = u.id
            ORDER BY COALESCE(up.completed_at, up.started_at) DESC
            LIMIT ?
            """, (limit,)).fetchall()
        return [dict(r) for r in rows]

    def get_admin_lessons_progress(self, limit: int = 50):
        with pg.connect(self.path) as con:
            con.row_factory = pg.Row
            rows = con.execute("""
            SELECT up.lesson_id, up.user_id, u.name as user_name, up.target_language, up.level, up.status, up.score, up.attempts, up.started_at, up.completed_at 
            FROM user_progress up
            LEFT JOIN users u ON up.user_id = u.id
            ORDER BY up.started_at DESC
            LIMIT ?
            """, (limit,)).fetchall()
        return [dict(r) for r in rows]

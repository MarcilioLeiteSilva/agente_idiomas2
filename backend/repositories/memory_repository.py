from db.postgres_adapter import PostgresShim as pg
import json
from datetime import datetime
from core.config import config

class MemoryRepository:
    def __init__(self, db_path=None):
        self.db_path = db_path

    def add_memory_event(self, user_id, source_type, source_id, interaction_id, 
                           event_type, category, topic_key, severity, evidence, 
                           subtopic_key=None, confidence=1.0, metadata_json=None):
        now = datetime.now().isoformat()
        with pg.connect(self.db_path) as con:
            con.execute("""
            INSERT INTO memory_events 
            (user_id, source_type, source_id, interaction_id, event_type, category, topic_key, 
             subtopic_key, severity, confidence, evidence_text, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (user_id, source_type, source_id, interaction_id, event_type, category, topic_key,
                  subtopic_key, severity, confidence, evidence, metadata_json, now))

    def get_user_memory_items(self, user_id):
        with pg.connect(self.db_path) as con:
            con.row_factory = pg.Row
            rows = con.execute("SELECT * FROM memory_items WHERE user_id=?", (user_id,)).fetchall()
        return [dict(r) for r in rows]

    def upsert_memory_item(self, user_id, category, topic_key, status="active", **kwargs):
        now = datetime.now().isoformat()
        # Fetch current if any
        items = self.get_user_memory_items(user_id)
        current = next((i for i in items if i["topic_key"] == topic_key), None)
        
        if not current:
            # Create
            fields = {
                "user_id": user_id,
                "category": category,
                "topic_key": topic_key,
                "status": status,
                "created_at": now,
                "updated_at": now,
                "first_seen_at": now,
                "last_seen_at": now
            }
            fields.update(kwargs)
            
            keys = ", ".join(fields.keys())
            placeholders = ", ".join(["?" for _ in fields])
            values = list(fields.values())
            
            with pg.connect(self.db_path) as con:
                con.execute(f"INSERT INTO memory_items ({keys}) VALUES ({placeholders})", values)
        else:
            # Update only provided fields
            update_data = {
                "updated_at": now,
                "last_seen_at": now
            }
            update_data.update(kwargs)
            
            set_clause = ", ".join([f"{k}=?" for k in update_data.keys()])
            values = list(update_data.values())
            values.append(user_id)
            values.append(topic_key)
            
            with pg.connect(self.db_path) as con:
                con.execute(f"UPDATE memory_items SET {set_clause} WHERE user_id=? AND topic_key=?", values)

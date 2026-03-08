import json
import os
from pathlib import Path

class LessonEngine:
    def __init__(self, lessons_dir=None):
        if lessons_dir is None:
            # Caminho absoluto relativo a este arquivo: backend/learning/lessons/
            # Robusto em qualquer CWD (Docker, local, CI)
            self.lessons_dir = Path(__file__).resolve().parent / "lessons"
        else:
            p = Path(lessons_dir)
            self.lessons_dir = p if p.is_absolute() else Path(__file__).resolve().parent / lessons_dir
        self._cache = {}  # Key: (target_language, level_key), Value: {'data': dict, 'mtime': float, 'loaded_at': float}

    # Mapeamento centralizado (reutilizado por load_lessons e get_lesson_by_id)
    LEVEL_MAP = {
        # Português (vindo do frontend: onboarding, settings)
        "básico":        "a1",
        "intermediário": "b1",
        "avançado":      "c1",
        # Inglês (fallback)
        "basic":         "a1",
        "intermediate":  "b1",
        "advanced":      "c1",
        # Técnico direto
        "a1": "a1",
        "a2": "a2",
        "b1": "b1",
        "b2": "b2",
        "c1": "c1",
        "c2": "c2",
    }

    def load_lessons(self, target_language: str, level: str) -> dict:
        """Load lessons from JSON catalog with caching."""
        if not target_language or not level:
            return {"error": "Missing parameters"}

        mapped_level = self.LEVEL_MAP.get(level.lower(), level.lower())
        file_path = self.lessons_dir / target_language.lower() / f"{mapped_level}.json"

        if not file_path.exists():
            return {"error": "Catalog not found", "path": str(file_path)}

        # Cache Check
        import time
        current_mtime = 0
        try:
            current_mtime = file_path.stat().st_mtime
        except Exception:
            pass

        key = (target_language.lower(), mapped_level)
        cached = self._cache.get(key)
        now = time.time()

        if cached:
            is_valid = False
            if current_mtime > 0:
                if abs(current_mtime - cached["mtime"]) < 0.001:
                    is_valid = True
            else:
                if (now - cached["loaded_at"]) < 300:
                    is_valid = True

            if is_valid:
                return cached["data"]

        # Load from disk
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self._cache[key] = {
                "data": data,
                "mtime": current_mtime,
                "loaded_at": now
            }
            return data
        except Exception as e:
            return {"error": f"Error loading catalog: {str(e)}"}

    def get_lesson_by_id(self, target_language: str, lesson_id: str):
        """Find a specific lesson in the catalog using cached load if possible."""
        # Iteramos todos os níveis padrão existentes
        standard_levels = ["A1", "A2", "B1", "B2", "C1", "C2"]

        for level in standard_levels:
            catalog = self.load_lessons(target_language, level)
            if "lessons" in catalog:
                for lesson in catalog["lessons"]:
                    actual_id = lesson.get("id") or lesson.get("lesson_id")
                    if actual_id == lesson_id:
                        return lesson

        # Fallback: scan de todos os arquivos JSON do idioma
        lang_dir = self.lessons_dir / target_language.lower()
        if lang_dir.exists() and lang_dir.is_dir():
            for json_file in lang_dir.glob("*.json"):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    if "lessons" in data:
                        for lesson in data["lessons"]:
                            actual_id = lesson.get("id") or lesson.get("lesson_id")
                            if actual_id == lesson_id:
                                return lesson
                except Exception:
                    continue

        return None

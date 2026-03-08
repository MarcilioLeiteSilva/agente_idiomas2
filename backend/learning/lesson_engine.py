import json
import os
from pathlib import Path

class LessonEngine:
    def __init__(self, lessons_dir="learning/lessons"):
        self.lessons_dir = Path(lessons_dir)
        self._cache = {} # Key: (target_language, level), Value: {'data': dict, 'mtime': float, 'loaded_at': float}

    def load_lessons(self, target_language: str, level: str) -> dict:
        """Load lessons from JSON catalog with caching."""
        if not target_language or not level:
             return {"error": "Missing parameters"}
             
        # Mapping for user-friendly levels to technical filenames
        level_map = {
            "básico": "a1",
            "intermediário": "b1",
            "avançado": "c1",
            "a1": "a1",
            "b1": "b1",
            "c1": "c1"
        }
        
        mapped_level = level_map.get(level.lower(), level.lower())
        file_path = self.lessons_dir / target_language.lower() / f"{mapped_level}.json"
        
        if not file_path.exists():
            return {"error": "Catalog not found", "path": str(file_path)}
            
        # Cache Check
        import time
        current_mtime = 0
        try:
            current_mtime = file_path.stat().st_mtime
        except Exception:
            pass # Should not happen if exists() was true, but race condition possible
            
        key = (target_language, level)
        cached = self._cache.get(key)
        now = time.time()
        
        if cached:
            # Valid if mtime matches (file hasn't changed) 
            # OR if mtime is 0/unavailable check TTL (300s)
            is_valid = False
            if current_mtime > 0:
                if abs(current_mtime - cached["mtime"]) < 0.001: 
                    is_valid = True
            else:
                # Fallback TTL
                if (now - cached["loaded_at"]) < 300:
                    is_valid = True
            
            if is_valid:
                return cached["data"]

        # Load from disk
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            # Update Cache
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
        # Optimization: We know valid levels are A1, A2, B1, B2. 
        # Instead of globbing, we can iterate these standard levels to use the cache.
        # If files don't exist, load_lessons handles it gracefully (returns error dict).
        
        levels = ["A1", "A2", "B1", "B2"]
        
        for level in levels:
            # Use self.load_lessons to benefit from cache
            catalog = self.load_lessons(target_language, level)
            if "lessons" in catalog:
                for lesson in catalog["lessons"]:
                    # Suportar tanto 'id' quanto 'lesson_id' do JSON
                    actual_id = lesson.get("id") or lesson.get("lesson_id")
                    if actual_id == lesson_id:
                        return lesson
            # Fallback for "error" return or dict without "lessons" list
            
        # Fallback: scan directory for non-standard levels? 
        # For this phase, standard levels are sufficient.
        return None

import os
from pathlib import Path

class Config:
    # Base dir: backend/
    BASE_DIR = Path(__file__).resolve().parent.parent
    
    # DB path from env or default
    DATABASE_URL = os.getenv("DATABASE_URL", "data/app.db")
    
    # Ensure relative paths are handled if not absolute
    if not DATABASE_URL.startswith("/") and not DATABASE_URL.startswith("c:\\") and not DATABASE_URL.startswith("sqlite"):
        DB_PATH = str(BASE_DIR / DATABASE_URL)
    else:
        DB_PATH = DATABASE_URL
        
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # Frontend path (not really used in Docker production but for local)
    WEB_DIR = BASE_DIR.parent / "frontend"

config = Config()

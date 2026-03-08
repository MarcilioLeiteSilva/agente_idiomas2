import os
from pathlib import Path

class Config:
    # Base dir: backend/
    BASE_DIR = Path(__file__).resolve().parent.parent
    
    # DB path from env or default for Docker
    DB_PATH = os.getenv("DB_PATH", "/app/data/app.db")
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # Frontend path (not really used in Docker production but for local)
    WEB_DIR = BASE_DIR.parent / "frontend"

config = Config()

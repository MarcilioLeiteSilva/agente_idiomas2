import os
from pathlib import Path

class Config:
    # Base dir: backend/
    BASE_DIR = Path(__file__).resolve().parent.parent
    
    # Database URL from env
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # Frontend path (not really used in Docker production but for local)
    WEB_DIR = BASE_DIR.parent / "frontend"

config = Config()

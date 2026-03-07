@echo off
echo ==========================================
echo   Iniciando Agente Idiomas (V13 - Fase 1)
echo ==========================================
echo 1. Ativando ambiente virtual...
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
)
echo 2. Iniciando servidor FastAPI...
echo O frontend estara disponivel em: http://127.0.0.1:8000
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause

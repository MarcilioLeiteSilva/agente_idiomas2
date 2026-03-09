from fastapi import APIRouter, Depends, HTTPException
from app.api.dependencies.security import get_admin_user
from pydantic import BaseModel

router = APIRouter(prefix="/v1/admin", tags=["Admin"])

class RoleUpdateReq(BaseModel):
    role: str

@router.get("/dashboard")
def get_dashboard_stats(admin_user: dict = Depends(get_admin_user)):
    from app.main import store
    stats = store.get_admin_dashboard_stats()
    return {"status": "success", "data": stats}

@router.get("/users")
def get_users_list(admin_user: dict = Depends(get_admin_user)):
    from app.main import store
    users = store.get_all_users_basic_info()
    return {"status": "success", "data": users}

@router.get("/lessons")
def get_lessons_progress(admin_user: dict = Depends(get_admin_user)):
    from app.main import store
    lessons = store.get_admin_lessons_progress(limit=50)
    return {"status": "success", "data": lessons}

@router.get("/activity")
def get_recent_activity(admin_user: dict = Depends(get_admin_user)):
    from app.main import store
    activity = store.get_admin_recent_activity(limit=20)
    return {"status": "success", "data": activity}

@router.post("/users/{user_id}/block")
def block_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    from app.main import store
    if user_id == admin_user.get("id"):
         raise HTTPException(status_code=400, detail="Não pode bloquear o próprio usuário")
    
    store.update_user_role(user_id, "blocked")
    return {"status": "success", "message": f"Usuário {user_id} bloqueado com sucesso."}

@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, req: RoleUpdateReq, admin_user: dict = Depends(get_admin_user)):
    from app.main import store
    if user_id == admin_user.get("id") and req.role != "admin":
         raise HTTPException(status_code=400, detail="Não pode remover seus próprios privilégios")
         
    if req.role not in ["admin", "student", "blocked"]:
         raise HTTPException(status_code=400, detail="Papel inválido")
         
    store.update_user_role(user_id, req.role)
    return {"status": "success", "message": f"Papel de {user_id} atualizado para {req.role}"}

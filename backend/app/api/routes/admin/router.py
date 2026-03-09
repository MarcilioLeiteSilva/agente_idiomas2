from fastapi import APIRouter, Depends
from app.api.dependencies.security import get_admin_user

router = APIRouter(prefix="/v1/admin", tags=["Admin"])

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

@router.post("/users/{user_id}/block")
def block_user(user_id: str, admin_user: dict = Depends(get_admin_user)):
    # Estrutura preparada para expansão (bloqueio fictício implementado)
    return {"status": "success", "message": f"Usuário {user_id} teria acesso revogado nesta versão."}

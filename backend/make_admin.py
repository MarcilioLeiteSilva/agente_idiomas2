import sqlite3
import os
import sys

def make_admin(email_or_id: str):
    # Try normal docker path, then local mount path
    db_path = os.getenv("DATABASE_URL", os.getenv("DB_PATH", "/app/data/app.db"))
    
    if not os.path.exists(db_path):
        # Fallback for local testing if running outside container
        db_path = "../data/app.db" if os.path.exists("../data/app.db") else "data/app.db"
    
    # Check if the DB exists first
    if not os.path.exists(db_path):
        print(f"Erro: Banco de dados não encontrado em {db_path}")
        print("Certifique-se de executar isso dentro do container do backend ou na raiz do projeto.")
        sys.exit(1)
        
    try:
        with sqlite3.connect(db_path) as con:
            con.row_factory = sqlite3.Row
            cursor = con.cursor()
            
            # Find the user first
            user = cursor.execute("SELECT id, name, email, role FROM users WHERE email = ? OR id = ?", (email_or_id, email_or_id)).fetchone()
            
            if not user:
                print(f"Erro: Usuário '{email_or_id}' não localizado na tabela 'users'.")
                sys.exit(1)
                
            user_id = user["id"]
            user_email = user["email"]
            current_role = user["role"]
            
            if current_role == "admin":
                print(f"Aviso: O usuário {user_email} (ID: {user_id}) JÁ É um 'admin'. Nenhuma mudança foi feita.")
                sys.exit(0)
                
            cursor.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user_id,))
            con.commit()
            print(f"Sucesso! O usuário {user_email} (ID: {user_id}) foi promovido a 'admin'.")
            print("Você já pode fazer login e acessar /admin.html")
            
    except Exception as e:
        print(f"Erro ao acessar o banco de dados: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python make_admin.py <email_do_usuario>")
        sys.exit(1)
        
    target_user = sys.argv[1]
    make_admin(target_user)

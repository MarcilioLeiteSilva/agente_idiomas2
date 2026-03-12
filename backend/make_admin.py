from db.postgres_adapter import PostgresShim as pg
import os
import sys

def make_admin(email_or_id: str):
    # O adaptador Postgres ignora o path pois usa DATABASE_URL do env
    db_path = None
    
    try:
        with pg.connect(db_path) as con:
            con.row_factory = pg.Row
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

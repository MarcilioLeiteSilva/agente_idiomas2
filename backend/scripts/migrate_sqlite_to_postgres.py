import sqlite3
import psycopg2
from psycopg2.extras import DictCursor
import os
from dotenv import load_dotenv

# Load env variables from .env if running from terminal
load_dotenv(dotenv_path="../.env")
load_dotenv()

SQLITE_DB_PATH = os.getenv("DB_PATH", "../data/app.db")
if not os.path.exists(SQLITE_DB_PATH):
    SQLITE_DB_PATH = "data/app.db"

PG_URL = os.getenv("DATABASE_URL")

if not PG_URL:
    print("Erro: DATABASE_URL não definida.")
    exit(1)

if PG_URL.startswith("postgres://"):
    PG_URL = PG_URL.replace("postgres://", "postgresql://", 1)

def migrate():
    print(f"Conectando ao SQLite em {SQLITE_DB_PATH}...")
    try:
        sl_conn = sqlite3.connect(SQLITE_DB_PATH)
        sl_conn.row_factory = sqlite3.Row
        sl_cur = sl_conn.cursor()
    except Exception as e:
        print(f"Erro SQLite: {e}")
        return

    print(f"Conectando ao PostgreSQL...")
    try:
        pg_conn = psycopg2.connect(PG_URL)
        pg_cur = pg_conn.cursor()
    except Exception as e:
        print(f"Erro Postgres: {e}")
        return

    # Ordem das tabelas importante por causa de dependências de constraint (se hover, mas aqui não tem FK explícitas listadas no SQLite original)
    tables = [
        "sessions",
        "messages",
        "summaries",
        "credits",
        "usage_logs",
        "users",
        "user_profile",
        "user_progress",
        "user_lesson_state",
        "lesson_attempt_details",
        "learning_memory",
        "review_sessions",
        "review_attempts",
        "user_stats",
        "xp_events"
    ]

    for table in tables:
        print(f"Migrando tabela '{table}'...")
        try:
            # Check if table exists in SQLite
            sl_cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not sl_cur.fetchone():
                print(f"  Aviso: Tabela '{table}' não encontrada no SQLite. Pulando.")
                continue

            # Fetch rows
            sl_cur.execute(f"SELECT * FROM {table}")
            rows = sl_cur.fetchall()
            
            if not rows:
                print(f"  Tabela '{table}' vazia.")
                continue
            
            # Get columns from first row
            columns = rows[0].keys()
            col_names = ", ".join(columns)
            placeholders = ", ".join(["%s"] * len(columns))
            
            insert_query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;"
            
            data_to_insert = [tuple(row) for row in rows]
            
            from psycopg2.extras import execute_batch
            execute_batch(pg_cur, insert_query, data_to_insert)
            
            pg_conn.commit()
            print(f"  {len(rows)} registros migrados em '{table}'.")

            # Update sequences if table has an 'id' SERIAL
            try:
                pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id)+1 FROM {table}), 1), false);")
                pg_conn.commit()
            except Exception as e:
                pg_conn.rollback() # Not an error, some tables don't have serial id
        
        except Exception as e:
            pg_conn.rollback()
            print(f"  Erro ao migrar '{table}': {e}")
            
    # Also migrate Memory Items and Memory events if they exist (MemoryRepository V2)
    memory_tables = ["memory_items", "memory_events"]
    for table in memory_tables:
        print(f"Verificando tabela legado de memória '{table}'...")
        try:
            sl_cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if sl_cur.fetchone():
                sl_cur.execute(f"SELECT * FROM {table}")
                rows = sl_cur.fetchall()
                if rows:
                    columns = rows[0].keys()
                    col_names = ", ".join(columns)
                    placeholders = ", ".join(["%s"] * len(columns))
                    insert_query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;"
                    execute_batch(pg_cur, insert_query, [tuple(row) for row in rows])
                    pg_conn.commit()
                    print(f"  {len(rows)} registros migrados em '{table}'.")
        except Exception as e:
            pg_conn.rollback()

    sl_conn.close()
    pg_conn.close()
    print("Migração concluída com sucesso!")

if __name__ == "__main__":
    migrate()

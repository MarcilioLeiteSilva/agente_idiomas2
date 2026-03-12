import os
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import DictCursor
import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("postgres_adapter")

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            logger.error("DATABASE_URL is not set in environment or .env file.")
            raise ValueError("DATABASE_URL is not set in environment or .env file.")
        
        # Convert dialect for psycopg2
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)

        try:
            # Enhanced Pool Configuration as per request
            # pool_size=10, max_overflow=20 -> minconn=10, maxconn=30
            _pool = ThreadedConnectionPool(
                minconn=10, 
                maxconn=30, 
                dsn=db_url
            )
            logger.info("PostgreSQL connected and pool initialized.")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise e
            
    return _pool

class DBCursor:
    def __init__(self, cur):
        self._cur = cur

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def fetchmany(self, size=None):
        if size is None:
            return self._cur.fetchmany()
        return self._cur.fetchmany(size)
        
    @property
    def rowcount(self):
        return self._cur.rowcount

class DBConnectionWrapper:
    def __init__(self, conn, pool):
        self._conn = conn
        self._pool = pool
        self.row_factory = None

    def execute(self, query, params=None):
        q = query.replace("?", "%s")
        # Migrate schema dynamically (legacy support)
        q = q.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        
        # Convert SQLite specific things
        # CREATE TABLE IF NOT EXISTS is fine in Postgres
        
        cf = DictCursor if self.row_factory else None
        
        try:
            cur = self._conn.cursor(cursor_factory=cf)
            
            # json serialization for complex parameters in tuple
            if params:
                new_params = []
                for p in params:
                    if isinstance(p, (dict, list)):
                        new_params.append(json.dumps(p, ensure_ascii=False))
                    else:
                        new_params.append(p)
                params = tuple(new_params)
                
            cur.execute(q, params or ())
            return DBCursor(cur)
        except Exception as e:
            # If a command fails, Postgres aborts the transaction. 
            # We might want to rollback here or at least log it.
            logger.error(f"SQL Execution error: {e}\nQuery: {q}")
            raise e

    def executemany(self, query, params_seq):
        q = query.replace("?", "%s")
        cf = DictCursor if self.row_factory else None
        try:
            cur = self._conn.cursor(cursor_factory=cf)
            
            # json serialization
            new_seq = []
            for p in params_seq:
                new_params = []
                for v in p:
                    if isinstance(v, (dict, list)):
                        new_params.append(json.dumps(v, ensure_ascii=False))
                    else:
                        new_params.append(v)
                new_seq.append(tuple(new_params))

            cur.executemany(q, new_seq)
            return DBCursor(cur)
        except Exception as e:
            logger.error(f"SQL Executemany error: {e}\nQuery: {q}")
            raise e

    def commit(self):
        try:
            self._conn.commit()
        except Exception as e:
            logger.error(f"Commit error: {e}")
            raise e

    def rollback(self):
        try:
            self._conn.rollback()
        except Exception as e:
            logger.error(f"Rollback error: {e}")
            raise e

    def close(self):
        if self._conn and self._pool:
            try:
                # Always try to commit before returning to pool if no error?
                # Actually usually we want it handled by the context manager.
                self._pool.putconn(self._conn)
            except Exception as e:
                logger.error(f"Error returning connection to pool: {e}")
            self._conn = None
            
    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._conn:
            try:
                if exc_type is None:
                    self.commit()
                else:
                    self.rollback()
            finally:
                self.close()

class PostgresShim:
    Row = True
    
    @staticmethod
    def connect(db_path=None, check_same_thread=False):
        pool = get_pool()
        conn = pool.getconn()
        return DBConnectionWrapper(conn, pool)

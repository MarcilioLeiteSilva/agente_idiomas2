import os
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import DictCursor
import json

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL is not set in environment or .env file.")
        
        # Convert dialect for psycopg2
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)

        _pool = SimpleConnectionPool(1, 20, dsn=db_url)
    return _pool

class DBCursor:
    def __init__(self, cur):
        self._cur = cur

    def fetchone(self):
        row = self._cur.fetchone()
        return row

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
        # Migrate schema dynamically
        q = q.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
        
        # In SQLite: SELECT 1 FROM sessions WHERE session_id=?
        # In Postgres: SELECT 1 FROM sessions WHERE session_id=%s
        
        cf = DictCursor if self.row_factory else None
        
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

    def executemany(self, query, params_seq):
        q = query.replace("?", "%s")
        cf = DictCursor if self.row_factory else None
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

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        if self._conn and self._pool:
            self.commit()
            self._pool.putconn(self._conn)
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

class sqlite_mock:
    Row = True
    
    @staticmethod
    def connect(db_path=None, check_same_thread=False):
        pool = get_pool()
        conn = pool.getconn()
        return DBConnectionWrapper(conn, pool)


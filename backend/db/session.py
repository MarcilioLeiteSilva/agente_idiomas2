import os
from .postgres_adapter import PostgresShim as pg
from core.config import config

class DatabaseSession:
    def __init__(self, db_path=None):
        self.db_path = db_path

    def get_connection(self):
        # O adaptador Postgres ignora o path pois usa DATABASE_URL do env
        con = pg.connect(self.db_path)
        con.row_factory = pg.Row
        return con

db = DatabaseSession()

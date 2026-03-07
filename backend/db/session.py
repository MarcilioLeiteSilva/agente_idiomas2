import sqlite3
from core.config import config

class DatabaseSession:
    def __init__(self, db_path=config.DB_PATH):
        self.db_path = db_path

    def get_connection(self):
        con = sqlite3.connect(self.db_path)
        con.row_factory = sqlite3.Row
        return con

db = DatabaseSession()

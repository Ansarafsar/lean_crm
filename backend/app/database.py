import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "crm.db"))
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


@event.listens_for(Engine, "connect")
def _enable_foreign_keys(dbapi_connection, _connection_record):
    """SQLite ignores foreign keys unless asked, per-connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

_connect_args: dict = {}
if settings.use_sqlite:
    _connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.sqlalchemy_database_uri,
    pool_pre_ping=not settings.use_sqlite,
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

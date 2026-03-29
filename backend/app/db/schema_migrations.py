from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_users_specialization_column(engine: Engine) -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    if "specialization" in cols:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN specialization TEXT NOT NULL DEFAULT ''"))

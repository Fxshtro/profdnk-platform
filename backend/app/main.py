from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import Base
from app.db.schema_migrations import ensure_users_specialization_column
from app.db.session import SessionLocal, engine, get_db
from app.models import Role, User
from app.routers import admin, auth, panel, psychologist, public
from app.security import get_password_hash

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Psychology service")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_initial_admin() -> None:
    if not settings.initial_admin_email or not settings.initial_admin_password:
        return
    db = SessionLocal()
    try:
        if db.query(User).filter(User.role == Role.ADMIN).first():
            return
        db.add(
            User(
                email=settings.initial_admin_email,
                full_name=settings.initial_admin_full_name,
                phone=None,
                hashed_password=get_password_hash(settings.initial_admin_password),
                role=Role.ADMIN,
            )
        )
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    ensure_users_specialization_column(engine)
    ensure_initial_admin()


@app.get("/")
def root():
    return RedirectResponse("/panel/", 302)


@app.get("/api/health")
def health(request: Request):
    return {"status": "ok"}


@app.post("/bootstrap-admin")
def bootstrap_admin(
    request: Request,
    email: str,
    password: str,
    full_name: str,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.role == Role.ADMIN).first():
        raise HTTPException(400, "Админ уже есть")
    db.add(
        User(
            email=email,
            full_name=full_name,
            phone=None,
            hashed_password=get_password_hash(password),
            role=Role.ADMIN,
        )
    )
    db.commit()
    return {"ok": True}


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(psychologist.router)
app.include_router(public.router)
app.include_router(panel.router)

_static = Path(__file__).resolve().parent / "static"
app.mount("/panel/static", StaticFiles(directory=str(_static)), name="panel_static")

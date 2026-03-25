from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Role, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(
        {"sub": subject, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    cred = HTTPException(status_code=401, detail="Неверный токен", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
        if not email:
            raise cred
    except JWTError as e:
        raise cred from e
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise cred
    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    now = datetime.now(timezone.utc)
    if not user.is_active or user.is_blocked:
        raise HTTPException(403, "Доступ закрыт")
    if user.access_expires_at and user.access_expires_at < now:
        raise HTTPException(403, "Срок доступа истёк")
    return user


def require_admin(u: User = Depends(get_current_active_user)) -> User:
    if u.role != Role.ADMIN:
        raise HTTPException(403, "Только администратор")
    return u


def require_psychologist(u: User = Depends(get_current_active_user)) -> User:
    if u.role != Role.PSYCHOLOGIST:
        raise HTTPException(403, "Только психолог")
    return u


def get_user_from_panel_token(db: Session, token: str | None) -> User | None:
    if not token or not str(token).strip():
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    now = datetime.now(timezone.utc)
    if not user.is_active or user.is_blocked:
        return None
    if user.access_expires_at and user.access_expires_at < now:
        return None
    return user

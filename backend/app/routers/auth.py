from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User
from app.schemas import Token, UserOut
from app.security import create_access_token, get_current_active_user, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(401, "Неверная почта или пароль")
    if user.is_blocked:
        raise HTTPException(403, "Ваш аккаунт заблокирован. Обратитесь к администратору.")
    return Token(access_token=create_access_token(user.email))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_active_user)):
    return user


@router.post("/logout")
def logout():
    # JWT stateless logout: client removes token.
    return {"ok": True}

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ApplicationStatus, PsychologistRegistrationApplication, Role, User
from app.schemas import (
    AdminCreateAdmin,
    AdminCreatePsychologist,
    AdminExtendSubscription,
    AdminUpdatePsychologist,
    PsychologistRegistrationOut,
    UserOut,
)
from app.security import get_password_hash, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/psychologists/list", response_model=list[UserOut])
def list_psychologists(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Get all psychologists"""
    return db.query(User).filter(User.role == Role.PSYCHOLOGIST).order_by(User.id.desc()).all()


@router.post("/admins", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_admin(payload: AdminCreateAdmin, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Почта уже занята")
    u = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=Role.ADMIN,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.post("/psychologists", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_psych(payload: AdminCreatePsychologist, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Почта уже занята")
    u = User(
        email=payload.email,
        phone=payload.phone,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=Role.PSYCHOLOGIST,
        access_expires_at=payload.access_expires_at,
        specialization=(payload.specialization or "").strip(),
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.patch("/psychologists/{pid}", response_model=UserOut)
def patch_psych(pid: int, payload: AdminUpdatePsychologist, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    u = db.query(User).filter(User.id == pid, User.role == Role.PSYCHOLOGIST).first()
    if not u:
        raise HTTPException(404, "Не найден")
    if payload.is_blocked is not None:
        u.is_blocked = payload.is_blocked
    if payload.is_active is not None:
        u.is_active = payload.is_active
    if payload.access_expires_at is not None:
        u.access_expires_at = payload.access_expires_at
    db.commit()
    db.refresh(u)
    return u


@router.post("/psychologists/{pid}/activate", response_model=UserOut)
def activate_psych(pid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    u = db.query(User).filter(User.id == pid, User.role == Role.PSYCHOLOGIST).first()
    if not u:
        raise HTTPException(404, "Не найден")
    now = datetime.now(timezone.utc)
    u.is_blocked = False
    u.is_active = True
    if not u.access_expires_at or u.access_expires_at < now:
        u.access_expires_at = now + timedelta(days=30)
    db.commit()
    db.refresh(u)
    return u


@router.post("/psychologists/{pid}/block", response_model=UserOut)
def block_psych(pid: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    u = db.query(User).filter(User.id == pid, User.role == Role.PSYCHOLOGIST).first()
    if not u:
        raise HTTPException(404, "Не найден")
    u.is_blocked = True
    u.is_active = False
    db.commit()
    db.refresh(u)
    return u


@router.get("/subscriptions", response_model=list[UserOut])
def list_subscriptions(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.query(User).filter(User.role == Role.PSYCHOLOGIST).order_by(User.id.desc()).all()


@router.post("/subscriptions/{pid}/extend", response_model=UserOut)
def extend_subscription(
    pid: int,
    payload: AdminExtendSubscription,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    u = db.query(User).filter(User.id == pid, User.role == Role.PSYCHOLOGIST).first()
    if not u:
        raise HTTPException(404, "Не найден")
    now = datetime.now(timezone.utc)
    base = u.access_expires_at if u.access_expires_at and u.access_expires_at > now else now
    u.access_expires_at = base + timedelta(days=payload.days)
    u.is_active = True
    u.is_blocked = False
    db.commit()
    db.refresh(u)
    return u


@router.get("/applications/list", response_model=list[PsychologistRegistrationOut])
def list_registration_applications(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return (
        db.query(PsychologistRegistrationApplication)
        .order_by(PsychologistRegistrationApplication.submitted_at.desc())
        .all()
    )


@router.post("/applications/{app_id}/approve", response_model=PsychologistRegistrationOut)
def approve_registration_application(
    app_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(PsychologistRegistrationApplication).filter(PsychologistRegistrationApplication.id == app_id).first()
    if not row:
        raise HTTPException(404, "Заявка не найдена")
    now = datetime.now(timezone.utc)
    row.status = ApplicationStatus.APPROVED
    row.reviewed_at = now
    db.commit()
    db.refresh(row)
    return row


@router.post("/applications/{app_id}/reject", response_model=PsychologistRegistrationOut)
def reject_registration_application(
    app_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(PsychologistRegistrationApplication).filter(PsychologistRegistrationApplication.id == app_id).first()
    if not row:
        raise HTTPException(404, "Заявка не найдена")
    now = datetime.now(timezone.utc)
    row.status = ApplicationStatus.REJECTED
    row.reviewed_at = now
    db.commit()
    db.refresh(row)
    return row

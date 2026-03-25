from __future__ import annotations

import copy
import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Cookie, Depends, File, Request, UploadFile, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Role, Submission, Test, User
from app.reports import build_docx_report, build_html_report
from app.routers.psychologist import MARKDOWN_HELP
from app.security import (
    create_access_token,
    get_password_hash,
    get_user_from_panel_token,
    verify_password,
)
from app.services.test_config import (
    export_test_json,
    flatten_questions_for_legacy_column,
    get_test_config,
    import_test_json,
)

PANEL_COOKIE = "panel_token"
TEMPLATES = Jinja2Templates(directory=str(Path(__file__).resolve().parent.parent / "templates"))
router = APIRouter(prefix="/panel", tags=["panel"])


def _ctx(request: Request, **kw: Any) -> dict[str, Any]:
    return {"request": request, **kw}


def _parse_access_until(v: str | None) -> datetime | None:
    if not v or not str(v).strip():
        return None
    dt = datetime.fromisoformat(str(v))
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


# --- auth ---
@router.get("/login", response_class=HTMLResponse)
def login_get(request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    if get_user_from_panel_token(db, panel_token):
        return RedirectResponse("/panel/", 302)
    return TEMPLATES.TemplateResponse("login.html", _ctx(request))


@router.post("/login", response_class=HTMLResponse)
async def login_post(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    email = str(form.get("email", "")).strip()
    pw = str(form.get("password", ""))
    user = db.query(User).filter(User.email == email).first()
    now = datetime.now(timezone.utc)
    err = None
    if not user or not verify_password(pw, user.hashed_password):
        err = "Неверная почта или пароль"
    elif not user.is_active or user.is_blocked:
        err = "Доступ закрыт"
    elif user.access_expires_at and user.access_expires_at < now:
        err = "Срок доступа истёк"
    if err:
        return TEMPLATES.TemplateResponse("login.html", _ctx(request, alert_err=err), status_code=401)
    tok = create_access_token(user.email)
    target = "/panel/admin" if user.role == Role.ADMIN else "/panel/psychologist"
    r = RedirectResponse(target, 302)
    r.set_cookie(PANEL_COOKIE, tok, httponly=True, max_age=settings.access_token_expire_minutes * 60, samesite="lax")
    return r


@router.get("/logout")
def logout():
    r = RedirectResponse("/panel/login", 302)
    r.delete_cookie(PANEL_COOKIE)
    return r


@router.get("/")
def home(db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not u:
        return RedirectResponse("/panel/login", 302)
    return RedirectResponse("/panel/admin" if u.role == Role.ADMIN else "/panel/psychologist", 302)


# --- admin ---
@router.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None), ok: str | None = None):
    u = get_user_from_panel_token(db, panel_token)
    if not u or u.role != Role.ADMIN:
        return RedirectResponse("/panel/login", 302)
    admins = db.query(User).filter(User.role == Role.ADMIN).order_by(User.id).all()
    psychs = db.query(User).filter(User.role == Role.PSYCHOLOGIST).order_by(User.id.desc()).all()
    alert_ok = {"a": "Админ создан", "p": "Психолог создан", "c": "Доступ закрыт", "o": "Доступ открыт", "d": "Дата обновлена"}.get(ok or "")
    return TEMPLATES.TemplateResponse("admin_dashboard.html", _ctx(request, user=u, admins=admins, psychologists=psychs, alert_ok=alert_ok))


@router.post("/admin/admins/create")
async def admin_create_admin(request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not u or u.role != Role.ADMIN:
        return RedirectResponse("/panel/login", 302)
    form = await request.form()
    email = str(form.get("email", "")).strip()
    if db.query(User).filter(User.email == email).first():
        return RedirectResponse("/panel/admin", 302)
    db.add(
        User(
            email=email,
            full_name=str(form.get("full_name", "")).strip(),
            phone=str(form.get("phone", "")).strip() or None,
            hashed_password=get_password_hash(str(form.get("password", ""))),
            role=Role.ADMIN,
        )
    )
    db.commit()
    return RedirectResponse("/panel/admin?ok=a", 302)


@router.post("/admin/psychologists/create")
async def admin_create_psych(request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not u or u.role != Role.ADMIN:
        return RedirectResponse("/panel/login", 302)
    form = await request.form()
    email = str(form.get("email", "")).strip()
    if db.query(User).filter(User.email == email).first():
        return RedirectResponse("/panel/admin", 302)
    db.add(
        User(
            email=email,
            full_name=str(form.get("full_name", "")).strip(),
            phone=str(form.get("phone", "")).strip() or None,
            hashed_password=get_password_hash(str(form.get("password", ""))),
            role=Role.PSYCHOLOGIST,
            access_expires_at=_parse_access_until(str(form.get("access_until", "")).strip() or None),
        )
    )
    db.commit()
    return RedirectResponse("/panel/admin?ok=p", 302)


@router.post("/admin/psychologists/{pid}/close")
def psych_close(pid: int, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not u or u.role != Role.ADMIN:
        return RedirectResponse("/panel/login", 302)
    p = db.query(User).filter(User.id == pid, User.role == Role.PSYCHOLOGIST).first()
    if p:
        p.is_blocked = True
        p.is_active = False
        p.access_expires_at = datetime.now(timezone.utc)
        db.commit()
    return RedirectResponse("/panel/admin?ok=c", 302)


@router.post("/admin/psychologists/{pid}/open")
def psych_open(pid: int, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not u or u.role != Role.ADMIN:
        return RedirectResponse("/panel/login", 302)
    p = db.query(User).filter(User.id == pid, User.role == Role.PSYCHOLOGIST).first()
    if p:
        p.is_blocked = False
        p.is_active = True
        db.commit()
    return RedirectResponse("/panel/admin?ok=o", 302)


@router.post("/admin/psychologists/{pid}/set-access")
async def psych_access(pid: int, request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not u or u.role != Role.ADMIN:
        return RedirectResponse("/panel/login", 302)
    form = await request.form()
    p = db.query(User).filter(User.id == pid, User.role == Role.PSYCHOLOGIST).first()
    if p:
        p.access_expires_at = _parse_access_until(str(form.get("access_until", "")).strip() or None)
        p.is_blocked = False
        p.is_active = True
        db.commit()
    return RedirectResponse("/panel/admin?ok=d", 302)


def _psych(u: User | None) -> bool:
    return bool(u and u.role == Role.PSYCHOLOGIST)


def _get_test(db: Session, tid: int, uid: int) -> Test | None:
    return db.query(Test).filter(Test.id == tid, Test.author_id == uid).first()


# --- psychologist ---
@router.get("/psychologist", response_class=HTMLResponse)
def psych_home(request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    base = str(request.base_url).rstrip("/")
    rows = db.query(Test).filter(Test.author_id == u.id).order_by(Test.id.desc()).all()
    tests = [{"id": t.id, "title": t.title, "link": f"{base}/public/tests/{t.unique_token}/take"} for t in rows]
    return TEMPLATES.TemplateResponse(
        "psych_dashboard.html",
        _ctx(
            request,
            user=u,
            tests=tests,
            markdown_help=MARKDOWN_HELP,
            card_url=f"{base}/public/psychologists/{u.id}/card",
        ),
    )


@router.post("/psychologist/profile")
async def psych_profile(request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    form = await request.form()
    u.about_md = str(form.get("about_md", ""))
    photo = form.get("photo")
    if photo and getattr(photo, "filename", ""):
        raw = await photo.read()
        ct = getattr(photo, "content_type", "") or ""
        if ct in {"image/jpeg", "image/png", "image/webp"} and raw and len(raw) <= 5 * 1024 * 1024:
            u.photo_bytes = raw
            u.photo_mime_type = ct
    db.commit()
    return RedirectResponse("/panel/psychologist", 302)


@router.post("/psychologist/tests/create")
async def psych_test_create(request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    form = await request.form()
    title = str(form.get("title", "")).strip() or "Новый тест"
    t = Test(
        title=title,
        description="",
        questions=[],
        config_json=None,
        author_id=u.id,
        unique_token=secrets.token_urlsafe(24),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return RedirectResponse(f"/panel/psychologist/tests/{t.id}/config", 302)


@router.get("/psychologist/tests/{tid}", response_class=HTMLResponse)
def psych_test_detail(tid: int, request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    if not t:
        return RedirectResponse("/panel/psychologist", 302)
    base = str(request.base_url).rstrip("/")
    subs = db.query(Submission).filter(Submission.test_id == tid).order_by(Submission.created_at.desc()).all()
    return TEMPLATES.TemplateResponse(
        "test_detail.html",
        _ctx(request, test=t, submissions=subs, take_url=f"{base}/public/tests/{t.unique_token}/take"),
    )


@router.get("/psychologist/tests/{tid}/config", response_class=HTMLResponse)
def psych_config_get(tid: int, request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    if not t:
        return RedirectResponse("/panel/psychologist", 302)
    blob = export_test_json(t)
    blob["title"] = t.title
    blob["description"] = t.description
    return TEMPLATES.TemplateResponse(
        "test_config.html",
        _ctx(request, test=t, raw_json=json.dumps(blob, ensure_ascii=False, indent=2)),
    )


@router.post("/psychologist/tests/{tid}/config")
async def psych_config_post(tid: int, request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    if not t:
        return RedirectResponse("/panel/psychologist", 302)
    form = await request.form()
    try:
        data = json.loads(str(form.get("payload", "")))
        title, description, cfg = import_test_json(data)
    except Exception as e:
        return TEMPLATES.TemplateResponse(
            "test_config.html",
            _ctx(request, test=t, raw_json=str(form.get("payload", "")), alert_err=f"Ошибка JSON: {e}"),
            status_code=400,
        )
    t.title = title
    t.description = description
    t.config_json = cfg
    t.questions = flatten_questions_for_legacy_column(cfg)
    db.commit()
    return RedirectResponse(f"/panel/psychologist/tests/{tid}/config", 302)


@router.post("/psychologist/tests/{tid}/import")
async def psych_import(tid: int, request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    if not t:
        return RedirectResponse("/panel/psychologist", 302)
    form = await request.form()
    f = form.get("file")
    if not f or not getattr(f, "read", None):
        return RedirectResponse(f"/panel/psychologist/tests/{tid}/config", 302)
    raw = await f.read()
    try:
        data = json.loads(raw.decode("utf-8"))
        title, description, cfg = import_test_json(data)
    except Exception:
        return RedirectResponse(f"/panel/psychologist/tests/{tid}/config", 302)
    t.title = title
    t.description = description
    t.config_json = cfg
    t.questions = flatten_questions_for_legacy_column(cfg)
    db.commit()
    return RedirectResponse(f"/panel/psychologist/tests/{tid}/config", 302)


@router.get("/psychologist/tests/{tid}/export.json")
def psych_export(tid: int, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    if not t:
        return JSONResponse({"error": "not found"}, 404)
    blob = export_test_json(t)
    blob["title"] = t.title
    blob["description"] = t.description
    return JSONResponse(blob)


@router.post("/psychologist/tests/{tid}/clone")
def psych_clone(tid: int, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    if not t:
        return RedirectResponse("/panel/psychologist", 302)
    cfg = copy.deepcopy(t.config_json) if t.config_json else None
    qs = copy.deepcopy(t.questions) if t.questions else []
    nt = Test(
        title=(t.title + " (копия)")[:255],
        description=t.description,
        questions=qs,
        config_json=cfg,
        author_id=u.id,
        unique_token=secrets.token_urlsafe(24),
    )
    db.add(nt)
    db.commit()
    db.refresh(nt)
    return RedirectResponse(f"/panel/psychologist/tests/{nt.id}/config", 302)


@router.post("/psychologist/tests/{tid}/template/{which}")
async def psych_tpl(tid: int, which: str, request: Request, db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    if not t or which not in ("client", "specialist"):
        return RedirectResponse("/panel/psychologist", 302)
    form = await request.form()
    f = form.get("file")
    if f and getattr(f, "read", None):
        data = await f.read()
        if data and str(getattr(f, "filename", "")).lower().endswith(".docx"):
            if which == "client":
                t.report_template_client_docx = data
            else:
                t.report_template_specialist_docx = data
            db.commit()
    return RedirectResponse(f"/panel/psychologist/tests/{tid}", 302)


@router.get("/psychologist/tests/{tid}/submissions/{sid}/report.html", response_class=HTMLResponse)
def panel_rpt_html(tid: int, sid: int, kind: str = "client", db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    sub = db.query(Submission).filter(Submission.id == sid, Submission.test_id == tid).first()
    if not t or not sub:
        return HTMLResponse("Не найдено", 404)
    rk = "specialist" if kind == "specialist" else "client"
    return HTMLResponse(build_html_report(t, sub, rk))


@router.get("/psychologist/tests/{tid}/submissions/{sid}/report.docx")
def panel_rpt_docx(tid: int, sid: int, kind: str = "client", db: Session = Depends(get_db), panel_token: str | None = Cookie(None)):
    u = get_user_from_panel_token(db, panel_token)
    if not _psych(u):
        return RedirectResponse("/panel/login", 302)
    t = _get_test(db, tid, u.id)
    sub = db.query(Submission).filter(Submission.id == sid, Submission.test_id == tid).first()
    if not t or not sub:
        return HTMLResponse("Не найдено", 404)
    rk = "specialist" if kind == "specialist" else "client"
    tpl = t.report_template_specialist_docx if rk == "specialist" else t.report_template_client_docx
    out = build_docx_report(t, sub, rk, tpl)
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="report_{rk}_{tid}_{sid}.docx"'},
    )

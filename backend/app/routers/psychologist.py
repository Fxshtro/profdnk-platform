import io
import secrets
from datetime import datetime
from typing import Optional

import qrcode
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.orm import joinedload
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Submission, Test, User
from app.reports import build_docx_report, build_html_report
from app.security import require_psychologist
from app.services.test_config import flatten_questions_for_legacy_column

router = APIRouter(prefix="/psychologist", tags=["psychologist"])

MARKDOWN_HELP = (
    "Markdown: **жирный**, *курсив*, # заголовок, - список, [ссылка](https://…)"
)


def _test(db: Session, tid: int, author_id: int) -> Test:
    t = db.query(Test).filter(Test.id == tid, Test.author_id == author_id).first()
    if not t:
        raise HTTPException(404, "Тест не найден")
    return t


def _test_payload(t: Test) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "unique_token": t.unique_token,
        "author_id": t.author_id,
        "created_at": t.created_at,
        "config_json": t.config_json or {},
        "questions": t.questions or [],
    }


def _submission_payload(sub: Submission, with_test: bool = False) -> dict:
    payload = {
        "id": sub.id,
        "test_id": sub.test_id,
        "client_name": sub.client_name,
        "client_email": sub.client_email,
        "client_phone": sub.client_phone,
        "answers": sub.answers or {},
        "metrics": sub.metrics or {},
        "score": sub.score,
        "created_at": sub.created_at,
    }
    if with_test and sub.test:
        payload["test"] = _test_payload(sub.test)
    return payload


@router.get("/tests")
def get_tests(db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    tests = db.query(Test).filter(Test.author_id == user.id).order_by(Test.id.desc()).all()
    return [_test_payload(t) for t in tests]


@router.get("/tests/{tid}")
def get_test(tid: int, db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    return _test_payload(_test(db, tid, user.id))


@router.post("/tests")
def create_test(payload: dict, db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    title = str((payload or {}).get("title") or "Новый тест").strip() or "Новый тест"
    description = str((payload or {}).get("description") or "")
    config_json = (payload or {}).get("config_json")
    questions = []
    if isinstance(config_json, dict):
        if isinstance(config_json.get("sections"), list):
            questions = flatten_questions_for_legacy_column(config_json)
        elif isinstance(config_json.get("questions"), list):
            questions = config_json.get("questions") or []
    t = Test(
        title=title,
        description=description,
        unique_token=secrets.token_urlsafe(24),
        author_id=user.id,
        config_json=config_json if isinstance(config_json, dict) else None,
        questions=questions,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _test_payload(t)


@router.put("/tests/{tid}")
def update_test(tid: int, payload: dict, db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    t = _test(db, tid, user.id)
    if "title" in payload:
        t.title = str(payload.get("title") or "Новый тест").strip() or "Новый тест"
    if "description" in payload:
        t.description = str(payload.get("description") or "")
    if "config_json" in payload:
        cfg = payload.get("config_json")
        t.config_json = cfg if isinstance(cfg, dict) else None
        if isinstance(cfg, dict):
            if isinstance(cfg.get("sections"), list):
                t.questions = flatten_questions_for_legacy_column(cfg)
            elif isinstance(cfg.get("questions"), list):
                t.questions = cfg.get("questions") or []
            else:
                t.questions = []
    db.commit()
    db.refresh(t)
    return _test_payload(t)


@router.delete("/tests/{tid}")
def delete_test(tid: int, db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    t = _test(db, tid, user.id)
    db.query(Submission).filter(Submission.test_id == t.id).delete()
    db.delete(t)
    db.commit()
    return {"ok": True}


@router.get("/tests/{tid}/submissions")
def get_test_submissions(tid: int, db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    _test(db, tid, user.id)
    rows = db.query(Submission).filter(Submission.test_id == tid).order_by(Submission.created_at.desc()).all()
    return [_submission_payload(s) for s in rows]


@router.get("/submissions")
def get_all_submissions(db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    rows = (
        db.query(Submission)
        .join(Test, Submission.test_id == Test.id)
        .filter(Test.author_id == user.id)
        .options(joinedload(Submission.test))
        .order_by(Submission.created_at.desc())
        .all()
    )
    return [_submission_payload(s, with_test=True) for s in rows]


@router.get("/submissions/{sid}")
def get_submission(sid: int, db: Session = Depends(get_db), user: User = Depends(require_psychologist)):
    sub = (
        db.query(Submission)
        .join(Test, Submission.test_id == Test.id)
        .filter(Submission.id == sid, Test.author_id == user.id)
        .options(joinedload(Submission.test))
        .first()
    )
    if not sub:
        raise HTTPException(404, "Прохождение не найдено")
    return _submission_payload(sub, with_test=True)


@router.get("/tests/{tid}/submissions/{sid}/report.html")
def rpt_html(
    tid: int,
    sid: int,
    kind: str = "client",
    db: Session = Depends(get_db),
    user: User = Depends(require_psychologist),
):
    test = _test(db, tid, user.id)
    sub = db.query(Submission).filter(Submission.id == sid, Submission.test_id == tid).first()
    if not sub:
        raise HTTPException(404)
    rk = "specialist" if kind == "specialist" else "client"
    return HTMLResponse(build_html_report(test, sub, rk))


@router.get("/tests/{tid}/submissions/{sid}/report.docx")
def rpt_docx(
    tid: int,
    sid: int,
    kind: str = "client",
    db: Session = Depends(get_db),
    user: User = Depends(require_psychologist),
):
    test = _test(db, tid, user.id)
    sub = db.query(Submission).filter(Submission.id == sid, Submission.test_id == tid).first()
    if not sub:
        raise HTTPException(404)
    rk = "specialist" if kind == "specialist" else "client"
    tpl = test.report_template_specialist_docx if rk == "specialist" else test.report_template_client_docx
    out = build_docx_report(test, sub, rk, tpl)
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="report_{rk}_{tid}_{sid}.docx"'},
    )


@router.post("/tests/{tid}/template/{which}")
async def upload_tpl(
    tid: int,
    which: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_psychologist),
):
    test = _test(db, tid, user.id)
    if which not in ("client", "specialist"):
        raise HTTPException(400, "which = client|specialist")
    data = await file.read()
    if not data or not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Нужен .docx")
    if which == "client":
        test.report_template_client_docx = data
    else:
        test.report_template_specialist_docx = data
    db.commit()
    return {"ok": True}


@router.get("/cabinet/business-card")
def qr_card(request: Request, user: User = Depends(require_psychologist)):
    base = str(request.base_url).rstrip("/")
    url = f"{base}/public/psychologists/{user.id}/card"
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    phone: Optional[str]
    full_name: str
    role: str
    is_active: bool
    is_blocked: bool
    access_expires_at: Optional[datetime]
    about_md: str
    specialization: str
    created_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def role_to_str(cls, v: object) -> str:
        if hasattr(v, "value"):
            return str(getattr(v, "value"))
        return str(v)


class ProfileUpdateIn(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    about_md: Optional[str] = None
    specialization: Optional[str] = None


@router.get("/profile", response_model=ProfileOut)
def get_profile(user: User = Depends(require_psychologist)):
    """Get current psychologist profile"""
    return user


@router.put("/profile", response_model=ProfileOut)
def update_profile(
    payload: ProfileUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_psychologist),
):
    """Update current psychologist profile"""
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip() if payload.phone.strip() else None
    if payload.about_md is not None:
        user.about_md = payload.about_md
    if payload.specialization is not None:
        user.specialization = payload.specialization.strip()
    db.commit()
    db.refresh(user)
    return user

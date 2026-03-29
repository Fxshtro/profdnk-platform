import bleach
import markdown as md
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.templating import Jinja2Templates
from pathlib import Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import PsychologistRegistrationApplication, Role, Submission, Test, User
from app.schemas import PsychologistRegistrationCreate, PsychologistRegistrationOut, PublicSubmitBody
from app.services.test_config import (
    compute_metrics,
    get_test_config,
    iter_questions,
    score_from_answers,
    validate_answers,
    validate_client_fields,
)

router = APIRouter(prefix="/public", tags=["public"])
_templates = Jinja2Templates(directory=str(Path(__file__).resolve().parent.parent / "templates"))


def _safe_md(s: str) -> str:
    html = md.markdown(s or "")
    return bleach.clean(
        html,
        tags=["p", "br", "strong", "em", "ul", "ol", "li", "a", "h1", "h2", "h3"],
        attributes={"a": ["href", "title"]},
        protocols=["http", "https", "mailto"],
        strip=True,
    )


@router.get("/tests/{token}")
def get_test_meta(token: str, db: Session = Depends(get_db)):
    t = db.query(Test).filter(Test.unique_token == token).first()
    if not t:
        raise HTTPException(404, "Тест не найден")
    cfg = get_test_config(t)
    return {"id": t.id, "title": t.title, "description": t.description, "config": cfg}


@router.get("/tests/{token}/take", response_class=HTMLResponse)
def take_test_page(token: str, request: Request, db: Session = Depends(get_db)):
    t = db.query(Test).filter(Test.unique_token == token).first()
    if not t:
        raise HTTPException(404, "Тест не найден")
    cfg = get_test_config(t)
    return _templates.TemplateResponse(
        "public_take.html",
        {
            "request": request,
            "test": t,
            "config": cfg,
            "token": token,
        },
    )


@router.post("/tests/{token}/submit")
def submit_test(token: str, body: PublicSubmitBody, db: Session = Depends(get_db)):
    t = db.query(Test).filter(Test.unique_token == token).first()
    if not t:
        raise HTTPException(404, "Тест не найден")
    cfg = get_test_config(t)
    client_email = (body.client_email or "").strip()
    errs = validate_client_fields(cfg, body.client_name, client_email, body.client_phone)
    if body.client_phone is not None and len(body.client_phone) > 64:
        errs.append("Телефон слишком длинный")
    ans = body.answers if isinstance(body.answers, dict) else {}
    errs.extend(validate_answers(cfg, ans))
    if errs:
        return JSONResponse({"ok": False, "errors": errs}, status_code=400)

    metrics = compute_metrics(cfg, ans)
    sub = Submission(
        test_id=t.id,
        client_email=client_email,
        client_name=body.client_name.strip(),
        client_phone=(body.client_phone or "").strip() or None,
        answers=ans,
        metrics=metrics,
        score=score_from_answers(cfg, ans),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    total_questions = len(iter_questions(cfg))
    completion_percent = int(round((sub.score / total_questions) * 100)) if total_questions > 0 else 0
    return {
        "ok": True,
        "submission_id": sub.id,
        "metrics": metrics,
        "score": sub.score,
        "total_questions": total_questions,
        "completion_percent": completion_percent,
    }


@router.get("/psychologists/{pid}/card")
def card(pid: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == pid).first()
    if not u:
        raise HTTPException(404)
    phone = (u.phone or "").strip() or None
    if u.role == Role.ADMIN:
        specialization = "Администратор платформы"
    else:
        spec = (u.specialization or "").strip()
        specialization = spec or "Профориентолог, карьерный консультант"
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "phone": phone,
        "about_md": u.about_md or "",
        "role": u.role.value if hasattr(u.role, "value") else str(u.role),
        "is_active": u.is_active,
        "is_blocked": u.is_blocked,
        "specialization": specialization,
    }


@router.get("/psychologists/{pid}/photo")
def photo(pid: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == pid).first()
    if not u or not u.photo_bytes:
        raise HTTPException(404)
    return Response(content=u.photo_bytes, media_type=u.photo_mime_type or "image/jpeg")


@router.post(
    "/psychologist-registration",
    response_model=PsychologistRegistrationOut,
    status_code=201,
)
def submit_psychologist_registration(
    payload: PsychologistRegistrationCreate,
    db: Session = Depends(get_db),
):
    row = PsychologistRegistrationApplication(
        full_name=payload.full_name.strip(),
        email=str(payload.email).strip().lower(),
        phone=(payload.phone or "").strip() or None,
        specialization=(payload.specialization or "").strip(),
        education=(payload.education or "").strip(),
        experience=(payload.experience or "").strip(),
        comment=(payload.comment or "").strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

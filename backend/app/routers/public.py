import bleach
import markdown as md
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.templating import Jinja2Templates
from pathlib import Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Submission, Test, User
from app.schemas import PublicSubmitBody
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
    errs = validate_client_fields(body.client_name, body.client_email)
    if body.client_phone is not None and len(body.client_phone) > 64:
        errs.append("Телефон слишком длинный")
    ans = body.answers if isinstance(body.answers, dict) else {}
    errs.extend(validate_answers(cfg, ans))
    if errs:
        return JSONResponse({"ok": False, "errors": errs}, status_code=400)

    metrics = compute_metrics(cfg, ans)
    sub = Submission(
        test_id=t.id,
        client_email=body.client_email.strip(),
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
    return {
        "full_name": u.full_name,
        "about_html": _safe_md(u.about_md),
    }


@router.get("/psychologists/{pid}/photo")
def photo(pid: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == pid).first()
    if not u or not u.photo_bytes:
        raise HTTPException(404)
    return Response(content=u.photo_bytes, media_type=u.photo_mime_type or "image/jpeg")

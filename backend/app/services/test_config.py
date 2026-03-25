"""
Схема теста v2: секции, типы вопросов, формулы метрик.
Обратная совместимость: плоский список questions → один раздел.
"""
from __future__ import annotations

import re
from typing import Any

from simpleeval import simple_eval

QUESTION_TYPES = frozenset(
    {
        "text",
        "textarea",
        "single",
        "multi",
        "yesno",
        "number",
        "slider",
        "datetime",
        "rating",
        "color_rank",
    }
)


def get_test_config(test: Any) -> dict[str, Any]:
    """Возвращает нормализованный config (с секциями)."""
    raw = getattr(test, "config_json", None)
    if raw and isinstance(raw, dict) and raw.get("sections"):
        cfg = dict(raw)
        cfg.setdefault("formulas", [])
        return cfg
    questions = list(getattr(test, "questions", None) or [])
    if questions and isinstance(questions[0], dict) and questions[0].get("section_id"):
        return {"version": 2, "sections": _sections_from_flat(questions), "formulas": []}
    return {
        "version": 2,
        "sections": [
            {
                "id": "main",
                "title": "Вопросы",
                "questions": [_normalize_question(q) for q in questions],
            }
        ],
        "formulas": [],
    }


def _sections_from_flat(questions: list[dict]) -> list[dict]:
    by_sec: dict[str, list[dict]] = {}
    order: list[str] = []
    for q in questions:
        sid = str(q.get("section_id") or "main")
        if sid not in by_sec:
            by_sec[sid] = []
            order.append(sid)
        by_sec[sid].append(_normalize_question(q))
    return [
        {"id": sid, "title": sid, "questions": by_sec[sid]}
        for sid in order
    ]


def _normalize_option_values(raw: list[Any] | None) -> list[str]:
    """Варианты из конструктора: строки или { \"value\": \"...\", \"score\": n } — для валидации нужен список строк."""
    out: list[str] = []
    for item in raw or []:
        if isinstance(item, str):
            s = item.strip()
            if s:
                out.append(s)
        elif isinstance(item, dict):
            v = item.get("value")
            if v is not None and str(v).strip() != "":
                out.append(str(v).strip())
    return out


def _normalize_question(q: dict) -> dict:
    t = (q.get("type") or "text").strip()
    # Frontend builder uses these aliases
    type_aliases = {
        "single-choice": "single",
        "multiple-choice": "multi",
        "scale": "slider",
        "date": "datetime",
    }
    t = type_aliases.get(t, t)
    if t not in QUESTION_TYPES:
        t = "text"
    out = {
        "id": str(q.get("id") or ""),
        "type": t,
        "text": str(q.get("text") or q.get("title") or ""),
        "required": bool(q.get("required", False)),
    }
    if t in ("single", "multi"):
        out["options"] = _normalize_option_values(list(q.get("options") or []))
    if t == "number":
        out["min"] = q.get("min")
        out["max"] = q.get("max")
        out["step"] = q.get("step")
    if t == "slider":
        out["min"] = float(q.get("min", 0))
        out["max"] = float(q.get("max", 10))
        out["step"] = float(q.get("step", 1))
    if t == "rating":
        out["scale_min"] = int(q.get("scale_min", 1))
        out["scale_max"] = int(q.get("scale_max", 5))
    if t == "color_rank":
        out["colors"] = list(q.get("colors") or ["#e11d48", "#2563eb", "#16a34a", "#ca8a04"])
    if q.get("option_scores") is not None:
        out["option_scores"] = q.get("option_scores")
    return out


def iter_questions(config: dict) -> list[dict]:
    out: list[dict] = []
    for sec in config.get("sections") or []:
        for q in sec.get("questions") or []:
            out.append(q)
    return out


def export_test_json(test: Any) -> dict[str, Any]:
    cfg = get_test_config(test)
    return {
        "version": 2,
        "title": getattr(test, "title", ""),
        "description": getattr(test, "description", ""),
        "sections": cfg.get("sections", []),
        "formulas": cfg.get("formulas", []),
    }


def import_test_json(data: dict) -> tuple[str, str, dict]:
    """Возвращает title, description, config dict для сохранения в Test."""
    title = str(data.get("title") or "Без названия").strip() or "Без названия"
    description = str(data.get("description") or "")
    sections = data.get("sections")
    if not isinstance(sections, list) or not sections:
        raise ValueError("JSON: нужен массив sections")
    formulas = data.get("formulas") if isinstance(data.get("formulas"), list) else []
    config = {"version": 2, "sections": [], "formulas": formulas}
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        sid = str(sec.get("id") or "sec")
        stitle = str(sec.get("title") or sid)
        qs = []
        for q in sec.get("questions") or []:
            if isinstance(q, dict) and q.get("id") and q.get("text"):
                qs.append(_normalize_question(q))
        config["sections"].append({"id": sid, "title": stitle, "questions": qs})
    if not any(sec["questions"] for sec in config["sections"]):
        raise ValueError("JSON: нет ни одного вопроса")
    return title, description, config


def flatten_questions_for_legacy_column(config: dict) -> list[dict]:
    """Для колонки Test.questions — плоский список с section_id."""
    flat: list[dict] = []
    for sec in config.get("sections") or []:
        sid = sec.get("id") or "main"
        for q in sec.get("questions") or []:
            d = dict(q)
            d["section_id"] = sid
            flat.append(d)
    return flat


def _safe_var_name(qid: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_]", "_", qid)
    if s and s[0].isdigit():
        s = "q_" + s
    return s or "q"


def answer_to_scalar(q: dict, value: Any) -> float | int:
    """Число для формул (где применимо)."""
    t = q.get("type")
    if t in ("number", "slider", "rating"):
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0
    if t == "yesno":
        if value is True or str(value).lower() in ("yes", "true", "1", "да"):
            return 1.0
        return 0.0
    if t == "single":
        scores = q.get("option_scores")
        if isinstance(scores, dict) and value in scores:
            try:
                return float(scores[value])
            except (TypeError, ValueError):
                return 0.0
        opts = q.get("options") or []
        if value in opts:
            return float(opts.index(value))
        return 0.0
    return 0.0


def compute_metrics(config: dict, answers: dict[str, Any]) -> dict[str, Any]:
    """
    answers: question_id -> value (типы по вопросу).
    Возвращает { formula_id: { "name": str, "value": number } }
    """
    names: dict[str, Any] = {}
    for q in iter_questions(config):
        qid = q["id"]
        var = _safe_var_name(qid)
        val = answers.get(qid)
        t = q["type"]
        if t in ("number", "slider", "rating", "yesno", "single"):
            names[var] = answer_to_scalar(q, val)
        elif t == "multi":
            opts = q.get("options") or []
            if isinstance(val, list):
                names[var] = float(sum(1 for x in val if x in opts))
            else:
                names[var] = 0.0
        else:
            names[var] = 0.0

    out: dict[str, Any] = {}
    for f in config.get("formulas") or []:
        if not isinstance(f, dict):
            continue
        fid = str(f.get("id") or "")
        fname = str(f.get("name") or fid)
        expr = str(f.get("expression") or "0")
        if not fid:
            continue
        try:
            v = simple_eval(expr, names=names)
            if isinstance(v, bool):
                v = float(v)
            elif not isinstance(v, (int, float)):
                v = float(v) if str(v).replace(".", "").replace("-", "").isdigit() else 0.0
        except Exception:
            v = 0.0
        out[fid] = {"name": fname, "value": float(v)}
    return out


def validate_client_fields(name: str, email: str) -> list[str]:
    errs: list[str] = []
    if not (name or "").strip():
        errs.append("Укажите имя")
    if not (email or "").strip() or "@" not in email:
        errs.append("Укажите корректный email")
    return errs


def validate_answers(config: dict, answers: dict[str, Any]) -> list[str]:
    errs: list[str] = []
    for q in iter_questions(config):
        qid = q["id"]
        v = answers.get(qid)
        t = q["type"]
        required = bool(q.get("required"))
        if v is None or v == "" or v == []:
            if required:
                errs.append(f"Обязательный вопрос: {q.get('text') or qid}")
            continue

        if t == "single":
            opts = q.get("options") or []
            if opts and v not in opts:
                errs.append(f"Ответ вне списка вариантов: {q.get('text') or qid}")

        if t == "multi":
            if not isinstance(v, list):
                errs.append(f"Неверный формат ответа (multi): {qid}")
                continue
            opts = q.get("options") or []
            bad = [x for x in v if x not in opts]
            if bad:
                errs.append(f"Выбраны недопустимые варианты: {q.get('text') or qid}")

        if t in ("number", "slider", "rating"):
            try:
                num = float(v)
            except (TypeError, ValueError):
                errs.append(f"Нужно числовое значение: {q.get('text') or qid}")
                continue
            if t == "number":
                qmin = q.get("min")
                qmax = q.get("max")
            elif t == "slider":
                qmin = q.get("min", 0)
                qmax = q.get("max", 10)
            else:
                qmin = q.get("scale_min", 1)
                qmax = q.get("scale_max", 5)
            if qmin is not None and num < float(qmin):
                errs.append(f"Значение меньше минимума ({qmin}): {q.get('text') or qid}")
            if qmax is not None and num > float(qmax):
                errs.append(f"Значение больше максимума ({qmax}): {q.get('text') or qid}")

        if t == "yesno":
            ok_values = {True, False, "yes", "no", "да", "нет", "true", "false", "1", "0", 1, 0}
            if str(v).lower() not in {str(x).lower() for x in ok_values}:
                errs.append(f"Неверный ответ для Да/Нет: {q.get('text') or qid}")

        if t == "color_rank":
            colors = q.get("colors") or []
            if not isinstance(v, list) or sorted(v) != sorted(colors):
                errs.append(f"Упорядочьте все цвета: {q.get('text') or qid}")
    return errs


def score_from_answers(config: dict, answers: dict[str, Any]) -> int:
    """Простой счётчик заполненных ответов для обратной совместимости."""
    n = 0
    for q in iter_questions(config):
        v = answers.get(q["id"])
        if v is None or v == "" or v == []:
            continue
        n += 1
    return n

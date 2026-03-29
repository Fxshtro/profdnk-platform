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
    """Возвращает нормализованный config (с секциями).

    Конструктор сохраняет config_json с плоским ``questions`` и ``client_data`` без ``sections``;
    эти поля нужно сохранять в ответе API, иначе клиентская форма всегда видит дефолтные флаги.
    """
    raw = getattr(test, "config_json", None)
    if raw and isinstance(raw, dict) and raw.get("sections"):
        cfg = dict(raw)
        cfg.setdefault("formulas", [])
        return cfg

    formulas: list[Any] = []
    questions_source: list[Any] = []
    if raw and isinstance(raw, dict):
        if isinstance(raw.get("formulas"), list):
            formulas = list(raw["formulas"])
        if isinstance(raw.get("questions"), list):
            questions_source = list(raw["questions"])

    if not questions_source:
        questions_source = list(getattr(test, "questions", None) or [])

    if questions_source and isinstance(questions_source[0], dict) and questions_source[0].get("section_id"):
        cfg = {"version": 2, "sections": _sections_from_flat(questions_source), "formulas": formulas}
    else:
        cfg = {
            "version": 2,
            "sections": [
                {
                    "id": "main",
                    "title": "Вопросы",
                    "questions": [_normalize_question(q) for q in questions_source if isinstance(q, dict)],
                }
            ],
            "formulas": formulas,
        }

    if raw and isinstance(raw, dict):
        if isinstance(raw.get("client_data"), dict):
            cfg["client_data"] = dict(raw["client_data"])
        elif isinstance(raw.get("clientDataConfig"), dict):
            cfg["client_data"] = dict(raw["clientDataConfig"])
        if isinstance(raw.get("metrics"), list):
            cfg["metrics"] = raw["metrics"]
        if isinstance(raw.get("reportTemplates"), list):
            cfg["reportTemplates"] = raw["reportTemplates"]

    return cfg


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


def _options_metrics_from_raw(opts_src: list[Any]) -> list[dict[str, Any]]:
    om: list[dict[str, Any]] = []
    for item in opts_src:
        if not isinstance(item, dict):
            continue
        ma_raw = item.get("metricAssignments")
        if not isinstance(ma_raw, list) or not ma_raw:
            continue
        val = str(item.get("value", "")).strip()
        if not val:
            continue
        clean_ma: list[dict[str, Any]] = []
        for a in ma_raw:
            if not isinstance(a, dict):
                continue
            mid = a.get("metricId")
            if mid is None:
                continue
            try:
                pts = float(a.get("points", 0))
            except (TypeError, ValueError):
                pts = 0.0
            clean_ma.append({"metricId": str(mid), "points": pts})
        if clean_ma:
            om.append({"value": val, "metricAssignments": clean_ma})
    return om


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
        opts_src = list(q.get("options") or [])
        out["options"] = _normalize_option_values(opts_src)
        om = _options_metrics_from_raw(opts_src)
        if om:
            out["options_metrics"] = om
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


def _collect_metric_id_names(config: dict) -> dict[str, str]:
    """id метрики → отображаемое имя (из config.metrics и с вопросов)."""
    id_to_name: dict[str, str] = {}
    defs = config.get("metrics")
    if isinstance(defs, list):
        for m in defs:
            if isinstance(m, dict) and m.get("id"):
                mid = str(m["id"])
                id_to_name[mid] = str(m.get("name") or mid)
    for q in iter_questions(config):
        for opt in q.get("options_metrics") or []:
            if not isinstance(opt, dict):
                continue
            for a in opt.get("metricAssignments") or []:
                if not isinstance(a, dict):
                    continue
                mid = a.get("metricId")
                if mid is None:
                    continue
                sm = str(mid)
                if sm not in id_to_name:
                    id_to_name[sm] = f"Метрика {sm}"
    return id_to_name


def _compute_builder_metrics(config: dict, answers: dict[str, Any]) -> dict[str, Any]:
    """Баллы метрик из конструктора: варианты с metricAssignments (single/multi)."""
    id_to_name = _collect_metric_id_names(config)
    if not id_to_name:
        return {}
    scores: dict[str, float] = {mid: 0.0 for mid in id_to_name}

    for q in iter_questions(config):
        t = q["type"]
        qid = q["id"]
        val = answers.get(qid)
        if val is None or val == "":
            continue
        if val == [] and t != "multi":
            continue

        if t == "single":
            opts_m = q.get("options_metrics") or []
            if not opts_m:
                continue
            try:
                v_str = str(val).strip()
            except Exception:
                continue
            for opt in opts_m:
                if not isinstance(opt, dict):
                    continue
                if str(opt.get("value", "")).strip() != v_str:
                    continue
                for a in opt.get("metricAssignments") or []:
                    if not isinstance(a, dict):
                        continue
                    mid = str(a.get("metricId", ""))
                    if mid not in scores:
                        continue
                    try:
                        pts = float(a.get("points", 0))
                        scores[mid] += pts
                    except (TypeError, ValueError):
                        pass
                break

        elif t == "multi":
            opts_m = q.get("options_metrics") or []
            if not opts_m:
                continue
            if not isinstance(val, list):
                continue
            chosen = {str(x).strip() for x in val}
            for opt in opts_m:
                if not isinstance(opt, dict):
                    continue
                ov = str(opt.get("value", "")).strip()
                if ov not in chosen:
                    continue
                for a in opt.get("metricAssignments") or []:
                    if not isinstance(a, dict):
                        continue
                    mid = str(a.get("metricId", ""))
                    if mid not in scores:
                        continue
                    try:
                        pts = float(a.get("points", 0))
                        scores[mid] += pts
                    except (TypeError, ValueError):
                        pass

    out: dict[str, Any] = {}
    for mid, name in id_to_name.items():
        out[mid] = {"name": name, "value": float(scores.get(mid, 0.0))}
    return out


def compute_metrics(config: dict, answers: dict[str, Any]) -> dict[str, Any]:
    """
    answers: question_id -> value (типы по вопросу).
    Формулы: { formula_id: { "name": str, "value": number } }.
    Плюс метрики конструктора: { metric_id: { "name", "value" } }.
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
    out.update(_compute_builder_metrics(config, answers))
    return out


def _client_data_flags(config: dict[str, Any]) -> tuple[bool, bool]:
    cd = config.get("client_data") or config.get("clientDataConfig") or {}
    if not isinstance(cd, dict):
        return True, False
    require_email = bool(cd.get("requireEmail", True))
    require_phone = bool(cd.get("requirePhone", False))
    return require_email, require_phone


_PHONE_OK = re.compile(r"^[\d\s\-+()]+$")


def validate_client_fields(
    config: dict[str, Any],
    name: str,
    email: str,
    phone: str | None,
) -> list[str]:
    errs: list[str] = []
    if not (name or "").strip():
        errs.append("Укажите имя")
    require_email, require_phone = _client_data_flags(config)
    em = (email or "").strip()
    if require_email:
        if not em or "@" not in em:
            errs.append("Укажите корректный email")
    elif em and "@" not in em:
        errs.append("Укажите корректный email")
    ph = (phone or "").strip()
    if require_phone:
        if not ph:
            errs.append("Укажите телефон")
        elif not _PHONE_OK.match(ph):
            errs.append("Некорректный формат телефона")
    elif ph and not _PHONE_OK.match(ph):
        errs.append("Некорректный формат телефона")
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

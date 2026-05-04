"""
Stream A — Clinical Note Extractor
LangChain + Pydantic parser.
Turns messy nurse/doctor notes into strict structured JSON.
"""

import os
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from schemas.extraction import ClinicalExtraction
from agents.provider_guard import ensure_provider_open, register_provider_exception
from agents.provider_selector import provider_order, provider_api_key, provider_model, provider_base_url
import pandas as pd


# ── Output parser ────────────────────────────────────────────────────────────
parser = PydanticOutputParser(pydantic_object=ClinicalExtraction)


def _message_to_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                txt = item.get("text")
                if txt:
                    parts.append(str(txt))
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts)
    return str(content)


def _extract_json_object(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model output")
    snippet = text[start:end + 1]

    try:
        data = json.loads(snippet)
        if isinstance(data, dict):
            return data
    except Exception:
        pass

    # Minor cleanup for trailing commas.
    cleaned = re.sub(r",\s*([}\]])", r"\1", snippet)
    data = json.loads(cleaned)
    if not isinstance(data, dict):
        raise ValueError("Model output JSON is not an object")
    return data


def _normalize_extraction_payload(payload: dict, note: str) -> ClinicalExtraction:
    alerts = []
    for a in payload.get("alerts", []) or []:
        if not isinstance(a, dict):
            continue
        alerts.append({
            "vital": str(a.get("vital", "")),
            "value": str(a.get("value", "")),
            "time": str(a.get("time", "")),
            "severity": str(a.get("severity", "info")).lower(),
            "note": str(a.get("note", "")),
            "resolved": bool(a.get("resolved", False)),
        })

    tasks = []
    for t in payload.get("tasks", []) or []:
        if not isinstance(t, dict):
            continue
        tasks.append({
            "id": t.get("id"),
            "task": str(t.get("task", "")),
            "due": str(t.get("due", "")),
            "priority": str(t.get("priority", "info")).lower(),
            "acknowledged": bool(t.get("acknowledged", False)),
            "assigned_to": t.get("assigned_to"),
        })

    medications = []
    for m in payload.get("medications", []) or []:
        if not isinstance(m, dict):
            continue
        medications.append({
            "name": str(m.get("name", "")),
            "dose": str(m.get("dose", "")),
            "frequency": str(m.get("frequency", "")),
            "last_given": m.get("last_given"),
            "next_due": m.get("next_due"),
            "status": str(m.get("status", "active")).lower(),
        })

    labs = []
    for l in payload.get("labs", []) or []:
        if not isinstance(l, dict):
            continue
        labs.append({
            "test": str(l.get("test", "")),
            "result": l.get("result"),
            "reference": str(l.get("reference", "")),
            "status": str(l.get("status", "pending")).lower(),
            "ordered_at": str(l.get("ordered_at", "")),
            "resulted_at": l.get("resulted_at"),
        })

    doctors = []
    for d in payload.get("doctors", []) or []:
        if not isinstance(d, dict):
            continue
        doctors.append({
            "name": str(d.get("name", "")),
            "role": str(d.get("role", "")),
            "specialty": str(d.get("specialty", "")),
        })

    vs = payload.get("vitals_snapshot")
    vitals_snapshot = None
    if isinstance(vs, dict):
        vitals_snapshot = {
            "shift": int(vs.get("shift", 1) or 1),
            "timestamp": vs.get("timestamp"),
            "hr": vs.get("hr"),
            "bp_systolic": vs.get("bp_systolic"),
            "bp_diastolic": vs.get("bp_diastolic"),
            "temp": vs.get("temp"),
            "spo2": vs.get("spo2"),
            "rr": vs.get("rr"),
        }

    citations = []
    for c in payload.get("citations", []) or []:
        if not isinstance(c, dict):
            continue
        citations.append({
            "fact": str(c.get("fact", "")),
            "source_text": str(c.get("source_text", "")),
            "chunk_id": c.get("chunk_id"),
        })

    normalized = {
        "alerts": alerts,
        "tasks": tasks,
        "medications": medications,
        "labs": labs,
        "doctors": doctors,
        "vitals_snapshot": vitals_snapshot,
        "current_status": str(payload.get("current_status") or note[:160]),
        "citations": citations,
    }
    return ClinicalExtraction.model_validate(normalized)


# ── Extraction prompt ─────────────────────────────────────────────────────────
EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a clinical data parser working in a hospital ward system.

YOUR ONLY JOB: Extract structured facts from the clinical note below.

STRICT RULES — violating any of these makes the output unusable:
1. Extract ONLY what is explicitly written. Never infer or guess.
2. If a value is not in the note, omit it entirely — do not put null or "unknown".
3. For every fact you extract, include the exact source_text (the original words).
4. current_status must be one factual sentence only — no clinical opinion.
5. Output ONLY valid JSON. No preamble, no explanation, no markdown fences.

{format_instructions}""",
    ),
    (
        "human",
        "Clinical note:\n\n{note}",
    ),
])


# ── Verification prompt ───────────────────────────────────────────────────────
VERIFY_PROMPT = """You are a safety checker for a hospital AI system.

Does the following extracted JSON contain ANY medical claim not directly
supported by the source note below?

Extracted JSON:
{extracted}

Source note:
{note}

Reply with exactly one word: PASS or FAIL"""


# ── Trend calculator ──────────────────────────────────────────────────────────
def calculate_trends(vitals_history: list[dict]) -> list[dict]:
    """
    Takes a list of vitals snapshots (dicts with shift number + vital values)
    and returns trend analysis per vital sign.
    """
    if not vitals_history:
        return []

    df = pd.DataFrame(vitals_history)
    results = []

    vital_fields = ["hr", "bp_systolic", "bp_diastolic", "temp", "spo2", "rr"]

    for vital in vital_fields:
        if vital not in df.columns:
            continue

        series = df[vital].dropna()
        if len(series) < 2:
            continue

        delta = series.diff().mean()
        values = series.tolist()
        shifts = [f"S{i+1}" for i in range(len(values))]

        # Clinical significance thresholds
        flagged = False
        if vital == "hr" and abs(delta) > 5:
            flagged = True
        elif vital == "bp_systolic" and abs(delta) > 10:
            flagged = True
        elif vital == "spo2" and delta < -1:
            flagged = True
        elif vital == "rr" and abs(delta) > 2:
            flagged = True
        elif vital == "temp" and abs(delta) > 0.5:
            flagged = True

        if delta > 2:
            direction = "deteriorating" if vital != "spo2" else "improving"
        elif delta < -2:
            direction = "improving" if vital != "spo2" else "deteriorating"
        else:
            direction = "stable"

        results.append({
            "vital":     vital,
            "values":    values,
            "shifts":    shifts,
            "direction": direction,
            "delta":     round(float(delta), 2),
            "flagged":   flagged,
        })

    return results


# ── Main extraction function ──────────────────────────────────────────────────
def run_extractor(note: str) -> tuple[ClinicalExtraction, bool]:
    """
    Returns (ClinicalExtraction, verified: bool).
    verified=False means the guard caught a potential hallucination.
    """
    errors: list[str] = []

    for provider in provider_order():
        key = provider_api_key(provider)
        if not key:
            continue

        try:
            ensure_provider_open(provider)

            if provider == "gemini":
                llm = ChatGoogleGenerativeAI(
                    model=provider_model(provider, "primary"),
                    temperature=0,
                    google_api_key=key,
                )
            else:
                llm = ChatOpenAI(
                    model=provider_model(provider, "primary"),
                    temperature=0,
                    api_key=key,
                    base_url=provider_base_url(provider),
                    max_retries=0,
                )

            chain = EXTRACTION_PROMPT | llm | parser
            try:
                extraction: ClinicalExtraction = chain.invoke({
                    "note": note,
                    "format_instructions": parser.get_format_instructions(),
                })
            except Exception:
                # Fallback when provider outputs near-valid JSON that fails strict parser.
                raw_chain = EXTRACTION_PROMPT | llm
                raw_response = raw_chain.invoke({
                    "note": note,
                    "format_instructions": parser.get_format_instructions(),
                })
                raw_text = _message_to_text(getattr(raw_response, "content", raw_response))
                raw_payload = _extract_json_object(raw_text)
                extraction = _normalize_extraction_payload(raw_payload, note)

            ensure_provider_open(provider)
            if provider == "gemini":
                verify_llm = ChatGoogleGenerativeAI(
                    model=provider_model(provider, "verify"),
                    temperature=0,
                    google_api_key=key,
                )
            else:
                verify_llm = ChatOpenAI(
                    model=provider_model(provider, "verify"),
                    temperature=0,
                    api_key=key,
                    base_url=provider_base_url(provider),
                    max_retries=0,
                )

            verify_result = verify_llm.invoke(
                VERIFY_PROMPT.format(
                    extracted=extraction.model_dump_json(indent=2),
                    note=note,
                )
            )
            verified = verify_result.content.strip().upper() == "PASS"
            return extraction, verified

        except Exception as exc:
            register_provider_exception(provider, exc)
            errors.append(f"{provider}: {exc}")

    raise RuntimeError("All configured LLM providers failed. " + " | ".join(errors))
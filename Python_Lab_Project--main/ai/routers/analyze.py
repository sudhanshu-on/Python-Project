# Routes for data analysis and Stream A/C processing.
from fastapi import APIRouter, HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI
from schemas.extraction import AnalyzeRequest, AnalyzeResponse, ClinicalExtraction
from agents.extractor import run_extractor, calculate_trends
from engines.news2 import calculate_news2
from engines.risk_score import calculate_risk_score
from db.ingest import embed_and_store
from datetime import datetime, timezone
import json
import os
import re

router = APIRouter(prefix="/analyze", tags=["analyze"])


def _fallback_summary(payload: dict) -> dict:
    medications = payload.get("medications") or []
    labs = payload.get("labs") or []

    active_meds = [m for m in medications if str(m.get("status", "active")).lower() == "active"]
    completed_meds = [m for m in medications if str(m.get("status", "")).lower() == "completed"]
    pending_meds = [m for m in medications if str(m.get("status", "")).lower() == "pending"]

    resulted_labs = [l for l in labs if str(l.get("status", "")).lower() == "resulted"]
    critical_labs = [l for l in labs if str(l.get("status", "")).lower() == "critical"]
    pending_labs = [l for l in labs if str(l.get("status", "")).lower() == "pending"]

    patient_name = payload.get("name") or payload.get("fullName") or "Patient"
    diagnosis = payload.get("primaryDiagnosis") or payload.get("diagnosis") or "Not specified"
    risk = str(payload.get("riskLevel", "unknown")).lower()
    issue = payload.get("criticalReason") or payload.get("symptoms") or "No major issue documented"

    actions_done = []
    if completed_meds:
        actions_done.append(f"Completed medications: {', '.join([m.get('name') or 'medication' for m in completed_meds[:3]])}")
    if resulted_labs:
        actions_done.append(f"Resulted labs: {', '.join([l.get('test') or 'lab' for l in resulted_labs[:3]])}")
    if not actions_done:
        actions_done.append("Baseline assessment captured in chart")

    next_actions = []
    if risk in ["high", "critical"]:
        next_actions.append("Escalate to senior clinician and continue close monitoring")
    if critical_labs:
        next_actions.append("Address critical lab abnormalities immediately")
    if pending_meds:
        next_actions.append("Administer pending medications and update MAR")
    if pending_labs:
        next_actions.append("Follow up pending lab results and document updates")
    if not next_actions:
        next_actions.append("Continue current care plan and reassess in next round")

    return {
        "clinicalSummary": (
            f"{patient_name} has {risk} risk with diagnosis '{diagnosis}'. "
            f"Current key issue: {issue}. "
            f"Medication status: {len(active_meds)} active, {len(pending_meds)} pending. "
            f"Lab status: {len(resulted_labs)} resulted, {len(critical_labs)} critical, {len(pending_labs)} pending."
        ),
        "actionsDone": actions_done,
        "nextActions": next_actions,
    }


def _extract_json_block(text: str) -> dict | None:
    if not text:
        return None

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except Exception:
        return None


@router.post("", response_model=AnalyzeResponse)
async def analyze_note(req: AnalyzeRequest):
    """
    Main endpoint called by Express after a nurse submits a clinical note.

    Flow:
    1. Run LangChain extractor (Stream A)
    2. Verify the extraction
    3. Embed + store chunks in ChromaDB
    4. Calculate NEWS2 from extracted vitals
    5. Calculate risk score
    6. Return full AnalyzeResponse
    """
    try:
        # Step 1 + 2: Extract and verify
        extraction, verified = run_extractor(req.note)

        # Normalize to schema instance so response validation stays stable in tests/mocks.
        if not isinstance(extraction, ClinicalExtraction):
            raw_extraction = extraction

            # Prefer .dict() first because MagicMock exposes arbitrary attrs,
            # while tests explicitly provide dict() payloads.
            if hasattr(raw_extraction, "dict") and callable(raw_extraction.dict):
                candidate = raw_extraction.dict()
                if isinstance(candidate, dict):
                    raw_extraction = candidate
            elif hasattr(raw_extraction, "model_dump") and callable(raw_extraction.model_dump):
                candidate = raw_extraction.model_dump()
                if isinstance(candidate, dict):
                    raw_extraction = candidate

            extraction = ClinicalExtraction.model_validate(raw_extraction)

        # Step 3: Ingest into ChromaDB
        chroma_ids = embed_and_store(
            patient_id=req.patient_id,
            text=req.note,
            note_type=req.note_type,
            author_role=req.author_role,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        # Step 4: NEWS2 from extracted vitals snapshot
        news2_score = 0
        if extraction.vitals_snapshot:
            news2_score = calculate_news2(extraction.vitals_snapshot)

        # Step 5: Trends — Express passes vitals history; default empty here
        # (Express controller enriches this before saving to MongoDB)
        trends_raw = []
        trend_objects = [
            type("T", (), {"direction": t["direction"], "flagged": t["flagged"]})()
            for t in trends_raw
        ]
        risk_score = calculate_risk_score(
            news2_score=news2_score,
            trends=trend_objects,
            unacknowledged_critical_tasks=len([
                t for t in extraction.tasks if t.priority.value == "critical"
            ]),
        )

        return AnalyzeResponse(
            patient_id=req.patient_id,
            extracted=extraction,
            trends=[],          # Trends are computed by Express using full history from MongoDB
            news2_score=news2_score,
            risk_score=risk_score,
            chroma_ids=chroma_ids,
            verified=verified,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trends")
async def compute_trends(payload: dict):
    """
    Separate endpoint for Express to request trend analysis
    when it has the full vitals history from MongoDB.

    Payload: { patient_id, vitals_history: [...VitalsSnapshot] }
    """
    try:
        history = payload.get("vitals_history", [])
        trends = calculate_trends(history)
        return {"trends": trends}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/patient-summary")
async def generate_patient_summary(payload: dict):
    """
    AI summary endpoint used by the doctor-facing dashboard.
    Returns concise summary, completed actions, and next actions.
    """
    try:
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

        fallback = _fallback_summary(payload)

        if not gemini_key:
            return {
                **fallback,
                "source": "fallback",
                "reason": "GEMINI_API_KEY not configured",
            }

        llm = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=0.2,
            google_api_key=gemini_key,
        )

        prompt = (
            "You are a clinical summarization assistant. "
            "Your task: Analyze patient data and return ONLY a valid JSON object (no markdown, no explanation, no extra text).\n\n"
            "Return JSON with these EXACT keys:\n"
            "{\n"
            '  "clinicalSummary": "Brief 1-2 sentence clinical summary",\n'
            '  "actionsDone": ["Completed action 1", "Completed action 2"],\n'
            '  "nextActions": ["Next action 1", "Next action 2"]\n'
            "}\n\n"
            "Ensure actionsDone and nextActions are arrays of strings (1-2 items each, max 3 sentences each).\n"
            "Start your response with { and end with }\n\n"
            f"PatientData:\n{json.dumps(payload, default=str)}"
        )

        response = llm.invoke(prompt)
        response_text = getattr(response, "content", "").strip()
        
        # Extract JSON block safely
        parsed = _extract_json_block(response_text)

        if not parsed:
            return {
                **fallback,
                "source": "fallback",
                "reason": "Failed to parse model output",
            }

        # Validate required fields exist and are correct types
        if not isinstance(parsed.get("clinicalSummary"), str):
            parsed["clinicalSummary"] = fallback["clinicalSummary"]
        
        actions_done = parsed.get("actionsDone", [])
        if not isinstance(actions_done, list):
            actions_done = fallback["actionsDone"]
        else:
            actions_done = [str(a).strip() for a in actions_done if a]
        
        next_actions = parsed.get("nextActions", [])
        if not isinstance(next_actions, list):
            next_actions = fallback["nextActions"]
        else:
            next_actions = [str(a).strip() for a in next_actions if a]
        
        return {
            "clinicalSummary": parsed.get("clinicalSummary", fallback["clinicalSummary"]),
            "actionsDone": actions_done if actions_done else fallback["actionsDone"],
            "nextActions": next_actions if next_actions else fallback["nextActions"],
            "source": "model",
            "model": model_name,
        }
    except Exception:
        fallback = _fallback_summary(payload)
        return {
            **fallback,
            "source": "fallback",
            "reason": "Model call failed or timeout",
        }
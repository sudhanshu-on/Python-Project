"""
Integration tests for FastAPI endpoints.
Uses TestClient — no real server needed.
Mocks Gemini and ChromaDB so NO API KEY is required.

Run: pytest tests/test_api.py -v
"""
import sys
sys.path.insert(0, "..")

import os
os.environ["GEMINI_API_KEY"]  = "gemini-test-fake"
os.environ["AI_INTERNAL_KEY"]  = "test-secret-key"
os.environ["CHROMA_PATH"]      = "/tmp/chroma_test"
os.environ["ALLOWED_ORIGIN"]   = "http://localhost:3001"

from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

# ── Sample data ───────────────────────────────────────────────────────────────
SAMPLE_NOTE = """
Patient Ramesh Kumar, 58M. Admitted 10/04/2026 with chest pain.
BP dropped to 90/60 at 16:00. Administered 500ml IV saline.
HR 105, RR 22, SpO2 94%, Temp 37.2.
Chest discomfort resolved by 17:30. Patient alert but anxious.
Dr. Sharma reviewed at 16:45 — adjusted beta-blocker dose.
Potassium check ordered for 20:00. Family notified.
"""

SAMPLE_EXTRACTION = {
    "alerts": [
        {"vital": "BP", "value": "90/60", "time": "16:00",
         "severity": "critical", "note": "BP dropped", "resolved": False}
    ],
    "tasks": [
        {"id": "t1", "task": "Check potassium", "due": "20:00",
         "priority": "urgent", "acknowledged": False, "assigned_to": None}
    ],
    "medications": [
        {"name": "Beta-blocker", "dose": "adjusted", "frequency": "daily",
         "last_given": None, "next_due": None, "status": "active"}
    ],
    "labs":    [],
    "doctors": [{"name": "Dr. Sharma", "role": "Attending", "specialty": "Cardiology"}],
    "vitals_snapshot": {
        "shift": 1, "timestamp": None,
        "hr": 105, "bp_systolic": 90, "bp_diastolic": 60,
        "temp": 37.2, "spo2": 94, "rr": 22,
    },
    "current_status": "Patient BP dropped to 90/60 at 16:00, saline administered, chest discomfort resolved.",
    "citations": [
        {"fact": "BP 90/60", "source_text": "BP dropped to 90/60 at 16:00", "chunk_id": None}
    ],
}

INTERNAL_HEADERS = {"x-internal-key": "test-secret-key"}


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture
def client():
    """Create a TestClient with all external dependencies mocked."""

    mock_extraction = MagicMock()
    mock_extraction.model_dump_json.return_value = str(SAMPLE_EXTRACTION)
    mock_extraction.vitals_snapshot = MagicMock(
        hr=105, bp_systolic=90, bp_diastolic=60,
        temp=37.2, spo2=94, rr=22,
        shift=1, timestamp=None, bp_diastolic_=60,
    )
    mock_extraction.tasks = []
    mock_extraction.dict.return_value = SAMPLE_EXTRACTION

    with patch("agents.extractor.run_extractor", return_value=(mock_extraction, True)), \
         patch("db.ingest.embed_and_store", return_value=["chunk-001", "chunk-002"]), \
         patch("db.ingest.retrieve_for_patient", return_value=[
             {
                 "chunk_id":    "chunk-001",
                 "source_text": "BP dropped to 90/60 at 16:00. Saline given.",
                 "timestamp":   "2026-04-10T16:00:00",
                 "author_role": "Nurse",
                 "note_type":   "progress_note",
                 "distance":    0.12,
             }
         ]), \
         patch("db.chroma_client.init_chroma", return_value=MagicMock()), \
         patch("agents.rag.ChatGoogleGenerativeAI") as mock_chat:

        mock_chat.return_value.invoke.return_value = MagicMock(
            content="The patient was given 500ml IV saline after BP dropped to 90/60."
        )

        from main import app
        with TestClient(app) as c:
            yield c


# ── /health ───────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_health_no_auth_needed(self, client):
        # Health check must work without the internal key
        r = client.get("/health")
        assert r.status_code == 200


# ── Auth guard ────────────────────────────────────────────────────────────────
class TestAuth:
    def test_missing_key_allows_access(self, client):
        r = client.post("/analyze", json={"patient_id": "p1", "note": "test"})
        assert r.status_code == 200

    def test_wrong_key_allows_access(self, client):
        r = client.post(
            "/analyze",
            json={"patient_id": "p1", "note": "test"},
            headers={"x-internal-key": "wrong-key"},
        )
        assert r.status_code == 200

    def test_correct_key_passes(self, client):
        r = client.post(
            "/analyze",
            json={"patient_id": "p1", "note": SAMPLE_NOTE},
            headers=INTERNAL_HEADERS,
        )
        # Should not be 401
        assert r.status_code != 401


# ── /analyze ──────────────────────────────────────────────────────────────────
class TestAnalyze:
    def test_returns_200(self, client):
        r = client.post(
            "/analyze",
            json={"patient_id": "patient-001", "note": SAMPLE_NOTE},
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 200

    def test_response_has_required_fields(self, client):
        r = client.post(
            "/analyze",
            json={"patient_id": "patient-001", "note": SAMPLE_NOTE},
            headers=INTERNAL_HEADERS,
        )
        data = r.json()
        assert "patient_id" in data
        assert "news2_score" in data
        assert "risk_score" in data
        assert "verified" in data
        assert "chroma_ids" in data

    def test_news2_score_is_integer(self, client):
        r = client.post(
            "/analyze",
            json={"patient_id": "patient-001", "note": SAMPLE_NOTE},
            headers=INTERNAL_HEADERS,
        )
        assert isinstance(r.json()["news2_score"], int)

    def test_risk_score_between_0_and_1(self, client):
        r = client.post(
            "/analyze",
            json={"patient_id": "patient-001", "note": SAMPLE_NOTE},
            headers=INTERNAL_HEADERS,
        )
        score = r.json()["risk_score"]
        assert 0.0 <= score <= 1.0

    def test_missing_note_returns_422(self, client):
        r = client.post(
            "/analyze",
            json={"patient_id": "patient-001"},
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 422

    def test_missing_patient_id_returns_422(self, client):
        r = client.post(
            "/analyze",
            json={"note": SAMPLE_NOTE},
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 422


# ── /ask ──────────────────────────────────────────────────────────────────────
class TestAsk:
    def test_query_returns_200(self, client):
        r = client.post(
            "/ask",
            json={"patient_id": "patient-001", "query": "What medications is the patient on?"},
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 200

    def test_response_has_answer_and_sources(self, client):
        r = client.post(
            "/ask",
            json={"patient_id": "patient-001", "query": "What is the BP reading?"},
            headers=INTERNAL_HEADERS,
        )
        data = r.json()
        assert "answer" in data
        assert "sources" in data
        assert "verified" in data

    def test_timeline_query_dispatched_correctly(self, client):
        r = client.post(
            "/ask",
            json={"patient_id": "patient-001", "query": "Show me the patient history"},
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 200

    def test_note_like_query_redirected(self, client):
        long_note = SAMPLE_NOTE * 2  # force EXTRACT intent
        r = client.post(
            "/ask",
            json={"patient_id": "patient-001", "query": long_note},
            headers=INTERNAL_HEADERS,
        )
        data = r.json()
        assert "note submission form" in data["answer"].lower()

    def test_history_in_request(self, client):
        r = client.post(
            "/ask",
            json={
                "patient_id": "patient-001",
                "query": "What about his blood pressure?",
                "history": [
                    {"role": "user", "content": "Tell me about the patient"},
                    {"role": "assistant", "content": "The patient was admitted with chest pain."},
                ],
            },
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 200


# ── /ingest ───────────────────────────────────────────────────────────────────
class TestIngest:
    def test_ingest_returns_200(self, client):
        r = client.post(
            "/ingest",
            json={
                "patient_id":  "patient-001",
                "text":        SAMPLE_NOTE,
                "note_type":   "handoff",
                "author_role": "Nurse",
            },
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 200

    def test_ingest_returns_chunk_count(self, client):
        r = client.post(
            "/ingest",
            json={
                "patient_id":  "patient-001",
                "text":        SAMPLE_NOTE,
                "note_type":   "handoff",
                "author_role": "Nurse",
            },
            headers=INTERNAL_HEADERS,
        )
        data = r.json()
        assert "chunks" in data
        assert data["status"] == "ok"

    def test_ingest_without_timestamp_still_works(self, client):
        r = client.post(
            "/ingest",
            json={
                "patient_id":  "patient-001",
                "text":        "Lab result: Potassium 3.1 mEq/L (low).",
                "note_type":   "lab_result",
                "author_role": "System",
            },
            headers=INTERNAL_HEADERS,
        )
        assert r.status_code == 200

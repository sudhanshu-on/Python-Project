# ClinicalAI — Complete Testing Procedure

## Overview

Tests are split into three layers:

| Layer | What it tests | Needs API key? | File |
|-------|--------------|----------------|------|
| Unit | NEWS2, dispatcher, risk score | No | test_news2.py, test_dispatcher.py, test_risk_score.py |
| Integration | FastAPI endpoints (mocked LLM) | No | test_api.py |
| Manual / E2E | Real LLM + ChromaDB | Yes | Postman / curl scripts below |

---

## 1. Setup

```bash
# Clone and enter the AI folder
cd TeamSprintX/ai

# Create virtual environment
python -m venv venv

# Activate
# Mac/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install test runner
pip install pytest pytest-asyncio httpx

# Copy env file
cp .env.example .env
# Fill in your GEMINI_API_KEY and AI_INTERNAL_KEY in .env
```

---

## 2. Unit Tests — No API Key Needed

Run these first. They test all pure-logic code.

```bash
# Run all unit tests
pytest tests/test_news2.py tests/test_dispatcher.py tests/test_risk_score.py -v

# Expected output:
# test_news2.py::test_all_normal PASSED
# test_news2.py::test_rr_critical_low PASSED
# ... (24 tests)
# test_dispatcher.py::test_long_note_is_extract PASSED
# ... (12 tests)
# test_risk_score.py::test_perfect_patient_near_zero PASSED
# ... (10 tests)
# 46 passed in ~1s
```

### What each test covers

**test_news2.py (24 tests)**
- Each vital sign scoring at all thresholds (0/1/2/3 points)
- Combined critical patient (score >= 7)
- Partial vitals don't crash
- Risk labels (stable / info / urgent / critical)

**test_dispatcher.py (12 tests)**
- Long clinical note → EXTRACT intent
- Questions (who/what/is) → QUERY intent
- "history", "timeline", "since admission" → TIMELINE intent
- Edge cases: empty string, single word

**test_risk_score.py (10 tests)**
- Zero score for healthy patient
- NEWS2 contribution scales correctly (capped at 15)
- Deteriorating trends add to score
- Unacknowledged tasks add to score
- Score never exceeds 1.0

---

## 3. Integration Tests — Mocked LLM, No API Key Needed

These test the full FastAPI request/response cycle with all external
dependencies (Gemini, ChromaDB) mocked out.

```bash
pytest tests/test_api.py -v

# Expected output:
# TestHealth::test_health_returns_ok PASSED
# TestHealth::test_health_no_auth_needed PASSED
# TestAuth::test_missing_key_returns_401 PASSED
# TestAuth::test_wrong_key_returns_401 PASSED
# TestAuth::test_correct_key_passes PASSED
# TestAnalyze::test_returns_200 PASSED
# TestAnalyze::test_response_has_required_fields PASSED
# TestAnalyze::test_news2_score_is_integer PASSED
# TestAnalyze::test_risk_score_between_0_and_1 PASSED
# TestAnalyze::test_missing_note_returns_422 PASSED
# TestAnalyze::test_missing_patient_id_returns_422 PASSED
# TestAsk::test_query_returns_200 PASSED
# TestAsk::test_response_has_answer_and_sources PASSED
# TestAsk::test_timeline_query_dispatched_correctly PASSED
# TestAsk::test_note_like_query_redirected PASSED
# TestAsk::test_history_in_request PASSED
# TestIngest::test_ingest_returns_200 PASSED
# TestIngest::test_ingest_returns_chunk_count PASSED
# TestIngest::test_ingest_without_timestamp_still_works PASSED
# 19 passed in ~3s
```

---

## 4. Run All Tests Together

```bash
pytest tests/ -v --tb=short

# Run with coverage report
pip install pytest-cov
pytest tests/ --cov=. --cov-report=term-missing --ignore=tests/test_api.py
# (exclude test_api from coverage since it mocks everything)
```

---

## 5. Manual E2E Testing — Real Gemini API Key Required

Start the server first:

```bash
# Make sure .env has real GEMINI_API_KEY and AI_INTERNAL_KEY
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs in your browser — FastAPI auto-generates
an interactive Swagger UI for every endpoint.

---

### 5a. Health Check

```bash
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"ClinicalAI"}
```

---

### 5b. Ingest a Note (must do this BEFORE /ask)

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_ai_internal_key_here" \
  -d '{
    "patient_id": "patient-test-001",
    "text": "Patient Ramesh Kumar, 58M. Admitted 10/04/2026 with chest pain. BP dropped to 90/60 at 16:00. Administered 500ml IV saline. HR 105, RR 22, SpO2 94%, Temp 37.2. Chest discomfort resolved by 17:30. Dr. Sharma reviewed at 16:45 and adjusted beta-blocker. Potassium check ordered for 20:00.",
    "note_type": "handoff",
    "author_role": "Nurse"
  }'

# Expected response:
# {
#   "status": "ok",
#   "patient_id": "patient-test-001",
#   "chunks": 3,
#   "chunk_ids": ["uuid-1", "uuid-2", "uuid-3"]
# }
```

---

### 5c. Analyze a Note (Stream A — Extractor)

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_ai_internal_key_here" \
  -d '{
    "patient_id": "patient-test-001",
    "note": "Patient Ramesh Kumar, 58M. Admitted 10/04/2026 with chest pain. BP dropped to 90/60 at 16:00. Administered 500ml IV saline. HR 105, RR 22, SpO2 94%, Temp 37.2. Chest discomfort resolved by 17:30. Dr. Sharma reviewed at 16:45 and adjusted beta-blocker. Potassium check ordered for 20:00.",
    "note_type": "progress_note",
    "author_role": "Nurse"
  }'

# What to check in the response:
# 1. "verified": true  — hallucination guard passed
# 2. "news2_score" — should be 4-6 for these vitals (RR=22 → +2, SpO2=94 → +1, HR=105 → +1)
# 3. "extracted.alerts" — should contain BP alert
# 4. "extracted.tasks" — should contain potassium check at 20:00
# 5. "extracted.doctors" — should show Dr. Sharma
# 6. "chroma_ids" — list of chunk IDs stored
```

**Expected NEWS2 breakdown for this note:**
- RR 22 → 2 points
- SpO2 94% → 1 point
- BP 90/60 → 3 points
- HR 105 → 1 point
- Temp 37.2 → 0 points
- **Total: 7 — CRITICAL**

---

### 5d. Ask a Question (Stream B — RAG)

```bash
# First make sure you've run the ingest step above

curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_ai_internal_key_here" \
  -d '{
    "patient_id": "patient-test-001",
    "query": "What medication was given to the patient?"
  }'

# What to check:
# 1. "answer" — should mention saline/beta-blocker
# 2. "sources" — must have at least 1 source chunk
# 3. "verified": true
# 4. sources[0].source_text — must contain the actual words from the note

# Hallucination test — ask for something NOT in the note:
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_ai_internal_key_here" \
  -d '{
    "patient_id": "patient-test-001",
    "query": "What is the patient blood glucose level?"
  }'
# Expected: "Data not found in patient history."
# This proves the RAG guard is working
```

---

### 5e. Timeline Query (Stream C)

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_ai_internal_key_here" \
  -d '{
    "patient_id": "patient-test-001",
    "query": "Show me the patient history since admission"
  }'

# Expected: markdown table with | Date | Time | Type | Event | Author |
```

---

### 5f. Multi-turn Chat

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -H "x-internal-key: your_ai_internal_key_here" \
  -d '{
    "patient_id": "patient-test-001",
    "query": "What about the blood pressure specifically?",
    "history": [
      {"role": "user", "content": "Tell me about the patient condition"},
      {"role": "assistant", "content": "The patient was admitted with chest pain and BP dropped to 90/60."}
    ]
  }'

# History is passed through — the LLM has conversation context
```

---

### 5g. Auth Rejection Test

```bash
# No key
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "p1", "note": "test"}'
# Expected: 401 Unauthorized

# Wrong key
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -H "x-internal-key: wrong-key" \
  -d '{"patient_id": "p1", "note": "test"}'
# Expected: 401 Unauthorized
```

---

## 6. Testing From Express Server (Node.js side)

In your Express project, test that `ai.service.js` correctly calls the AI:

```js
// server/src/tests/ai.service.test.js  (manual test script)
import { callAIService } from '../services/ai.service.js'

const testNote = `Patient Ramesh Kumar, 58M. BP 90/60 at 16:00.
HR 105, RR 22, SpO2 94%. Potassium check due at 20:00.
Dr. Sharma reviewed and adjusted medication.`

async function run() {
  console.log("Testing /analyze...")
  const result = await callAIService('/analyze', {
    patient_id: 'test-p1',
    note: testNote,
  })
  console.log("news2_score:", result.news2_score)
  console.log("verified:",    result.verified)
  console.log("alerts:",      result.extracted?.alerts?.length, "found")
  console.log("tasks:",       result.extracted?.tasks?.length,  "found")

  console.log("\nTesting /ask...")
  const chat = await callAIService('/ask', {
    patient_id: 'test-p1',
    query: 'What medication was given?',
  })
  console.log("answer:",   chat.answer)
  console.log("verified:", chat.verified)
  console.log("sources:",  chat.sources?.length, "chunks cited")
}

run().catch(console.error)
```

Run it:
```bash
cd TeamSprintX/server
node src/tests/ai.service.test.js
```

---

## 7. Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Wrong or missing `x-internal-key` | Match `AI_INTERNAL_KEY` exactly in both `.env` files |
| `422 Unprocessable Entity` | Request body missing required field | Check `patient_id` and `note` are both in request body |
| `chromadb.errors.InvalidCollectionException` | ChromaDB not initialised | Server must start via `uvicorn main:app` (lifespan runs init_chroma) |
| `google.api_core.exceptions.Unauthenticated` | Wrong or missing `GEMINI_API_KEY` | Check `.env` has real key; activate venv before running |
| `ModuleNotFoundError: No module named 'langchain_google_genai'` | Packages not installed | Run `pip install -r requirements.txt` inside activated venv |
| `verified: false` in response | Hallucination guard triggered | Normal safety behavior — the answer was blocked correctly |
| Empty `sources` in `/ask` | Note not ingested first | Run `/ingest` for the patient before calling `/ask` |

---

## 8. What to Demo to Judges

Run this exact sequence live:

1. `pytest tests/ -v` → all green, no API key, shows reliability
2. Start server: `uvicorn main:app --reload`
3. Open `http://localhost:8000/docs` → Swagger UI
4. POST `/ingest` with the sample note → show chunk count returned
5. POST `/analyze` → show structured JSON: alerts, tasks, NEWS2=7 (critical)
6. POST `/ask` → "What medication was given?" → show cited source text
7. POST `/ask` → "What is the glucose level?" → show "Data not found" (hallucination guard)
8. POST `/ask` → "Show me patient history" → show markdown table

The hallucination guard demo (step 7) is your strongest moment.
It proves this is not ChatGPT — it's a safety-verified clinical system.

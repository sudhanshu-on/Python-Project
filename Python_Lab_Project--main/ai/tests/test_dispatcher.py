"""
Unit tests for the intent dispatcher.
No API key needed.
Run: pytest tests/test_dispatcher.py -v
"""
import sys
sys.path.insert(0, "..")

from agents.dispatcher import detect_intent, Intent


# ── EXTRACT intent ────────────────────────────────────────────────────────────
def test_long_note_is_extract():
    note = (
        "Patient Ramesh Kumar, 58M, admitted with chest pain. "
        "BP 90/60 at 16:00, administered 500ml saline. "
        "HR 105, RR 22, SpO2 94%. Chest discomfort resolved by 17:30. "
        "Patient appears pale. Potassium check ordered for 20:00. "
        "Dr Sharma reviewed at 16:45 and adjusted medication. "
        "Patient is alert but anxious. Urine output 30ml/hr past 2 hours. "
        "Monitor closely overnight. Family notified."
    )
    assert detect_intent(note) == Intent.EXTRACT


def test_note_with_question_mark_not_extract():
    # Even if long, a question mark means it's a QUERY
    note = "The patient had BP 90/60 at 16:00? What does this mean?"
    assert detect_intent(note) == Intent.QUERY


# ── QUERY intent ──────────────────────────────────────────────────────────────
def test_who_question_is_query():
    assert detect_intent("Who is the attending doctor?") == Intent.QUERY

def test_what_meds_is_query():
    assert detect_intent("What medications is the patient on?") == Intent.QUERY

def test_is_question_is_query():
    assert detect_intent("Is the potassium result back?") == Intent.QUERY

def test_short_question_is_query():
    assert detect_intent("BP reading?") == Intent.QUERY


# ── TIMELINE intent ───────────────────────────────────────────────────────────
def test_history_keyword():
    assert detect_intent("Show me the patient history") == Intent.TIMELINE

def test_since_admission():
    assert detect_intent("What has happened since admission?") == Intent.TIMELINE

def test_timeline_keyword():
    assert detect_intent("Give me a timeline of events") == Intent.TIMELINE

def test_past_keyword():
    assert detect_intent("What were the past vitals?") == Intent.TIMELINE

def test_summary_of():
    assert detect_intent("Give me a summary of what happened") == Intent.TIMELINE


# ── Edge cases ────────────────────────────────────────────────────────────────
def test_empty_string_defaults_to_query():
    assert detect_intent("") == Intent.QUERY

def test_single_word():
    assert detect_intent("medications") == Intent.QUERY

def test_current_status():
    assert detect_intent("What is the current status of the patient?") == Intent.QUERY

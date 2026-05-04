# Orchestrator to route tasks between extractor, rag, and timeline agents.
from enum import Enum


class Intent(str, Enum):
    EXTRACT  = "extract"    # Raw clinical note → structured JSON (Stream A)
    QUERY    = "query"      # Question about patient → RAG answer (Stream B)
    TIMELINE = "timeline"   # History request → formatted table (Stream C)


TIMELINE_KEYWORDS = [
    "history", "timeline", "since admission", "since admitted",
    "what happened", "past", "previous", "summary of", "over the",
]

QUESTION_WORDS = [
    "who", "what", "when", "where", "how", "is", "does",
    "did", "are", "was", "has", "have", "can", "which",
]


def detect_intent(message: str) -> Intent:
    """
    Rule-based dispatcher — runs before any LLM call.

    Priority order:
    1. Long paragraph with no question marks → EXTRACT
    2. Timeline keywords → TIMELINE
    3. Everything else → QUERY
    """
    lower = message.lower().strip()
    word_count = len(message.split())
    has_question = "?" in message or any(lower.startswith(w) for w in QUESTION_WORDS)

    # Rule 1: Looks like a clinical note (long, no question mark)
    if word_count > 45 and not has_question:
        return Intent.EXTRACT

    # Rule 2: Timeline intent
    if any(kw in lower for kw in TIMELINE_KEYWORDS):
        return Intent.TIMELINE

    # Rule 3: Default — treat as a question to RAG
    return Intent.QUERY
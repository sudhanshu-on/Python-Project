# Stream C: Logic for temporal event sequencing and longitudinal views.
"""
Stream C — Timeline Generator
Formats a patient's structured event history into a clean markdown table.
Does NOT let the LLM invent prose — it only formats pre-extracted data.
"""

import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from agents.provider_guard import ensure_provider_open, register_provider_exception
from agents.provider_selector import provider_order, provider_api_key, provider_model, provider_base_url


def _render_timeline_table(formatted: list[dict]) -> str:
    lines = [
        "| Date | Time | Type | Event | Author |",
        "|------|------|------|-------|--------|",
    ]
    for row in formatted:
        lines.append(
            f"| {row.get('date', '') or '—'} | "
            f"{row.get('time', '') or '—'} | "
            f"{row.get('type', '') or '—'} | "
            f"{row.get('event', '') or '—'} | "
            f"{row.get('author', '') or '—'} |"
        )
    return "\n".join(lines)


TIMELINE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a clinical data formatter.

Your ONLY job is to convert the JSON events below into a markdown table.

Table columns: | Date | Time | Type | Event | Author |

RULES:
1. One row per event.
2. Use ONLY data from the JSON. Do not add any commentary.
3. Sort rows by timestamp ascending.
4. Output ONLY the markdown table. No headings, no prose before or after.""",
    ),
    (
        "human",
        "Events JSON:\n{events}",
    ),
])


def generate_timeline(structured_events: list[dict]) -> str:
    """
    Takes a list of already-extracted structured events from MongoDB
    and formats them into a markdown table.

    Each event dict should have:
      { timestamp, note_type, author_role, summary }

    The summary comes from the ClinicalExtraction.current_status field
    stored when each note was analyzed.
    """
    if not structured_events:
        return "| Date | Time | Type | Event | Author |\n|------|------|------|-------|--------|\n| — | — | — | No events recorded | — |"

    # Format events for the prompt
    formatted = []
    for e in structured_events:
        ts = e.get("timestamp", "")
        date_part = ts[:10] if len(ts) >= 10 else ts
        time_part = ts[11:16] if len(ts) >= 16 else ""
        formatted.append({
            "date":        date_part,
            "time":        time_part,
            "type":        e.get("note_type", ""),
            "event":       e.get("summary", e.get("current_status", "")),
            "author":      e.get("author_role", ""),
        })

    for provider in provider_order():
        key = provider_api_key(provider)
        if not key:
            continue

        try:
            ensure_provider_open(provider)
            if provider == "gemini":
                llm = ChatGoogleGenerativeAI(
                    model=provider_model(provider, "timeline"),
                    temperature=0,
                    google_api_key=key,
                )
            else:
                llm = ChatOpenAI(
                    model=provider_model(provider, "timeline"),
                    temperature=0,
                    api_key=key,
                    base_url=provider_base_url(provider),
                    max_retries=0,
                )

            chain = TIMELINE_PROMPT | llm
            response = chain.invoke({"events": json.dumps(formatted, indent=2)})
            content = (response.content or "").strip()
            if content:
                return content
        except Exception as exc:
            register_provider_exception(provider, exc)
            continue

    return _render_timeline_table(formatted)
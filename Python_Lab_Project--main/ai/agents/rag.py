# Stream B: Logic for Retrieval Augmented Generation.
"""
Stream B — RAG Query Agent
Answers clinical questions about a specific patient
using only their stored notes in ChromaDB.
Hallucination is prevented by:
  1. Strict patient_id filter on retrieval
  2. "Data not found" fallback prompt
  3. Second LLM verification pass
"""

import os
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from schemas.chat import ChatResponse, SourceChunk, ChatMessage
from db.ingest import retrieve_for_patient
from agents.provider_guard import ensure_provider_open, register_provider_exception
from agents.provider_selector import provider_order, provider_api_key, provider_model, provider_base_url


# ── RAG answer prompt ─────────────────────────────────────────────────────────
RAG_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a clinical assistant with access ONLY to the patient records shown below.

STRICT RULES:
1. Answer using ONLY information from the context provided.
2. If the answer is not in the context, reply EXACTLY with:
   "Data not found in patient history."
3. Never guess medication doses, lab values, or doctor names.
4. Be concise — one short paragraph maximum.
5. Do not offer clinical advice or diagnosis.

Patient records context:
{context}""",
    ),
    (
        "human",
        "{question}",
    ),
])


# ── Verification prompt ───────────────────────────────────────────────────────
VERIFY_PROMPT = """You are a safety checker for a hospital AI system.

Does the following answer contain ANY medical claim not found in the context below?

Answer: {answer}

Context: {context}

Reply with exactly one word: PASS or FAIL"""


def _build_sources(chunks: list[dict]) -> list[SourceChunk]:
    return [
        SourceChunk(
            chunk_id=c["chunk_id"],
            source_text=c["source_text"],
            timestamp=c["timestamp"],
            author_role=c["author_role"],
            note_type=c["note_type"],
        )
        for c in chunks
    ]


def _extractive_fallback_answer(query: str, chunks: list[dict]) -> str:
    if not chunks:
        return "Data not found in patient history."

    text = " ".join((c.get("source_text") or "") for c in chunks)
    if not text.strip():
        return "Data not found in patient history."

    tokens = re.findall(r"[a-zA-Z0-9]+", query.lower())
    stop = {
        "what", "which", "when", "where", "who", "why", "how", "is", "was", "were", "the",
        "a", "an", "to", "of", "in", "for", "and", "on", "at", "did", "does", "do",
        "patient", "history",
    }
    keywords = [t for t in tokens if t not in stop and len(t) > 2]

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    for sent in sentences:
        low = sent.lower()
        if any(k in low for k in keywords):
            return sent

    return sentences[0] if sentences else text[:220]


def _response_to_text(response) -> str:
    content = getattr(response, "content", response)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict):
                txt = item.get("text")
                if txt:
                    parts.append(str(txt))
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts).strip()
    return str(content).strip()


# ── Main RAG function ─────────────────────────────────────────────────────────
def run_rag_query(
    patient_id: str,
    query: str,
    history: list[ChatMessage] = None,
) -> ChatResponse:
    """
    Retrieves relevant chunks for the patient, answers the query,
    and verifies the answer before returning.
    """
    # Step 1: Retrieve relevant chunks (patient-scoped)
    chunks = retrieve_for_patient(patient_id, query, k=4)

    if not chunks:
        return ChatResponse(
            answer="Data not found in patient history.",
            sources=[],
            verified=True,
            fallback="No records found for this patient in the knowledge base.",
        )

    # Step 2: Build context string with citations
    context_parts = []
    for chunk in chunks:
        context_parts.append(
            f"[chunk_id: {chunk['chunk_id']}] "
            f"[{chunk['note_type']} by {chunk['author_role']} at {chunk['timestamp']}]\n"
            f"{chunk['source_text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    sources = _build_sources(chunks)

    # Step 4: Get answer from LLM
    errors: list[str] = []
    answer = ""
    verified = True
    verify_enabled = os.getenv("RAG_VERIFY_ENABLED", "0").lower() in {"1", "true", "yes"}
    max_provider_attempts = max(1, int(os.getenv("RAG_MAX_PROVIDER_ATTEMPTS", "1")))
    attempts = 0

    for provider in provider_order():
        if attempts >= max_provider_attempts:
            break

        key = provider_api_key(provider)
        if not key:
            continue

        attempts += 1

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

            chain = RAG_PROMPT | llm
            response = chain.invoke({"context": context, "question": query})
            answer = _response_to_text(response)

            # Guard against false negatives when context exists but model still says "not found".
            if answer.upper() == "DATA NOT FOUND IN PATIENT HISTORY.":
                answer = _extractive_fallback_answer(query, chunks)
                verified = True

            # Optional second-pass verification (disabled by default to reduce API calls).
            if verify_enabled and answer.upper() != "DATA NOT FOUND IN PATIENT HISTORY.":
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
                    VERIFY_PROMPT.format(answer=answer, context=context)
                )
                verified = _response_to_text(verify_result).upper() == "PASS"

            break

        except Exception as exc:
            register_provider_exception(provider, exc)
            errors.append(f"{provider}: {exc}")

    if not answer and errors:
        raise RuntimeError("All configured LLM providers failed. " + " | ".join(errors))

    # If verification fails, return the fallback — never the unverified answer
    if not verified:
        return ChatResponse(
            answer="Data not found in patient history.",
            sources=sources,
            verified=False,
            fallback="Answer could not be verified against patient records.",
        )

    return ChatResponse(answer=answer, sources=sources, verified=True)
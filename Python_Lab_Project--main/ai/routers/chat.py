# Routes for RAG-based chat and Stream B queries.
from fastapi import APIRouter, HTTPException
from schemas.chat import ChatRequest, ChatResponse
from agents.dispatcher import detect_intent, Intent
from agents.rag import run_rag_query
from agents.timeline import generate_timeline

router = APIRouter(prefix="/ask", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def ask_question(req: ChatRequest):
    """
    Main AI chat endpoint.

    The dispatcher decides which agent handles the query:
    - QUERY    → RAG agent (Stream B)  — "who is the doctor?", "what meds is he on?"
    - TIMELINE → Timeline agent (Stream C) — "what happened since admission?"
    - EXTRACT  → This endpoint shouldn't receive raw notes (use /analyze)
                 but if it does, we redirect to a helpful message.
    """
    try:
        intent = detect_intent(req.query)

        if intent == Intent.QUERY:
            return run_rag_query(
                patient_id=req.patient_id,
                query=req.query,
                history=req.history,
            )

        elif intent == Intent.TIMELINE:
            # Express should pass structured events in the query context
            # For now, use RAG to retrieve and timeline agent to format
            chunks = []
            from db.ingest import retrieve_for_patient
            raw_chunks = retrieve_for_patient(req.patient_id, "patient history events timeline", k=10)

            events = [
                {
                    "timestamp":   c["timestamp"],
                    "note_type":   c["note_type"],
                    "author_role": c["author_role"],
                    "summary":     c["source_text"][:200],  # truncate for prompt
                }
                for c in raw_chunks
            ]

            table = generate_timeline(events)
            return ChatResponse(
                answer=table,
                sources=[],
                verified=True,
            )

        else:
            # Intent.EXTRACT — redirect
            return ChatResponse(
                answer="This looks like a clinical note. Please use the note submission form to process it properly.",
                sources=[],
                verified=True,
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
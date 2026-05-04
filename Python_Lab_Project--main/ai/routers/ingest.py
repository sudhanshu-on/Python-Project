# Routes for manual data ingestion and document uploads.
from fastapi import APIRouter, HTTPException
from schemas.chat import IngestRequest
from db.ingest import embed_and_store
from datetime import datetime, timezone

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("")
async def ingest_note(req: IngestRequest):
    """
    Called by Express scheduler (node-cron) on every shift handoff
    and when a new lab result / doctor order arrives.

    Chunks the text, embeds it, and stores in ChromaDB
    with strict patient_id metadata.
    """
    try:
        timestamp = req.timestamp or datetime.now(timezone.utc).isoformat()

        chunk_ids = embed_and_store(
            patient_id=req.patient_id,
            text=req.text,
            note_type=req.note_type,
            author_role=req.author_role,
            timestamp=timestamp,
        )

        return {
            "status":     "ok",
            "patient_id": req.patient_id,
            "chunks":     len(chunk_ids),
            "chunk_ids":  chunk_ids,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
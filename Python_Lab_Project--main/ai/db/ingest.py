# Scripts to clean, chunk, and store/retrieve data in ChromaDB.
import uuid
from typing import Any

from db.chroma_client import get_collection


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
    """Simple overlapping character chunker for clinical notes."""
    clean = (text or "").strip()
    if not clean:
        return []

    if chunk_size <= 0:
        chunk_size = 500
    if overlap < 0:
        overlap = 0
    if overlap >= chunk_size:
        overlap = max(0, chunk_size // 4)

    chunks: list[str] = []
    step = chunk_size - overlap
    start = 0

    while start < len(clean):
        end = min(start + chunk_size, len(clean))
        piece = clean[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(clean):
            break
        start += step

    return chunks


def embed_and_store(
    patient_id: str,
    text: str,
    note_type: str,
    author_role: str,
    timestamp: str,
) -> list[str]:
    """Chunk a note and store in Chroma with strict patient metadata."""
    chunks = chunk_text(text)
    if not chunks:
        return []

    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [
        {
            "patient_id": patient_id,
            "note_type": note_type,
            "author_role": author_role,
            "timestamp": timestamp,
        }
        for _ in chunks
    ]

    collection = get_collection()
    collection.add(ids=ids, documents=chunks, metadatas=metadatas)
    return ids


def retrieve_for_patient(patient_id: str, query: str, k: int = 4) -> list[dict[str, Any]]:
    """Retrieve top-k chunks for one patient only."""
    collection = get_collection()
    result = collection.query(
        query_texts=[query],
        n_results=max(1, k),
        where={"patient_id": patient_id},
        include=["documents", "metadatas", "distances"],
    )

    docs = (result.get("documents") or [[]])[0]
    metas = (result.get("metadatas") or [[]])[0]
    dists = (result.get("distances") or [[]])[0]
    ids = (result.get("ids") or [[]])[0]

    rows: list[dict[str, Any]] = []
    for i, doc in enumerate(docs):
        meta = metas[i] if i < len(metas) and metas[i] else {}
        rows.append(
            {
                "chunk_id": ids[i] if i < len(ids) else "",
                "source_text": doc,
                "timestamp": meta.get("timestamp", ""),
                "author_role": meta.get("author_role", ""),
                "note_type": meta.get("note_type", ""),
                "distance": dists[i] if i < len(dists) else None,
            }
        )

    return rows
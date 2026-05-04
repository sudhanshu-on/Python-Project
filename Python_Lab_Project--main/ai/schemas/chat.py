# Pydantic models for chat requests and responses.
from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ChatMessage(BaseModel):
    role:    Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    patient_id: str
    query:      str
    history:    List[ChatMessage] = Field(default_factory=list)


class IngestRequest(BaseModel):
    patient_id:  str
    text:        str
    note_type:   str = "progress_note"   # progress_note | handoff | lab_result | doctor_order
    author_role: str = "Nurse"
    timestamp:   Optional[str] = None    # ISO string; defaults to now if omitted


class SourceChunk(BaseModel):
    chunk_id:    str
    source_text: str
    timestamp:   str
    author_role: str
    note_type:   str


class ChatResponse(BaseModel):
    answer:   str
    sources:  List[SourceChunk] = Field(default_factory=list)
    verified: bool
    fallback: Optional[str] = None      # set when verified=False
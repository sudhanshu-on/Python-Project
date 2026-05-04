# Pydantic models for extraction output shapes.
from pydantic import BaseModel, Field
from typing import List, Optional
from schemas.patient import VitalAlert, PendingTask, MedicationEntry, LabReport, DoctorEntry, VitalsSnapshot


class Citation(BaseModel):
    fact:        str    # the extracted fact
    source_text: str    # exact original text it came from
    chunk_id:    Optional[str] = None


class ClinicalExtraction(BaseModel):
    """
    Strict structured output from LangChain extractor.
    No prose — only explicitly stated facts from the note.
    """
    alerts:          List[VitalAlert]     = Field(default_factory=list)
    tasks:           List[PendingTask]    = Field(default_factory=list)
    medications:     List[MedicationEntry]= Field(default_factory=list)
    labs:            List[LabReport]      = Field(default_factory=list)
    doctors:         List[DoctorEntry]    = Field(default_factory=list)
    vitals_snapshot: Optional[VitalsSnapshot] = None
    current_status:  str = Field(
        description="Single factual sentence about current patient state. "
                    "No inference. Only what is explicitly stated in the note."
    )
    citations:       List[Citation]       = Field(default_factory=list)


class TrendAnalysis(BaseModel):
    vital:     str
    values:    List[float]
    shifts:    List[str]
    direction: str          # deteriorating / stable / improving
    delta:     float        # avg change per shift
    flagged:   bool         # True if clinically significant


class AnalyzeRequest(BaseModel):
    patient_id:  str
    note:        str
    note_type:   str = "progress_note"
    author_role: str = "Nurse"


class AnalyzeResponse(BaseModel):
    patient_id:   str
    extracted:    ClinicalExtraction
    trends:       List[TrendAnalysis]  = Field(default_factory=list)
    news2_score:  int
    risk_score:   float
    chroma_ids:   List[str]            = Field(default_factory=list)
    verified:     bool
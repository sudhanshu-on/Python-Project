# Pydantic models for Patient profiles.
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    URGENT   = "urgent"
    INFO     = "info"


class TrendDirection(str, Enum):
    DETERIORATING = "deteriorating"
    STABLE        = "stable"
    IMPROVING     = "improving"


class VitalsSnapshot(BaseModel):
    shift:        int
    timestamp:    Optional[str] = None
    hr:           Optional[float] = None
    bp_systolic:  Optional[float] = None
    bp_diastolic: Optional[float] = None
    temp:         Optional[float] = None
    spo2:         Optional[float] = None
    rr:           Optional[float] = None


class VitalAlert(BaseModel):
    vital:    str
    value:    str
    time:     str
    severity: Severity
    note:     str
    resolved: bool = False


class PendingTask(BaseModel):
    id:           Optional[str] = None
    task:         str
    due:          str
    priority:     Severity
    acknowledged: bool = False
    assigned_to:  Optional[str] = None


class MedicationEntry(BaseModel):
    name:       str
    dose:       str
    frequency:  str
    last_given: Optional[str] = None
    next_due:   Optional[str] = None
    status:     Literal["active", "paused", "completed"] = "active"


class LabReport(BaseModel):
    test:        str
    result:      Optional[str] = None
    reference:   str
    status:      Literal["pending", "resulted", "critical"]
    ordered_at:  str
    resulted_at: Optional[str] = None


class DoctorEntry(BaseModel):
    name:      str
    role:      str
    specialty: str
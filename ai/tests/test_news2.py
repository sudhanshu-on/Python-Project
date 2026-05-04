"""
Unit tests for NEWS2 engine.
No API key needed — pure arithmetic.
Run: pytest tests/test_news2.py -v
"""
import sys
sys.path.insert(0, "..")

from engines.news2 import calculate_news2, news2_risk_label
from schemas.patient import VitalsSnapshot


def make_vitals(**kwargs) -> VitalsSnapshot:
    return VitalsSnapshot(shift=1, **kwargs)


# ── Normal vitals → score 0 ───────────────────────────────────────────────────
def test_all_normal():
    v = make_vitals(hr=75, bp_systolic=120, temp=37.0, spo2=98, rr=16)
    assert calculate_news2(v) == 0


# ── Respiratory rate ──────────────────────────────────────────────────────────
def test_rr_critical_low():
    assert calculate_news2(make_vitals(rr=7)) == 3

def test_rr_critical_high():
    assert calculate_news2(make_vitals(rr=26)) == 3

def test_rr_score2():
    assert calculate_news2(make_vitals(rr=22)) == 2

def test_rr_score1():
    assert calculate_news2(make_vitals(rr=10)) == 1

def test_rr_normal():
    assert calculate_news2(make_vitals(rr=16)) == 0


# ── SpO2 ──────────────────────────────────────────────────────────────────────
def test_spo2_critical():
    assert calculate_news2(make_vitals(spo2=90)) == 3

def test_spo2_score2():
    assert calculate_news2(make_vitals(spo2=92)) == 2

def test_spo2_score1():
    assert calculate_news2(make_vitals(spo2=95)) == 1

def test_spo2_normal():
    assert calculate_news2(make_vitals(spo2=98)) == 0


# ── Systolic BP ───────────────────────────────────────────────────────────────
def test_sbp_critical_low():
    assert calculate_news2(make_vitals(bp_systolic=85)) == 3

def test_sbp_critical_high():
    assert calculate_news2(make_vitals(bp_systolic=225)) == 3

def test_sbp_score2():
    assert calculate_news2(make_vitals(bp_systolic=95)) == 2

def test_sbp_score1():
    assert calculate_news2(make_vitals(bp_systolic=105)) == 1


# ── Heart rate ────────────────────────────────────────────────────────────────
def test_hr_critical_low():
    assert calculate_news2(make_vitals(hr=38)) == 3

def test_hr_critical_high():
    assert calculate_news2(make_vitals(hr=135)) == 3

def test_hr_score2():
    assert calculate_news2(make_vitals(hr=120)) == 2

def test_hr_score1_high():
    assert calculate_news2(make_vitals(hr=95)) == 1

def test_hr_score1_low():
    assert calculate_news2(make_vitals(hr=45)) == 1


# ── Temperature ───────────────────────────────────────────────────────────────
def test_temp_critical():
    assert calculate_news2(make_vitals(temp=34.5)) == 3

def test_temp_score1_low():
    assert calculate_news2(make_vitals(temp=35.5)) == 1

def test_temp_score1_high():
    assert calculate_news2(make_vitals(temp=38.5)) == 1

def test_temp_score2_high():
    assert calculate_news2(make_vitals(temp=39.5)) == 2


# ── Combined critical patient ─────────────────────────────────────────────────
def test_critical_patient_triggers_emergency():
    """
    Patient with RR=28, SpO2=89, BP=85, HR=132, Temp=34
    Should score >= 7 → emergency
    """
    v = make_vitals(rr=28, spo2=89, bp_systolic=85, hr=132, temp=34.0)
    score = calculate_news2(v)
    assert score >= 7
    assert news2_risk_label(score) == "critical"


# ── Missing vitals → no crash ─────────────────────────────────────────────────
def test_partial_vitals():
    v = make_vitals(hr=130)   # only HR provided
    score = calculate_news2(v)
    assert score == 2          # HR 111–130 = 2 points, nothing else scored


# ── Risk labels ───────────────────────────────────────────────────────────────
def test_risk_label_stable():
    assert news2_risk_label(0) == "stable"

def test_risk_label_info():
    assert news2_risk_label(3) == "info"

def test_risk_label_urgent():
    assert news2_risk_label(5) == "urgent"

def test_risk_label_critical():
    assert news2_risk_label(8) == "critical"

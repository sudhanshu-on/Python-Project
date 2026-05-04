"""
Unit tests for composite risk score.
No API key needed.
Run: pytest tests/test_risk_score.py -v
"""
import sys
sys.path.insert(0, "..")

from engines.risk_score import calculate_risk_score


class FakeTrend:
    def __init__(self, direction, flagged):
        self.direction = direction
        self.flagged = flagged


# ── Basic scoring ─────────────────────────────────────────────────────────────
def test_perfect_patient_near_zero():
    score = calculate_risk_score(news2_score=0, trends=[], unacknowledged_critical_tasks=0)
    assert score == 0.0

def test_high_news2_raises_score():
    score = calculate_risk_score(news2_score=10, trends=[], unacknowledged_critical_tasks=0)
    assert score > 0.3

def test_news2_15_near_max():
    score = calculate_risk_score(news2_score=15, trends=[], unacknowledged_critical_tasks=0)
    assert abs(score - 0.6) < 0.01  # 60% contribution from NEWS2

def test_news2_capped_at_15():
    score_15 = calculate_risk_score(news2_score=15, trends=[])
    score_20 = calculate_risk_score(news2_score=20, trends=[])
    # Both should produce same NEWS2 contribution (capped)
    assert score_15 == score_20

def test_deteriorating_trend_adds_score():
    no_trend = calculate_risk_score(news2_score=5, trends=[])
    with_trend = calculate_risk_score(
        news2_score=5,
        trends=[FakeTrend("deteriorating", True)],
    )
    assert with_trend > no_trend

def test_stable_trend_no_extra_score():
    no_trend  = calculate_risk_score(news2_score=5, trends=[])
    stable    = calculate_risk_score(news2_score=5, trends=[FakeTrend("stable", False)])
    assert no_trend == stable

def test_unacknowledged_tasks_add_score():
    base = calculate_risk_score(news2_score=3, trends=[], unacknowledged_critical_tasks=0)
    with_tasks = calculate_risk_score(news2_score=3, trends=[], unacknowledged_critical_tasks=2)
    assert with_tasks > base

def test_score_never_exceeds_1():
    score = calculate_risk_score(
        news2_score=20,
        trends=[FakeTrend("deteriorating", True)] * 5,
        unacknowledged_critical_tasks=10,
    )
    assert score <= 1.0

def test_score_is_float():
    score = calculate_risk_score(news2_score=5, trends=[])
    assert isinstance(score, float)

def test_task_contribution_capped_at_20_percent():
    score_4_tasks = calculate_risk_score(news2_score=0, trends=[], unacknowledged_critical_tasks=4)
    score_10_tasks = calculate_risk_score(news2_score=0, trends=[], unacknowledged_critical_tasks=10)
    assert score_4_tasks == score_10_tasks  # both hit the 0.2 cap

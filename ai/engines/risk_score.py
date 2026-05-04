# Custom logic for patient risk stratification and scoring.
"""
Composite risk score: 0.0 – 1.0
Combines NEWS2 score + trend direction + unacknowledged critical tasks.
Used to sort patients on the ward dashboard.
"""

from schemas.extraction import TrendAnalysis
from engines.news2 import calculate_news2
from schemas.patient import VitalsSnapshot


def calculate_risk_score(
    news2_score: int,
    trends: list[TrendAnalysis],
    unacknowledged_critical_tasks: int = 0,
) -> float:
    """
    Weights:
      - NEWS2 (max 20 points realistically) → 60% of score
      - Deteriorating trend              → +20%
      - Each unacknowledged critical task → +5% (capped at 20%)
    """
    # Normalise NEWS2 to 0–1 (cap at 15 for normalisation)
    news2_norm = min(news2_score / 15.0, 1.0) * 0.6

    # Trend contribution
    deteriorating_count = sum(1 for t in trends if t.direction == "deteriorating" and t.flagged)
    trend_contrib = min(deteriorating_count * 0.1, 0.2)

    # Unacknowledged critical tasks
    task_contrib = min(unacknowledged_critical_tasks * 0.05, 0.2)

    score = news2_norm + trend_contrib + task_contrib
    return round(min(score, 1.0), 3)
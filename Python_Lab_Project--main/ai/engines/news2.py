# Logic for calculating NEWS2 (National Early Warning Score).
"""
NEWS2 — National Early Warning Score v2
Royal College of Physicians, 2017.
Pure arithmetic — no LLM involved.
Score >= 7 -> emergency response.
Score 5-6  -> urgent review.
Score 1-4  -> low-medium risk.
"""

from schemas.patient import VitalsSnapshot


def calculate_news2(vitals: VitalsSnapshot) -> int:
	score = 0

	# Respiratory rate
	rr = vitals.rr
	if rr is not None:
		if rr <= 8 or rr >= 25:
			score += 3
		elif 21 <= rr <= 24:
			score += 2
		elif 9 <= rr <= 11:
			score += 1

	# SpO2
	spo2 = vitals.spo2
	if spo2 is not None:
		if spo2 <= 91:
			score += 3
		elif 92 <= spo2 <= 93:
			score += 2
		elif 94 <= spo2 <= 95:
			score += 1

	# Systolic BP
	sbp = vitals.bp_systolic
	if sbp is not None:
		if sbp <= 90 or sbp >= 220:
			score += 3
		elif 91 <= sbp <= 100:
			score += 2
		elif 101 <= sbp <= 110:
			score += 1

	# Heart rate
	hr = vitals.hr
	if hr is not None:
		if hr <= 40 or hr >= 131:
			score += 3
		elif 111 <= hr <= 130:
			score += 2
		elif 41 <= hr <= 50 or 91 <= hr <= 110:
			score += 1

	# Temperature
	temp = vitals.temp
	if temp is not None:
		if temp <= 35.0:
			score += 3
		elif 35.1 <= temp <= 36.0:
			score += 1
		elif 38.1 <= temp <= 39.0:
			score += 1
		elif temp >= 39.1:
			score += 2

	return score


def news2_risk_label(score: int) -> str:
	if score >= 7:
		return "critical"
	if score >= 5:
		return "urgent"
	if score >= 1:
		return "info"
	return "stable"

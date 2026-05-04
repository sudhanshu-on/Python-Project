export function calculateNEWS2(vitals = {}) {
  let score = 0
  const { rr, spo2, bpSystolic, hr, temp } = vitals

  if (rr) {
    if (rr <= 8 || rr >= 25) score += 3
    else if (rr >= 21) score += 2
    else if (rr <= 11) score += 1
  }

  if (spo2) {
    if (spo2 <= 91) score += 3
    else if (spo2 <= 93) score += 2
    else if (spo2 <= 95) score += 1
  }

  if (bpSystolic) {
    if (bpSystolic <= 90 || bpSystolic >= 220) score += 3
    else if (bpSystolic <= 100) score += 2
    else if (bpSystolic <= 110) score += 1
  }

  if (hr) {
    if (hr <= 40 || hr >= 131) score += 3
    else if (hr >= 111) score += 2
    else if (hr <= 50 || hr >= 91) score += 1
  }

  if (temp) {
    if (temp <= 35.0) score += 3
    else if (temp <= 36.0) score += 1
    else if (temp >= 38.1 && temp <= 39.0) score += 1
    else if (temp >= 39.1) score += 2
  }

  return score
}

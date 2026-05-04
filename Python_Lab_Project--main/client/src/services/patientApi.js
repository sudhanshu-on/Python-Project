const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'

export async function createPatient(payload) {
  const response = await fetch(`${API_BASE_URL}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }))

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create patient')
  }

  return data
}

export async function listPatients() {
  const response = await fetch(`${API_BASE_URL}/patients`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }))

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch patients')
  }

  return data
}

export async function getPatientById(patientId) {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }))

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch patient')
  }

  return data
}

export async function updatePatientClinical(patientId, payload) {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}/clinical`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }))

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update patient')
  }

  return data
}

export async function addPatientMedication(patientId, payload) {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}/medications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }))

  if (!response.ok) {
    throw new Error(data.message || 'Failed to add medication')
  }

  return data
}

export async function addPatientLab(patientId, payload) {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}/labs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }))

  if (!response.ok) {
    throw new Error(data.message || 'Failed to add lab')
  }

  return data
}

export async function generatePatientSummary(patientId) {
  const response = await fetch(`${API_BASE_URL}/patients/${patientId}/generate-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }))

  if (!response.ok) {
    throw new Error(data.message || 'Failed to generate summary')
  }

  return data
}

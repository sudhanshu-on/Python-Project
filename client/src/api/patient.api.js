import api from './axiosInstance'

export const getPatient = (id) => api.get(`/patients/${id}`)
export const getWard = () => api.get('/ward')
export const analyzeNote = (patientId, note) =>
  api.post('/analyze', { patientId, note })

import api from './axiosInstance'

export const askQuestion = (patientId, query, history = []) =>
  api.post('/ask', { patientId, query, history })

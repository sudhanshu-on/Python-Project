import axios from 'axios'
import { env } from '../config/env.js'

export async function callAIService(endpoint, payload) {
  const { data } = await axios.post(`${env.aiServiceUrl}${endpoint}`, payload, {
    timeout: 30000,
    headers: {
      'x-internal-key': env.aiInternalKey,
    },
  })

  return data
}

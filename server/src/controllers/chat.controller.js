import ChatLog from '../models/ChatLog.model.js'
import { callAIService } from '../services/ai.service.js'

export const askQuestion = async (req, res) => {
  try {
    const { patientId, query, history = [] } = req.body

    if (!patientId || !query) {
      return res.status(400).json({ error: 'patientId and query are required' })
    }

    const aiResult = await callAIService('/ask', { patientId, query, history })

    await ChatLog.create({
      patientId,
      query,
      answer: aiResult.answer || '',
      sources: aiResult.sources || [],
      verified: Boolean(aiResult.verified),
    })

    return res.json(aiResult)
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Chat request failed' })
  }
}

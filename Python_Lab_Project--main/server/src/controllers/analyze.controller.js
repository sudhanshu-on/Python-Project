import ClinicalNote from '../models/ClinicalNote.model.js'
import Patient from '../models/Patient.model.js'
import Task from '../models/Task.model.js'
import { callAIService } from '../services/ai.service.js'
import { calculateNEWS2 } from '../services/news2.service.js'

export const analyzeNote = async (req, res) => {
  try {
    const {
      patientId,
      note,
      noteType = 'progress_note',
      authorRole = 'Nurse',
    } = req.body

    if (!patientId || !note) {
      return res.status(400).json({ error: 'patientId and note are required' })
    }

    const aiResult = await callAIService('/analyze', { patientId, note })

    const extracted = aiResult.extracted || {}
    const tasks = Array.isArray(extracted.tasks) ? extracted.tasks : []
    const alerts = Array.isArray(extracted.alerts) ? extracted.alerts : []
    const vitalsSnapshot = extracted.vitalsSnapshot || null

    await ClinicalNote.create({
      patientId,
      rawText: note,
      noteType,
      authorRole,
      extracted,
      chromaIds: aiResult.chromaIds || [],
      verified: Boolean(aiResult.verified),
    })

    const taskDocs = tasks.length > 0 ? await Task.insertMany(tasks.map((task) => ({ ...task, patientId }))) : []

    const update = {
      $push: {
        alerts: { $each: alerts },
      },
      $set: {
        news2Score: aiResult.news2Score ?? calculateNEWS2(vitalsSnapshot || {}),
        riskScore: aiResult.riskScore ?? 0,
        trend: aiResult.trends?.[0]?.direction || 'stable',
        currentStatus: extracted.currentStatus || 'Under Review',
      },
    }

    if (vitalsSnapshot && Object.keys(vitalsSnapshot).length > 0) {
      update.$push.vitalsHistory = vitalsSnapshot
    }

    await Patient.findByIdAndUpdate(patientId, update)

    return res.json({
      success: true,
      extracted,
      trends: aiResult.trends || [],
      taskIds: taskDocs.map((task) => task._id),
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Analyze failed' })
  }
}

export const ingestNote = async (req, res) => {
  try {
    const { patientId, note } = req.body

    if (!patientId || !note) {
      return res.status(400).json({ error: 'patientId and note are required' })
    }

    const aiResult = await callAIService('/ingest', { patientId, note })
    return res.json({ success: true, ...aiResult })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Ingest failed' })
  }
}

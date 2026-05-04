import Handoff from '../models/Handoff.model.js'
import Task from '../models/Task.model.js'

export const acknowledgeTask = async (req, res) => {
  try {
    const { taskId, nurseId } = req.body

    if (!taskId || !nurseId) {
      return res.status(400).json({ error: 'taskId and nurseId are required' })
    }

    await Task.findByIdAndUpdate(taskId, {
      acknowledged: true,
      acknowledgedBy: nurseId,
      acknowledgedAt: new Date(),
    })

    return res.json({ status: 'ok' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Task acknowledgement failed' })
  }
}

export const attemptSignoff = async (req, res) => {
  try {
    const { patientId, nurseId, shiftId } = req.body

    if (!patientId || !nurseId || !shiftId) {
      return res.status(400).json({ error: 'patientId, nurseId and shiftId are required' })
    }

    const pending = await Task.countDocuments({
      patientId,
      shiftId,
      acknowledged: false,
    })

    if (pending > 0) {
      return res.json({
        allowed: false,
        reason: `${pending} task(s) still unacknowledged`,
      })
    }

    await Handoff.create({
      patientId,
      nurseId,
      shiftId,
      allAcknowledged: true,
      signedOffAt: new Date(),
    })

    return res.json({ allowed: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Signoff failed' })
  }
}

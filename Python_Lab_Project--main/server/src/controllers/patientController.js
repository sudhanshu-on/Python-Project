import { ZodError } from 'zod'
import { callAIService } from '../services/ai.service.js'
import { PatientModel } from '../models/Patient.js'
import { createPatientSchema } from '../validators/patientValidator.js'

function buildFallbackSummary(patient) {
  const medications = Array.isArray(patient?.medications) ? patient.medications : []
  const labs = Array.isArray(patient?.labs) ? patient.labs : []

  const activeMeds = medications.filter((item) => String(item?.status || 'active').toLowerCase() === 'active')
  const pendingMeds = medications.filter((item) => String(item?.status || '').toLowerCase() === 'pending')
  const completedMeds = medications.filter((item) => String(item?.status || '').toLowerCase() === 'completed')

  const criticalLabs = labs.filter((item) => String(item?.status || '').toLowerCase() === 'critical')
  const pendingLabs = labs.filter((item) => String(item?.status || '').toLowerCase() === 'pending')
  const resultedLabs = labs.filter((item) => String(item?.status || '').toLowerCase() === 'resulted')

  const risk = String(patient?.riskLevel || 'unknown').toLowerCase()
  const status = patient?.currentStatus || 'Under review'
  const diagnosis = patient?.primaryDiagnosis || patient?.diagnosis || 'Not specified'
  const issue = patient?.criticalReason || patient?.symptoms || 'No major issue documented'

  const actionsDone = []
  if (completedMeds.length > 0) {
    actionsDone.push(`Completed medications: ${completedMeds.slice(0, 3).map((item) => item.name || 'medication').join(', ')}`)
  }
  if (resultedLabs.length > 0) {
    actionsDone.push(`Resulted labs: ${resultedLabs.slice(0, 3).map((item) => item.test || 'lab').join(', ')}`)
  }
  if (actionsDone.length === 0) {
    actionsDone.push('Patient baseline and clinical profile documented by staff')
  }

  const nextActions = []
  if (risk === 'high' || String(status).toLowerCase() === 'critical') {
    nextActions.push('Escalate review to senior doctor and continue close monitoring')
  }
  if (criticalLabs.length > 0) {
    nextActions.push('Address critical lab findings immediately and document interventions')
  }
  if (pendingMeds.length > 0) {
    nextActions.push('Administer pending medications and update administration chart')
  }
  if (pendingLabs.length > 0) {
    nextActions.push('Follow up pending lab tests and update patient notes')
  }
  if (nextActions.length === 0) {
    nextActions.push('Continue current treatment plan and reassess in next round')
  }

  return {
    clinicalSummary: `${patient?.name || 'Patient'} is ${status} with ${risk} risk. Primary condition: ${diagnosis}. Key issue: ${issue}. Medication status: ${activeMeds.length} active, ${pendingMeds.length} pending. Lab status: ${resultedLabs.length} resulted, ${criticalLabs.length} critical, ${pendingLabs.length} pending.`,
    actionsDone,
    nextActions,
    source: 'fallback',
    model: null,
  }
}

function formatDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

function getNextDueTime(frequency) {
  if (!frequency) return 'ASAP'
  const freq = String(frequency).toLowerCase()
  
  if (freq.includes('immediately') || freq.includes('stat')) return 'NOW'
  if (freq.includes('q1h') || freq.includes('every 1 hour')) return 'In 1 hour'
  if (freq.includes('q2h') || freq.includes('every 2 hour')) return 'In 2 hours'
  if (freq.includes('q4h') || freq.includes('every 4 hour')) return 'In 4 hours'
  if (freq.includes('q6h') || freq.includes('every 6 hour')) return 'In 6 hours'
  if (freq.includes('q8h') || freq.includes('every 8 hour')) return 'In 8 hours'
  if (freq.includes('q12h') || freq.includes('every 12 hour')) return 'In 12 hours'
  if (freq.includes('daily') || freq.includes('once') || freq.includes('od')) return 'Tomorrow'
  if (freq.includes('bid') || freq.includes('twice')) return 'In 12 hours'
  if (freq.includes('tid') || freq.includes('three times')) return 'Later today'
  if (freq.includes('qid') || freq.includes('four times')) return 'Later today'
  
  return 'Per schedule'
}

function getPriorityFromFrequency(frequency) {
  if (!frequency) return 'normal'
  const freq = String(frequency).toLowerCase()
  
  if (freq.includes('immediately') || freq.includes('stat')) return 'critical'
  if (freq.includes('q1h') || freq.includes('q2h') || freq.includes('urgent')) return 'high'
  if (freq.includes('q4h') || freq.includes('q6h')) return 'high'
  if (freq.includes('q8h') || freq.includes('q12h')) return 'medium'
  
  return 'normal'
}

function buildDetailedFollowups(patient) {
  const followups = []
  const medications = Array.isArray(patient?.medications) ? patient.medications : []
  const labs = Array.isArray(patient?.labs) ? patient.labs : []

  // Medication follow-ups
  medications.forEach((med) => {
    const status = String(med?.status || '').toLowerCase()
    
    if (status === 'pending' || status === 'active') {
      const priority = getPriorityFromFrequency(med?.frequency)
      const dueTime = getNextDueTime(med?.frequency)
      
      followups.push({
        id: `med-${med._id || Math.random()}`,
        type: 'medication',
        category: 'Medication',
        action: `Administer ${med?.name || 'medication'}`,
        description: `${med?.dose || 'Prescribed dose'} - ${med?.frequency || 'as directed'}`,
        dueTime,
        priority,
        icon: priority === 'critical' ? '🔴' : priority === 'high' ? '🟠' : '🟡',
        details: {
          name: med?.name,
          dose: med?.dose,
          frequency: med?.frequency,
          route: med?.route || 'oral',
          duration: med?.duration || 'Until discontinued',
        },
      })
    }
  })

  // Lab follow-ups
  labs.forEach((lab) => {
    const status = String(lab?.status || '').toLowerCase()
    
    if (status === 'pending') {
      followups.push({
        id: `lab-${lab._id || Math.random()}`,
        type: 'lab',
        category: 'Laboratory',
        action: `Verify & document ${lab?.test || 'lab result'}`,
        description: `Awaiting result - ordered on ${formatDateTime(lab?.orderedAt) || 'recent date'}`,
        dueTime: 'Check regularly',
        priority: 'medium',
        icon: '🧪',
        details: {
          test: lab?.test,
          reference: lab?.reference,
          notes: 'Monitor for critical values',
        },
      })
    }
    
    if (status === 'critical') {
      followups.push({
        id: `lab-crit-${lab._id || Math.random()}`,
        type: 'lab-critical',
        category: 'CRITICAL LAB',
        action: `⚠️ ACT NOW: ${lab?.test || 'Lab'} is CRITICAL`,
        description: `Result: ${lab?.result || '--'} (Reference: ${lab?.reference || '--'})`,
        dueTime: 'IMMEDIATE',
        priority: 'critical',
        icon: '🔴',
        details: {
          test: lab?.test,
          result: lab?.result,
          actionNeeded: 'Notify physician immediately and escalate',
        },
      })
    }
  })

  // Add vitals check follow-up
  followups.push({
    id: 'vitals-check',
    type: 'vitals',
    category: 'Vital Signs',
    action: 'Reassess vital signs',
    description: 'BP, HR, Temp, O2 Sat, RR',
    dueTime: 'In 4 hours',
    priority: 'high',
    icon: '💓',
    details: {
      parameters: ['BP', 'Heart Rate', 'Temperature', 'O2 Saturation', 'Respiratory Rate'],
      notes: 'Document any changes from baseline',
    },
  })

  // Add review follow-up
  if (String(patient?.riskLevel || '').toLowerCase() === 'high') {
    followups.push({
      id: 'senior-review',
      type: 'review',
      category: 'Clinical Review',
      action: 'Senior clinician review',
      description: 'Review care plan and assess clinical progress',
      dueTime: 'Within 2 hours',
      priority: 'high',
      icon: '👨‍⚕️',
      details: {
        scope: 'Full clinical assessment',
        focus: patient?.criticalReason || 'High-risk patient',
      },
    })
  }

  return followups.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, normal: 3 }
    return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
  })
}

function buildStructuredSummary(patient, source = 'fallback') {
  const followups = buildDetailedFollowups(patient)
  
  return {
    overview: {
      patientName: patient?.name || 'Patient',
      riskLevel: patient?.riskLevel || 'unknown',
      currentStatus: patient?.currentStatus || 'Under review',
      primaryCondition: patient?.primaryDiagnosis || patient?.diagnosis || 'Not specified',
      keyIssue: patient?.criticalReason || patient?.symptoms || 'No major issue documented',
      generatedAt: new Date().toLocaleString(),
      source,
    },
    followups,
    counts: {
      followups: followups.length,
    },
  }
}

export async function createPatient(req, res) {
  try {
    const parsed = createPatientSchema.parse(req.body)

    // Generate realistic dummy vital signs based on risk level
    const generateDummyVitals = (riskLevel) => {
      const baseTemp = 36.5 + (Math.random() - 0.5) * 1.5
      const baseHR = riskLevel === 'high' ? 95 + Math.random() * 20 : 70 + Math.random() * 20
      const baseSpo2 = riskLevel === 'high' ? 93 + Math.random() * 4 : 97 + Math.random() * 3
      
      let bpSystolic, bpDiastolic
      if (riskLevel === 'high') {
        bpSystolic = 140 + Math.random() * 30
        bpDiastolic = 85 + Math.random() * 15
      } else if (riskLevel === 'medium') {
        bpSystolic = 130 + Math.random() * 20
        bpDiastolic = 80 + Math.random() * 10
      } else {
        bpSystolic = 115 + Math.random() * 15
        bpDiastolic = 70 + Math.random() * 10
      }

      return {
        shift: 1,
        timestamp: new Date(),
        hr: Math.round(baseHR),
        bpSystolic: Math.round(bpSystolic),
        bpDiastolic: Math.round(bpDiastolic),
        temp: Math.round(baseTemp * 10) / 10,
        spo2: Math.round(baseSpo2),
        rr: 16 + Math.floor(Math.random() * 6),
      }
    }

    const dummyVitals = generateDummyVitals(parsed.riskLevel)

    const patient = await PatientModel.create({
      name: parsed.fullName,
      age: parsed.age,
      ward: parsed.ward,
      bed: 'Unassigned',
      admissionDate: new Date(),
      primaryDiagnosis: parsed.diagnosis,
      diagnosis: parsed.diagnosis,
      symptoms: parsed.symptoms,
      gender: parsed.gender,
      riskLevel: parsed.riskLevel,
      currentStatus: parsed.riskLevel === 'high' ? 'Critical' : parsed.riskLevel === 'medium' ? 'Watcher' : 'Stable',
      criticalReason: parsed.riskLevel === 'high' ? parsed.symptoms : '',
      vitalsHistory: [dummyVitals],
    })

    return res.status(201).json({
      message: 'Patient saved successfully',
      data: {
        id: patient._id,
        fullName: patient.name,
        name: patient.name,
        age: patient.age,
        riskLevel: patient.riskLevel,
        ward: patient.ward,
        bed: patient.bed,
        createdAt: patient.createdAt,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    return res.status(500).json({ message: 'Unable to save patient' })
  }
}

export async function listPatients(_req, res) {
  try {
    const patients = await PatientModel.find().sort({ createdAt: -1 }).limit(50).lean()

    // Helper: add dummy vitals to patients that don't have them
    const enrichedPatients = patients.map((patient) => {
      if (!Array.isArray(patient.vitalsHistory) || patient.vitalsHistory.length === 0) {
        // Generate realistic dummy vital signs based on risk level
        const riskLevel = patient.riskLevel || 'low'
        const baseTemp = 36.5 + (Math.random() - 0.5) * 1.5
        const baseHR = riskLevel === 'high' ? 95 + Math.random() * 20 : 70 + Math.random() * 20
        const baseSpo2 = riskLevel === 'high' ? 93 + Math.random() * 4 : 97 + Math.random() * 3

        let bpSystolic, bpDiastolic
        if (riskLevel === 'high') {
          bpSystolic = 140 + Math.random() * 30
          bpDiastolic = 85 + Math.random() * 15
        } else if (riskLevel === 'medium') {
          bpSystolic = 130 + Math.random() * 20
          bpDiastolic = 80 + Math.random() * 10
        } else {
          bpSystolic = 115 + Math.random() * 15
          bpDiastolic = 70 + Math.random() * 10
        }

        return {
          ...patient,
          vitalsHistory: [
            {
              shift: 1,
              timestamp: new Date(),
              hr: Math.round(baseHR),
              bpSystolic: Math.round(bpSystolic),
              bpDiastolic: Math.round(bpDiastolic),
              temp: Math.round(baseTemp * 10) / 10,
              spo2: Math.round(baseSpo2),
              rr: 16 + Math.floor(Math.random() * 6),
            },
          ],
        }
      }

      return patient
    })

    return res.status(200).json({ data: enrichedPatients })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch patients' })
  }
}

export async function getPatientById(req, res) {
  try {
    const patient = await PatientModel.findById(req.params.id).lean()

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    // Add dummy vitals if missing
    if (!Array.isArray(patient.vitalsHistory) || patient.vitalsHistory.length === 0) {
      const riskLevel = patient.riskLevel || 'low'
      const baseTemp = 36.5 + (Math.random() - 0.5) * 1.5
      const baseHR = riskLevel === 'high' ? 95 + Math.random() * 20 : 70 + Math.random() * 20
      const baseSpo2 = riskLevel === 'high' ? 93 + Math.random() * 4 : 97 + Math.random() * 3

      let bpSystolic, bpDiastolic
      if (riskLevel === 'high') {
        bpSystolic = 140 + Math.random() * 30
        bpDiastolic = 85 + Math.random() * 15
      } else if (riskLevel === 'medium') {
        bpSystolic = 130 + Math.random() * 20
        bpDiastolic = 80 + Math.random() * 10
      } else {
        bpSystolic = 115 + Math.random() * 15
        bpDiastolic = 70 + Math.random() * 10
      }

      patient.vitalsHistory = [
        {
          shift: 1,
          timestamp: new Date(),
          hr: Math.round(baseHR),
          bpSystolic: Math.round(bpSystolic),
          bpDiastolic: Math.round(bpDiastolic),
          temp: Math.round(baseTemp * 10) / 10,
          spo2: Math.round(baseSpo2),
          rr: 16 + Math.floor(Math.random() * 6),
        },
      ]
    }

    return res.status(200).json({ data: patient })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch patient' })
  }
}

export async function updatePatientClinical(req, res) {
  try {
    const { id } = req.params
    const { primaryDiagnosis, riskLevel, currentStatus, criticalReason } = req.body

    const patient = await PatientModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(typeof primaryDiagnosis === 'string' ? { primaryDiagnosis } : {}),
          ...(typeof riskLevel === 'string' ? { riskLevel } : {}),
          ...(typeof currentStatus === 'string' ? { currentStatus } : {}),
          ...(typeof criticalReason === 'string' ? { criticalReason } : {}),
        },
      },
      { new: true },
    ).lean()

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    return res.status(200).json({ message: 'Patient clinical details updated', data: patient })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update patient clinical details' })
  }
}

export async function addMedication(req, res) {
  try {
    const { id } = req.params
    const { name, dose, frequency, status = 'active', lastGiven = '', nextDue = '' } = req.body

    if (!name || !dose || !frequency) {
      return res.status(400).json({ message: 'name, dose and frequency are required' })
    }

    const patient = await PatientModel.findByIdAndUpdate(
      id,
      {
        $push: {
          medications: {
            name,
            dose,
            frequency,
            status,
            lastGiven,
            nextDue,
          },
        },
      },
      { new: true },
    ).lean()

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    return res.status(201).json({ message: 'Medication added', data: patient })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add medication' })
  }
}

export async function addLab(req, res) {
  try {
    const { id } = req.params
    const {
      test,
      result = '',
      reference = '',
      status = 'pending',
      orderedAt = '',
      resultedAt = '',
    } = req.body

    if (!test) {
      return res.status(400).json({ message: 'test is required' })
    }

    const patient = await PatientModel.findByIdAndUpdate(
      id,
      {
        $push: {
          labs: {
            test,
            result,
            reference,
            status,
            orderedAt,
            resultedAt,
          },
        },
      },
      { new: true },
    ).lean()

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    return res.status(201).json({ message: 'Lab added', data: patient })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to add lab' })
  }
}

export async function generatePatientSummary(req, res) {
  try {
    const patient = await PatientModel.findById(req.params.id).lean()

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' })
    }

    const payload = {
      patientId: String(patient._id),
      name: patient.name,
      age: patient.age,
      ward: patient.ward,
      bed: patient.bed,
      riskLevel: patient.riskLevel,
      currentStatus: patient.currentStatus,
      criticalReason: patient.criticalReason,
      primaryDiagnosis: patient.primaryDiagnosis,
      diagnosis: patient.diagnosis,
      symptoms: patient.symptoms,
      medications: Array.isArray(patient.medications) ? patient.medications : [],
      labs: Array.isArray(patient.labs) ? patient.labs : [],
      vitalsHistory: Array.isArray(patient.vitalsHistory) ? patient.vitalsHistory : [],
    }

    const fallback = buildFallbackSummary(patient)

    let aiResult = null
    try {
      aiResult = await callAIService('/analyze/patient-summary', payload)
    } catch (_aiError) {
      aiResult = null
    }

    const source = aiResult?.source || fallback.source
    const model = aiResult?.model || fallback.model
    const reason = aiResult?.reason || null

    // Normalize AI result - ensure arrays are always populated
    const normalizedResult = {
      clinicalSummary: aiResult?.clinicalSummary ? String(aiResult.clinicalSummary).trim() : fallback.clinicalSummary,
      actionsDone: (Array.isArray(aiResult?.actionsDone) && aiResult.actionsDone.length > 0) 
        ? aiResult.actionsDone.map(a => String(a).trim()).filter(Boolean)
        : fallback.actionsDone,
      nextActions: (Array.isArray(aiResult?.nextActions) && aiResult.nextActions.length > 0)
        ? aiResult.nextActions.map(a => String(a).trim()).filter(Boolean)
        : fallback.nextActions,
    }

    return res.status(200).json({
      data: {
        clinicalSummary: normalizedResult.clinicalSummary,
        actionsDone: normalizedResult.actionsDone,
        nextActions: normalizedResult.nextActions,
        source,
        model,
        reason,
        structured: buildStructuredSummary(patient, source),
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Unable to generate patient summary' })
  }
}

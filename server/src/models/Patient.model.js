import mongoose from 'mongoose'

const VitalAlertSchema = new mongoose.Schema(
  {
    vital: String,
    value: String,
    time: String,
    severity: { type: String, enum: ['critical', 'urgent', 'info'] },
    note: String,
    resolved: { type: Boolean, default: false },
  },
  { _id: false },
)

const MedicationSchema = new mongoose.Schema(
  {
    name: String,
    dose: String,
    frequency: String,
    lastGiven: String,
    nextDue: String,
    status: { type: String, enum: ['active', 'paused', 'completed'] },
  },
  { _id: false },
)

const LabSchema = new mongoose.Schema(
  {
    test: String,
    result: String,
    reference: String,
    status: { type: String, enum: ['pending', 'resulted', 'critical'] },
    orderedAt: String,
    resultedAt: String,
  },
  { _id: false },
)

const VitalsSnapshotSchema = new mongoose.Schema(
  {
    shift: Number,
    timestamp: Date,
    hr: Number,
    bpSystolic: Number,
    bpDiastolic: Number,
    temp: Number,
    spo2: Number,
    rr: Number,
  },
  { _id: false },
)

const PatientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: Number,
    ward: String,
    bed: String,
    admissionDate: Date,
    primaryDiagnosis: String,
    doctors: [{ name: String, role: String, specialty: String }],
    alerts: [VitalAlertSchema],
    medications: [MedicationSchema],
    labs: [LabSchema],
    vitalsHistory: [VitalsSnapshotSchema],
    news2Score: { type: Number, default: 0 },
    riskScore: { type: Number, default: 0 },
    trend: {
      type: String,
      enum: ['deteriorating', 'stable', 'improving'],
      default: 'stable',
    },
    currentStatus: String,
    criticalReason: String,

    // Backward-compatible fields used by existing intake flow.
    gender: { type: String, enum: ['male', 'female', 'other'] },
    diagnosis: String,
    symptoms: String,
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], index: true },
  },
  { timestamps: true, versionKey: false },
)

const Patient = mongoose.models.Patient || mongoose.model('Patient', PatientSchema)

export default Patient

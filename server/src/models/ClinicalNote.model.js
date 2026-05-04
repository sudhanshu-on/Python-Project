import mongoose from 'mongoose'

const ClinicalNoteSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    rawText: { type: String, required: true },
    noteType: {
      type: String,
      enum: ['progress_note', 'handoff', 'lab_result', 'doctor_order'],
      default: 'progress_note',
    },
    authorRole: { type: String, enum: ['Nurse', 'Doctor', 'System'], default: 'Nurse' },
    extracted: mongoose.Schema.Types.Mixed,
    chromaIds: [String],
    verified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
)

const ClinicalNote =
  mongoose.models.ClinicalNote || mongoose.model('ClinicalNote', ClinicalNoteSchema)

export default ClinicalNote

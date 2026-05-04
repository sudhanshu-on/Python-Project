import mongoose from 'mongoose'

const HandoffSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    nurseId: String,
    shiftId: String,
    taskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    allAcknowledged: { type: Boolean, default: false },
    signedOffAt: Date,
    news2AtSignoff: Number,
  },
  { timestamps: true, versionKey: false },
)

const Handoff = mongoose.models.Handoff || mongoose.model('Handoff', HandoffSchema)

export default Handoff

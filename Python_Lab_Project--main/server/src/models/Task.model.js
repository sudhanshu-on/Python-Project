import mongoose from 'mongoose'

const TaskSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    task: String,
    due: String,
    priority: { type: String, enum: ['critical', 'urgent', 'info'] },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: String,
    acknowledgedAt: Date,
    shiftId: String,
  },
  { timestamps: true, versionKey: false },
)

const Task = mongoose.models.Task || mongoose.model('Task', TaskSchema)

export default Task

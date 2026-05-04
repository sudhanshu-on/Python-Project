import mongoose from 'mongoose'

const ChatLogSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    query: { type: String, required: true },
    answer: { type: String, required: true },
    sources: [{ chunkId: String, sourceText: String, timestamp: String, authorRole: String, noteType: String }],
    verified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
)

const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', ChatLogSchema)

export default ChatLog

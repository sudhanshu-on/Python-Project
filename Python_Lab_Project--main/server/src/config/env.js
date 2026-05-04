import 'dotenv/config'

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongodbUri: required('MONGODB_URI', process.env.MONGODB_URI),
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  aiInternalKey: process.env.AI_INTERNAL_KEY || '',
}

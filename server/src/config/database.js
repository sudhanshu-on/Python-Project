import mongoose from 'mongoose'
import { env } from './env.js'

let isConnected = false

export async function connectDatabase() {
  if (isConnected) {
    return
  }

  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 300000,
  })

  isConnected = true
}

import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import analyzeRouter from './routes/analyze.routes.js'
import chatRouter from './routes/chat.routes.js'
import { patientRouter } from './routes/patientRoutes.js'
import taskRouter from './routes/task.routes.js'
import wardRouter from './routes/ward.routes.js'

export const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.clientOrigin,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api/patients', patientRouter)
app.use('/api', analyzeRouter)
app.use('/api', chatRouter)
app.use('/api/tasks', taskRouter)
app.use('/api/ward', wardRouter)

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

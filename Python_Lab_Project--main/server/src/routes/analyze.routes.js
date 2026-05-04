import express from 'express'
import { analyzeNote, ingestNote } from '../controllers/analyze.controller.js'

const router = express.Router()

router.post('/analyze', analyzeNote)
router.post('/ingest', ingestNote)

export default router

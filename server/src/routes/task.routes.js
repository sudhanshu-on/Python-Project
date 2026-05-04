import express from 'express'
import { acknowledgeTask, attemptSignoff } from '../controllers/task.controller.js'

const router = express.Router()

router.post('/acknowledge', acknowledgeTask)
router.post('/signoff', attemptSignoff)

export default router

import express from 'express'
import { listPatients } from '../controllers/patientController.js'

const router = express.Router()

router.get('/', listPatients)

export default router

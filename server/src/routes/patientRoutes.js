import { Router } from 'express'
import {
	addLab,
	addMedication,
	createPatient,
	generatePatientSummary,
	getPatientById,
	listPatients,
	updatePatientClinical,
} from '../controllers/patientController.js'

export const patientRouter = Router()

patientRouter.post('/', createPatient)
patientRouter.get('/', listPatients)
patientRouter.get('/:id', getPatientById)
patientRouter.post('/:id/generate-summary', generatePatientSummary)
patientRouter.patch('/:id/clinical', updatePatientClinical)
patientRouter.post('/:id/medications', addMedication)
patientRouter.post('/:id/labs', addLab)

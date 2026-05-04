import { z } from 'zod'

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  age: z.number().int().min(0).max(130),
  gender: z.enum(['male', 'female', 'other']),
  diagnosis: z.string().trim().min(3).max(250),
  symptoms: z.string().trim().min(10).max(2000),
  riskLevel: z.enum(['low', 'medium', 'high']),
  ward: z.enum(['icu', 'surg-b12', 'emergency', 'cardiology', 'peds']),
})

export const navItems = [
  { icon: 'dashboard', label: 'Dashboard', active: true },
  { icon: 'group', label: 'Patients' },
  { icon: 'swap_horiz', label: 'Handoffs' },
  { icon: 'notifications_active', label: 'Alerts' },
  { icon: 'description', label: 'Reports' },
]

export const medications = [
  {
    drug: 'Methylprednisolone',
    dosage: '40mg IV',
    frequency: 'q12h',
    status: 'Active',
    tone: 'active',
  },
  {
    drug: 'Furosemide',
    dosage: '20mg IV',
    frequency: 'PRN',
    status: 'Active',
    tone: 'active',
  },
  {
    drug: 'Albuterol Nebs',
    dosage: '2.5mg',
    frequency: 'q4h',
    status: 'Pending',
    tone: 'pending',
  },
  {
    drug: 'Lisinopril',
    dosage: '10mg PO',
    frequency: 'Daily',
    status: 'Paused',
    tone: 'paused',
  },
]

export const labs = [
  {
    name: 'Creatinine, Serum',
    when: 'Oct 26, 08:00 AM',
    value: '1.82',
    unit: 'mg/dL',
    tag: 'Critical High',
    critical: true,
  },
  {
    name: 'Potassium',
    when: 'Oct 26, 08:00 AM',
    value: '4.2',
    unit: 'mEq/L',
    tag: 'Normal',
    critical: false,
  },
  {
    name: 'White Blood Cells',
    when: 'Oct 25, 11:30 PM',
    value: '14.2',
    unit: 'K/uL',
    tag: 'High',
    critical: true,
  },
]

export const notes = [
  {
    byline: 'Oct 26, 09:15 AM - Dr. Vane (Pulmonary)',
    title: 'Consultation Note',
    body: 'Patient exhibits increased accessory muscle use. Bilateral crackles at bases. Suggesting immediate escalation of O2 therapy via high-flow nasal cannula.',
    emphasis: 'bg-primary',
  },
  {
    byline: 'Oct 26, 06:30 AM - Nurse Sarah Jenkins',
    title: 'Shift Update',
    body: 'Minimal improvement in O2 sats after 40mg IV Methylprednisolone. Urine output slightly diminished last 4 hours. Patient remains cooperative but tired.',
    emphasis: 'bg-primary-fixed',
  },
]

export const statusStyles = {
  active: 'bg-tertiary-fixed text-on-tertiary-fixed',
  pending: 'bg-secondary-container text-on-secondary-container',
  paused: 'bg-error-container text-on-error-container',
}

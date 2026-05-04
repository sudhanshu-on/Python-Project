import { useState } from 'react'
import { createPatient } from '../../services/patientApi'
import useTranslation from '../../hooks/useTranslation'

const initialFormState = {
  fullName: '',
  age: '',
  gender: 'male',
  diagnosis: '',
  symptoms: '',
  riskLevel: 'low',
  ward: '',
}

function NewPatientForm({ onCancel, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initialFormState)
  const [previousHistoryFile, setPreviousHistoryFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function validateForm() {
    if (form.fullName.trim().length < 2) {
      return 'Full name must be at least 2 characters.'
    }

    if (Number(form.age) <= 0) {
      return 'Age must be greater than 0.'
    }

    if (form.diagnosis.trim().length < 3) {
      return 'Primary diagnosis must be at least 3 characters.'
    }

    if (form.symptoms.trim().length < 10) {
      return 'Symptoms must be at least 10 characters.'
    }

    if (!form.ward) {
      return 'Please select a primary ward/unit.'
    }

    return ''
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSaving) {
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setSuccess('')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const result = await createPatient({
        fullName: form.fullName.trim(),
        age: Number(form.age),
        gender: form.gender,
        diagnosis: form.diagnosis.trim(),
        symptoms: form.symptoms.trim(),
        riskLevel: form.riskLevel,
        ward: form.ward,
      })

      setSuccess('Patient registration saved successfully.')
      setForm(initialFormState)
      setPreviousHistoryFile(null)
      onSaved?.(result?.data || null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto bg-surface px-4 pb-28 pt-6 md:px-6 xl:px-8">
      <form id="new-patient-form" onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        <section className="py-2">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-primary">Patient Intake</h2>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            Ensure all fields are completed with clinical precision. Patient data is encrypted and synced with the central hospital registry.
          </p>
        </section>

        <section className="space-y-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm shadow-blue-900/5">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>person</span>
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div className="flex flex-col gap-1.5 md:col-span-4">
              <label className="px-1 text-xs font-semibold text-on-surface">{t('newPatientForm.firstName')}</label>
              <input
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed"
                placeholder="e.g. Johnathan Doe"
                type="text"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="px-1 text-xs font-semibold text-on-surface">{t('newPatientForm.age')}</label>
              <input
                value={form.age}
                onChange={(event) => updateField('age', event.target.value)}
                className="w-full rounded-lg border-none bg-surface-container-low px-4 py-3 transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed"
                placeholder={t('newPatientForm.age')}
                type="number"
                min="0"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-semibold text-on-surface">{t('newPatientForm.gender')}</label>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-container-low p-1.5">
              {['male', 'female', 'other'].map((genderOption) => (
                <button
                  key={genderOption}
                  type="button"
                  onClick={() => updateField('gender', genderOption)}
                  className={`rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                    form.gender === genderOption
                      ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-white/50'
                  }`}
                >
                  {genderOption}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm shadow-blue-900/5">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>clinical_notes</span>
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Clinical Details</h3>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-semibold text-on-surface">Primary Diagnosis / Condition</label>
            <div className="group relative">
              <input
                value={form.diagnosis}
                onChange={(event) => updateField('diagnosis', event.target.value)}
                className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed"
                placeholder="Search ICD-10 or type suspected condition..."
                type="text"
                required
              />
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline transition-colors group-focus-within:text-primary">search</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-semibold text-on-surface">Current Presentation &amp; Symptoms</label>
            <textarea
              value={form.symptoms}
              onChange={(event) => updateField('symptoms', event.target.value)}
              className="w-full resize-none rounded-lg border-none bg-surface-container-low px-4 py-3 transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed"
              placeholder="Describe the current symptoms, duration, and patient physical state..."
              rows="4"
              required
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="space-y-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm shadow-blue-900/5">
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>warning</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Risk Level</h3>
            </div>

            <div className="space-y-3">
              {[
                { key: 'low', label: 'Low Risk', tone: 'hover:bg-tertiary-fixed' },
                { key: 'medium', label: 'Medium Risk', tone: 'hover:bg-secondary-container' },
                { key: 'high', label: 'High Risk', tone: 'hover:bg-error-container' },
              ].map((riskOption) => (
                <label
                  key={riskOption.key}
                  className={`flex cursor-pointer items-center justify-between rounded-lg bg-surface-container-low p-3 transition-colors ${riskOption.tone}`}
                >
                  <span className="text-sm font-semibold text-on-surface">{riskOption.label}</span>
                  <input
                    className="h-5 w-5 border-none bg-white focus:ring-0"
                    name="risk"
                    type="radio"
                    checked={form.riskLevel === riskOption.key}
                    onChange={() => updateField('riskLevel', riskOption.key)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm shadow-blue-900/5">
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>domain</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Unit Allocation</h3>
            </div>

            <div className="flex h-full flex-col gap-1.5">
              <label className="px-1 text-xs font-semibold text-on-surface">Primary Ward / Unit</label>
              <select
                value={form.ward}
                onChange={(event) => updateField('ward', event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border-none bg-surface-container-low px-4 py-3 transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed"
                required
              >
                <option value="" disabled>Select Ward...</option>
                <option value="icu">ICU (Intensive Care)</option>
                <option value="surg-b12">Surgical Floor B-12</option>
                <option value="emergency">Emergency Unit</option>
                <option value="cardiology">Cardiology Center</option>
                <option value="peds">Pediatrics Ward</option>
              </select>

              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-surface-container-low p-4">
                <label className="mb-1 block px-1 text-xs font-semibold text-on-surface">Previous History (PDF)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setPreviousHistoryFile(event.target.files?.[0] || null)}
                  className="w-full cursor-pointer rounded-lg bg-surface-container-lowest px-3 py-2 text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  {previousHistoryFile
                    ? `Selected: ${previousHistoryFile.name}`
                    : 'Upload previous treatment records shared by doctor (PDF only).'}
                </p>
              </div>
            </div>
          </section>
        </div>

        {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-on-tertiary-container">{success}</p> : null}
      </form>

      <nav className="pb-safe fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-2xl bg-white px-6 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center gap-2 px-6 py-2 text-slate-600 transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          <span className="material-symbols-outlined">close</span>
          <span className="text-xs font-medium uppercase tracking-wide">Cancel</span>
        </button>

        <button
          type="submit"
          form="new-patient-form"
          disabled={isSaving}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-2.5 text-white shadow-lg shadow-blue-900/20 transition-transform duration-150 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined">save</span>
          <span className="text-xs font-medium uppercase tracking-wide">{isSaving ? `${t('common.loading')}...` : t('newPatientForm.save')}</span>
        </button>
      </nav>
    </div>
  )
}

export default NewPatientForm

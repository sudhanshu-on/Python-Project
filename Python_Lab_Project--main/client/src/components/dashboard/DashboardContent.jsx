import { useEffect, useMemo, useState } from 'react'
import { labs as defaultLabs, notes, statusStyles } from '../../data/dashboardData'
import { addPatientLab, addPatientMedication, generatePatientSummary } from '../../services/patientApi'
import useTranslation from '../../hooks/useTranslation'

function DashboardContent({ patient, onPatientUpdated }) {
  const { t } = useTranslation()
  const [showMedicationForm, setShowMedicationForm] = useState(false)
  const [savingMedication, setSavingMedication] = useState(false)
  const [medicationError, setMedicationError] = useState('')
  const [showLabForm, setShowLabForm] = useState(false)
  const [savingLab, setSavingLab] = useState(false)
  const [labError, setLabError] = useState('')
  const [medForm, setMedForm] = useState({
    name: '',
    dose: '',
    frequency: '',
    status: 'active',
  })
  const [labForm, setLabForm] = useState({
    test: '',
    result: '',
    reference: '',
    status: 'resulted',
  })
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [summaryData, setSummaryData] = useState(null)
  const [completedNextActions, setCompletedNextActions] = useState({})
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false)

  const vitals = useMemo(() => {
    const history = Array.isArray(patient?.vitalsHistory) ? patient.vitalsHistory : []
    return history[history.length - 1] || null
  }, [patient])

  const medications = Array.isArray(patient?.medications) ? patient.medications : []
  const labs = Array.isArray(patient?.labs) && patient.labs.length > 0 ? patient.labs : defaultLabs

  const bpText = vitals?.bpSystolic && vitals?.bpDiastolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic}` : '--/--'
  const o2Text = vitals?.spo2 ? `${vitals.spo2}%` : '--%'
  const hrText = vitals?.hr ? `${vitals.hr}` : '--'
  const rrText = vitals?.rr ? `${vitals.rr}` : '--'
  const tempText = vitals?.temp ? `${vitals.temp}°C` : '--°C'
  
  // Helper to determine vital sign status color
  const getVitalStatusColor = (type, value) => {
    if (!value) return 'text-slate-400'
    const numValue = Number(value)
    
    switch (type) {
      case 'hr': // Heart rate: normal 60-100
        if (numValue < 60 || numValue > 100) return 'text-error'
        if (numValue < 70 || numValue > 90) return 'text-orange-500'
        return 'text-green-600'
      case 'rr': // Respiratory rate: normal 12-20
        if (numValue < 12 || numValue > 20) return 'text-error'
        if (numValue < 14 || numValue > 18) return 'text-orange-500'
        return 'text-green-600'
      case 'temp': // Temperature: normal 36.5-37.5
        if (numValue < 36 || numValue > 38) return 'text-error'
        if (numValue < 36.5 || numValue > 37.5) return 'text-orange-500'
        return 'text-green-600'
      case 'o2': // SpO2: normal > 95
        if (numValue < 90) return 'text-error'
        if (numValue < 95) return 'text-orange-500'
        return 'text-green-600'
      default:
        return 'text-slate-600'
    }
  }

  const riskLevel = String(patient?.riskLevel || '').toLowerCase()
  const currentStatus = String(patient?.currentStatus || '').toLowerCase()
  const isCriticalPatient = riskLevel === 'high' || currentStatus === 'critical'
  const isMediumRiskPatient = riskLevel === 'medium' || currentStatus === 'watcher'
  const criticalReasonText = patient?.criticalReason || patient?.symptoms || patient?.diagnosis || 'No critical reason provided'
  const primaryConditionText = patient?.primaryDiagnosis || patient?.diagnosis || 'Not specified yet'
  const symptomsText = patient?.symptoms || 'No symptoms documented yet'

  const riskCardClassName = isCriticalPatient
    ? 'bg-error-container text-on-error-container'
    : isMediumRiskPatient
      ? 'bg-secondary-container text-on-secondary-container'
      : 'bg-tertiary-fixed text-on-tertiary-fixed'

  const issueCardClassName = isCriticalPatient
    ? 'border-error/20 bg-error-container/50'
    : isMediumRiskPatient
      ? 'border-secondary/20 bg-secondary-container/40'
      : 'border-tertiary/20 bg-tertiary-fixed/40'

  const issueLabelClassName = isCriticalPatient
    ? 'text-error'
    : isMediumRiskPatient
      ? 'text-secondary'
      : 'text-on-tertiary-container'

  const admittedSource = patient?.admissionDate || patient?.admittedAt || patient?.createdAt || patient?.created_at
  const admittedDate = admittedSource ? new Date(admittedSource) : null
  const admittedDateText = admittedDate && !Number.isNaN(admittedDate.getTime())
    ? admittedDate.toLocaleString()
    : '--'

  const patientName = patient?.name || patient?.fullName || 'Patient'
  const patientInitials = patientName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'PT'
  const avatarSeed = Array.from(patientName).reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const avatarHue = avatarSeed % 360

  const medicationRows = medications.map((item) => {
    const status = (item.status || 'active').toLowerCase()
    return {
      drug: item.name,
      dosage: item.dose,
      frequency: item.frequency,
      statusLabel: status,
      tone: status === 'pending' ? 'pending' : status === 'paused' ? 'paused' : 'active',
    }
  })

  const labRows = labs.map((item) => ({
    name: item.name || item.test,
    when: item.when || item.resultedAt || item.orderedAt || '--',
    value: item.value || item.result || '--',
    unit: item.unit || item.reference || '',
    tag: item.tag || item.status || '--',
    critical: typeof item.critical === 'boolean' ? item.critical : item.status === 'critical',
  }))

  useEffect(() => {
    setSummaryData(null)
    setSummaryError('')
    setCompletedNextActions({})
    setIsSummaryModalOpen(false)
  }, [patient?._id])

  const structuredSummary = useMemo(() => {
    const structured = summaryData?.structured

    return {
      overview: structured?.overview || {
        patientName,
        riskLevel: patient?.riskLevel || 'unknown',
        currentStatus: patient?.currentStatus || 'Under review',
        primaryCondition: patient?.primaryDiagnosis || patient?.diagnosis || 'Not specified',
        keyIssue: patient?.criticalReason || patient?.symptoms || 'No major issue documented',
        generatedAt: new Date().toLocaleString(),
        source: summaryData?.source || 'unknown',
      },
      followups: Array.isArray(structured?.followups) ? structured.followups : [],
      counts: {
        followups: Array.isArray(structured?.followups) ? structured.followups.length : 0,
      },
    }
  }, [summaryData, patient, patientName])

  async function handleMedicationAdd(event) {
    event.preventDefault()
    if (!patient?._id) return

    setSavingMedication(true)
    setMedicationError('')

    try {
      await addPatientMedication(patient._id, medForm)
      setMedForm({ name: '', dose: '', frequency: '', status: 'active' })
      setShowMedicationForm(false)
      onPatientUpdated?.()
    } catch (requestError) {
      setMedicationError(requestError.message)
    } finally {
      setSavingMedication(false)
    }
  }

  async function handleLabAdd(event) {
    event.preventDefault()
    if (!patient?._id) return

    setSavingLab(true)
    setLabError('')

    try {
      await addPatientLab(patient._id, labForm)
      setLabForm({ test: '', result: '', reference: '', status: 'resulted' })
      setShowLabForm(false)
      onPatientUpdated?.()
    } catch (requestError) {
      setLabError(requestError.message)
    } finally {
      setSavingLab(false)
    }
  }

  async function handleGenerateSummary() {
    if (!patient?._id) return

    setSummaryLoading(true)
    setSummaryError('')

    try {
      const result = await generatePatientSummary(patient._id)
      setSummaryData(result?.data || null)
      setCompletedNextActions({})
    } catch (requestError) {
      setSummaryError(requestError.message || 'Unable to generate summary')
    } finally {
      setSummaryLoading(false)
    }
  }

  function toggleNextAction(index) {
    setCompletedNextActions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  if (!patient) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-bright p-8">
        <p className="text-sm font-semibold text-slate-500">Select a patient from Patients list to open the dashboard.</p>
      </div>
    )
  }

  return (
    <>
      <div className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright px-3 py-4 text-[13px] md:px-5 md:py-5 md:text-sm xl:px-6 xl:py-6">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-6 flex flex-col items-start gap-4 xl:flex-row">
          <div className="flex w-full flex-1 flex-col items-start gap-4 rounded-xl border border-white bg-surface-container-lowest p-4 shadow-[0_8px_32px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:p-5 md:gap-8 md:p-8">
            <div className="relative">
              <div
                aria-label="Patient avatar"
                className="flex h-20 w-20 items-center justify-center rounded-2xl text-xl font-black text-white shadow-md md:h-24 md:w-24 md:text-2xl"
                style={{
                  background: `linear-gradient(135deg, hsl(${avatarHue} 78% 44%), hsl(${(avatarHue + 38) % 360} 72% 36%))`,
                }}
              >
                {patientInitials}
              </div>
              {isCriticalPatient ? (
                <div className="absolute -right-2 -top-2 rounded-full bg-error px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-white">Critical</div>
              ) : null}
            </div>

            <div className="flex-1">
              <div className="mb-2 flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
                <div>
                  <h2 className="font-headline text-xl font-extrabold tracking-tight text-on-surface md:text-2xl">{patientName}</h2>
                  <p className="text-xs font-medium text-slate-500 md:text-sm">{patient.age || '--'}y | <span className="font-bold text-on-surface">#{String(patient._id).slice(-8).toUpperCase()}</span> | {(patient.ward || '--').toUpperCase()}, {patient.bed || 'Bed --'}</p>
                </div>
                <div className={`flex w-fit flex-col items-end rounded-lg px-4 py-2 ${riskCardClassName}`}>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Risk Level</span>
                  <span className="text-lg font-black uppercase">{patient.riskLevel || 'low'}</span>
                </div>
              </div>

              {isCriticalPatient ? (
                <p className="mb-3 text-xs font-semibold text-error md:text-sm">Reason: {criticalReasonText}</p>
              ) : null}

              <div className="mt-2 grid gap-3 md:grid-cols-2 md:gap-4">
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Primary Condition</p>
                  <p className="text-xs font-semibold text-primary md:text-sm">{patient.primaryDiagnosis || patient.diagnosis || '--'}</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Admitted</p>
                  <p className="text-xs font-semibold text-on-surface md:text-sm">{admittedDateText}</p>
                </div>
              </div>

              <div className={`mt-3 rounded-lg border p-3 ${issueCardClassName}`}>
                <p className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${issueLabelClassName}`}>
                  {isCriticalPatient ? 'Serious Issue Summary' : 'Clinical Issue Summary'}
                </p>
                <p className="text-xs font-semibold text-on-surface md:text-sm">
                  <span className="font-bold">Condition:</span> {primaryConditionText}
                </p>
                <p className="mt-1 text-xs text-slate-700 md:text-sm">
                  <span className="font-semibold">Issue:</span> {criticalReasonText}
                </p>
                <p className="mt-1 text-xs text-slate-700 md:text-sm">
                  <span className="font-semibold">Symptoms:</span> {symptomsText}
                </p>
              </div>

              <div className="mt-3 rounded-lg border border-primary/20 bg-primary-fixed/20 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Doctor AI Assistant</p>
                    <p className="text-xs text-slate-600 md:text-sm">Generate care summary and next tasks from labs + medications.</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {summaryData ? (
                      <button
                        type="button"
                        onClick={() => setIsSummaryModalOpen(true)}
                        className="w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary sm:w-auto"
                      >
                        {t('dashboard.viewMore')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      disabled={summaryLoading}
                      className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60 sm:w-auto"
                    >
                      {summaryLoading ? 'Generating...' : 'Get Summary'}
                    </button>
                  </div>
                </div>

                {summaryError ? <p className="mt-2 text-xs font-semibold text-error md:text-sm">{summaryError}</p> : null}

                {summaryData ? (
                  <div className="mt-3 space-y-2 rounded-lg bg-white/70 p-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Clinical Summary</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-700 md:text-sm">{summaryData.clinicalSummary || 'No summary generated.'}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">✓ Completed</p>
                        {Array.isArray(summaryData.actionsDone) && summaryData.actionsDone.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-xs text-slate-700 md:text-sm">
                            {summaryData.actionsDone.slice(0, 2).map((action, index) => (
                              <li key={`done-${index}`} className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-slate-600 md:text-sm italic">No actions yet</p>
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">→ Next Actions</p>
                        {Array.isArray(summaryData.nextActions) && summaryData.nextActions.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-xs text-slate-700 md:text-sm">
                            {summaryData.nextActions.slice(0, 2).map((action, index) => (
                              <li key={`next-${index}`} className="flex gap-2">
                                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-xs text-slate-600 md:text-sm italic">None planned</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 border-t border-slate-200 pt-2 text-[10px] text-slate-500">
                      <span className="font-semibold uppercase tracking-wide">
                        Source: {summaryData.source === 'model' ? '🤖 AI Generated' : '📋 Fallback'}
                      </span>
                      {summaryData.reason && <span className="italic">{summaryData.reason}</span>}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 xl:w-[300px] xl:grid-cols-2 xl:gap-3">
            {/* Blood Pressure */}
            <div className="rounded-xl border border-white bg-surface-container-lowest p-4 shadow-sm xl:p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">BP (mmHg)</p>
              <div className="flex items-end justify-between">
                <span className="text-xl font-black text-on-surface md:text-2xl">{bpText}</span>
                <span className="material-symbols-outlined text-lg text-error">trending_up</span>
              </div>
            </div>

            {/* O2 Saturation */}
            <div className="rounded-xl border border-white bg-surface-container-lowest p-4 shadow-sm xl:p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">O2 Sat (%)</p>
              <div className="flex items-end justify-between">
                <span className={`text-xl font-black md:text-2xl ${getVitalStatusColor('o2', vitals?.spo2)}`}>{o2Text}</span>
                <span className="material-symbols-outlined text-lg text-error">trending_down</span>
              </div>
            </div>

            {/* Heart Rate */}
            <div className="rounded-xl border border-white bg-surface-container-lowest p-4 shadow-sm xl:p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">HR (bpm)</p>
              <div className="flex items-end justify-between">
                <span className={`text-xl font-black md:text-2xl ${getVitalStatusColor('hr', vitals?.hr)}`}>{hrText}</span>
                <span className="material-symbols-outlined text-lg text-primary">favorite</span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="rounded-xl border border-white bg-surface-container-lowest p-4 shadow-sm xl:p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">RR (rpm)</p>
              <div className="flex items-end justify-between">
                <span className={`text-xl font-black md:text-2xl ${getVitalStatusColor('rr', vitals?.rr)}`}>{rrText}</span>
                <span className="material-symbols-outlined text-lg text-secondary">lungs</span>
              </div>
            </div>

            {/* Temperature */}
            <div className="rounded-xl border border-white bg-surface-container-lowest p-4 shadow-sm xl:p-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Temp (°C)</p>
              <div className="flex items-end justify-between">
                <span className={`text-xl font-black md:text-2xl ${getVitalStatusColor('temp', vitals?.temp)}`}>{tempText}</span>
                <span className="material-symbols-outlined text-lg text-orange-500">thermostat</span>
              </div>
            </div>

            {/* Fill for 6-column grid at XL */}
            <div className="hidden xl:block" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:gap-6">
          <div className="flex min-h-[360px] flex-col xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-base font-bold tracking-tight text-primary md:text-lg">{t('dashboard.medication')} ({medications.length})</h3>
              <button
                type="button"
                onClick={() => setShowMedicationForm((value) => !value)}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
              >
                {showMedicationForm ? t('common.close') : `${t('common.save')} ${t('dashboard.medication')}`}
              </button>
            </div>

            {showMedicationForm ? (
              <form className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-white bg-surface-container-lowest p-4 md:grid-cols-4" onSubmit={handleMedicationAdd}>
                <input value={medForm.name} onChange={(event) => setMedForm((prev) => ({ ...prev, name: event.target.value }))} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm" placeholder={t('dashboard.medication')} required />
                <input value={medForm.dose} onChange={(event) => setMedForm((prev) => ({ ...prev, dose: event.target.value }))} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm" placeholder={t('dashboard.dose')} required />
                <input value={medForm.frequency} onChange={(event) => setMedForm((prev) => ({ ...prev, frequency: event.target.value }))} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm" placeholder={t('dashboard.frequency')} required />
                <div className="flex gap-2">
                  <select value={medForm.status} onChange={(event) => setMedForm((prev) => ({ ...prev, status: event.target.value }))} className="flex-1 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                    <option value="active">active</option>
                    <option value="pending">pending</option>
                    <option value="paused">paused</option>
                  </select>
                  <button type="submit" disabled={savingMedication} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
                    {savingMedication ? `${t('common.loading')}...` : t('common.save')}
                  </button>
                </div>
                {medicationError ? <p className="text-sm font-semibold text-error md:col-span-4">{medicationError}</p> : null}
              </form>
            ) : null}

            <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white bg-surface-container-lowest shadow-sm">
              <div className="grid grid-cols-4 border-b border-surface-container bg-surface-container-low/50 px-3 py-3 md:px-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Drug</span>
                <span className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Dosage</span>
                <span className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Frequency</span>
                <span className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {medicationRows.length === 0 ? (
                  <p className="px-6 py-6 text-sm text-slate-500">{t('common.noPatients').replace('patients', 'medications')}</p>
                ) : (
                  medicationRows.map((med, idx) => (
                    <div
                      key={`${med.drug}-${idx}`}
                      className={`grid grid-cols-4 items-center px-3 py-4 transition-colors md:px-6 ${idx % 2 === 1 ? 'bg-surface-container-low/10' : 'hover:bg-surface-container-low/30'}`}
                    >
                      <span className="text-xs font-semibold text-on-surface md:text-sm">{med.drug}</span>
                      <span className="text-center text-xs text-slate-600 md:text-sm">{med.dosage}</span>
                      <span className="text-center text-xs text-slate-600 md:text-sm">{med.frequency}</span>
                      <div className="flex justify-end">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyles[med.tone]}`}>
                          {med.statusLabel}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-[360px] flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-base font-bold tracking-tight text-primary md:text-lg">{t('dashboard.lab')}</h3>
              <button
                type="button"
                onClick={() => setShowLabForm((value) => !value)}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
              >
                {showLabForm ? t('common.close') : `${t('common.save')} ${t('dashboard.lab')}`}
              </button>
            </div>

            {showLabForm ? (
              <form className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-white bg-surface-container-lowest p-4" onSubmit={handleLabAdd}>
                <input value={labForm.test} onChange={(event) => setLabForm((prev) => ({ ...prev, test: event.target.value }))} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm" placeholder={`${t('dashboard.lab')} ${t('common.view')}`} required />
                <input value={labForm.result} onChange={(event) => setLabForm((prev) => ({ ...prev, result: event.target.value }))} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm" placeholder={t('dashboard.details')} required />
                <div className="grid grid-cols-2 gap-2">
                  <input value={labForm.reference} onChange={(event) => setLabForm((prev) => ({ ...prev, reference: event.target.value }))} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm" placeholder={t('common.view')} />
                  <select value={labForm.status} onChange={(event) => setLabForm((prev) => ({ ...prev, status: event.target.value }))} className="rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                    <option value="resulted">resulted</option>
                    <option value="pending">pending</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
                <button type="submit" disabled={savingLab} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60">
                  {savingLab ? `${t('common.loading')}...` : `${t('common.save')} ${t('dashboard.lab')}`}
                </button>
                {labError ? <p className="text-sm font-semibold text-error">{labError}</p> : null}
              </form>
            ) : null}

            <div className="no-scrollbar flex-1 overflow-y-auto rounded-xl border border-white bg-surface-container-lowest p-6 shadow-sm">
              <div className="space-y-6">
                {labRows.map((lab, idx) => (
                  <div key={`${lab.name}-${idx}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="mb-0.5 text-xs font-bold text-on-surface">{lab.name}</p>
                        <p className="text-[10px] font-medium text-slate-400">{lab.when}</p>
                      </div>
                      <div className="text-right">
                          <p className={`text-base font-black md:text-lg ${lab.critical ? 'text-error' : 'text-on-surface'}`}>
                          {lab.value} <span className="text-[10px] font-medium text-slate-400">{lab.unit}</span>
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-tighter ${lab.critical ? 'text-error' : 'text-tertiary-container'}`}>
                          {lab.tag}
                        </span>
                      </div>
                    </div>
                    {idx < labRows.length - 1 && <div className="mt-6 h-px bg-surface-container-low" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-base font-bold tracking-tight text-primary md:text-lg">Clinical Documentation</h3>
              <button className="rounded-lg bg-surface-container-high px-4 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-highest">Add Note</button>
            </div>

            <div className="grid grid-cols-1 gap-6 rounded-xl border border-white bg-surface-container-lowest p-6 shadow-sm md:grid-cols-2 md:gap-8">
              {notes.map((note) => (
                <div key={note.byline} className="relative border-l-2 border-primary-fixed pl-6">
                  <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-4 border-white shadow-sm ${note.emphasis}`} />
                  <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">{note.byline}</p>
                  <p className="mb-2 text-sm font-semibold text-on-surface">{note.title}</p>
                  <p className="text-sm italic leading-relaxed text-slate-600">{note.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

      {isSummaryModalOpen && summaryData ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-0 backdrop-blur-sm sm:p-4 md:items-center"
          onClick={() => setIsSummaryModalOpen(false)}
        >
          <div
            className="h-[90vh] w-full overflow-hidden rounded-t-2xl border border-white/60 bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-primary-fixed/50 to-surface-container-low px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Full Clinical AI Brief</p>
                <h3 className="mt-1 font-headline text-base font-extrabold text-on-surface sm:text-lg md:text-xl">{structuredSummary.overview.patientName}</h3>
                <p className="mt-1 text-xs text-slate-600 md:text-sm">Generated: {structuredSummary.overview.generatedAt || '--'}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(false)}
                className="rounded-lg bg-surface-container-high px-3 py-2 text-xs font-bold uppercase tracking-wide text-on-surface"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(90vh-74px)] overflow-y-auto p-3 sm:max-h-[calc(92vh-78px)] sm:p-5">
              <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Risk</p>
                  <p className="mt-1 text-sm font-bold uppercase text-on-surface">{structuredSummary.overview.riskLevel}</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Status</p>
                  <p className="mt-1 text-sm font-bold text-on-surface">{structuredSummary.overview.currentStatus}</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Condition</p>
                  <p className="mt-1 text-sm font-bold text-on-surface">{structuredSummary.overview.primaryCondition}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-error/20 bg-error-container/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-error">Critical Focus</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{structuredSummary.overview.keyIssue}</p>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold uppercase tracking-widest text-primary">📋 Follow-ups & Actions</p>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{structuredSummary.counts.followups}</span>
                </div>

                <div className="space-y-2">
                  {Array.isArray(structuredSummary.followups) && structuredSummary.followups.length > 0 ? (
                    structuredSummary.followups.map((followup) => {
                      const bgColor = 
                        followup.priority === 'critical' ? 'bg-error-container/50 border-error/30' :
                        followup.priority === 'high' ? 'bg-secondary-container/30 border-secondary/20' :
                        'bg-surface-container-low border-slate-100'
                      
                      const priorityColor = 
                        followup.priority === 'critical' ? 'text-error' :
                        followup.priority === 'high' ? 'text-secondary' :
                        'text-slate-600'

                      return (
                        <div key={followup.id} className={`rounded-lg border p-3 transition-all hover:shadow-md ${bgColor}`}>
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-lg">{followup.icon || '•'}</span>
                            <div className="flex-1">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{followup.category}</p>
                                <span className={`text-xs font-bold uppercase tracking-wide ${priorityColor}`}>{followup.priority}</span>
                              </div>
                              <p className="mt-1.5 text-sm font-semibold text-on-surface">{followup.action}</p>
                              <p className="mt-0.5 text-xs text-slate-600">{followup.description}</p>
                              <div className="mt-2 flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-3">
                                <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
                                  ⏱️ {followup.dueTime}
                                </span>
                                {followup.details?.frequency && (
                                  <span className="text-slate-600">Frequency: {followup.details.frequency}</span>
                                )}
                                {followup.details?.dose && (
                                  <span className="text-slate-600">Dose: {followup.details.dose}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-600">No follow-ups scheduled</p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-surface-container-low px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Source: {summaryData.source === 'model' ? '🤖 AI Generated' : '📋 Fallback'}
                </p>
                {summaryData.reason && <p className="mt-1 text-[10px] italic text-slate-500">{summaryData.reason}</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default DashboardContent

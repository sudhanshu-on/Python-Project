import { useEffect, useMemo, useState } from 'react'
import { listPatients } from '../../services/patientApi'

function formatRelativeTime(value) {
  if (!value) return 'just now'

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'just now'

  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000))

  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
  return `${Math.floor(diffMinutes / 1440)}d ago`
}

function getLatestVitals(patient) {
  const history = Array.isArray(patient?.vitalsHistory) ? patient.vitalsHistory : []
  return history.length > 0 ? history[history.length - 1] : null
}

function HandoffContent() {
  const [patients, setPatients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadData() {
      setIsLoading(true)
      setError('')

      try {
        const result = await listPatients()
        if (!active) return
        setPatients(Array.isArray(result?.data) ? result.data : [])
      } catch (requestError) {
        if (!active) return
        setError(requestError.message || 'Unable to load handoff data')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [])

  const analytics = useMemo(() => {
    const totalPatients = patients.length

    const urgentRiskPatients = patients.filter((patient) => {
      const risk = String(patient?.riskLevel || '').toLowerCase()
      const status = String(patient?.currentStatus || '').toLowerCase()
      return risk === 'high' || status === 'critical'
    })

    const pendingActions = patients.reduce((count, patient) => {
      const meds = Array.isArray(patient?.medications) ? patient.medications : []
      const labs = Array.isArray(patient?.labs) ? patient.labs : []
      const pendingMeds = meds.filter((item) => String(item?.status || '').toLowerCase() === 'pending').length
      const pendingLabs = labs.filter((item) => String(item?.status || '').toLowerCase() === 'pending').length
      return count + pendingMeds + pendingLabs
    }, 0)

    const activeAlerts = patients.reduce((count, patient) => {
      const risk = String(patient?.riskLevel || '').toLowerCase()
      const status = String(patient?.currentStatus || '').toLowerCase()
      const labs = Array.isArray(patient?.labs) ? patient.labs : []
      const hasCriticalLab = labs.some((item) => String(item?.status || '').toLowerCase() === 'critical')
      return count + (risk === 'high' || status === 'critical' || hasCriticalLab ? 1 : 0)
    }, 0)

    const overviewCards = [
      {
        label: 'Total Patients',
        value: String(totalPatients).padStart(2, '0'),
        icon: 'groups',
        accent: 'text-primary',
        orb: 'bg-primary/5',
        footer: totalPatients > 0 ? `${Math.max(totalPatients - activeAlerts, 0)} stable` : 'No records',
      },
      {
        label: 'Urgent Risks',
        value: String(urgentRiskPatients.length).padStart(2, '0'),
        icon: 'emergency_home',
        accent: 'text-error',
        orb: 'bg-error/5',
        footer: urgentRiskPatients.length > 0 ? 'Needs immediate review' : 'No urgent patients',
      },
      {
        label: 'Pending Actions',
        value: String(pendingActions).padStart(2, '0'),
        icon: 'assignment_late',
        accent: 'text-secondary',
        orb: 'bg-secondary/5',
        footer: pendingActions > 0 ? 'Meds/labs pending' : 'No pending actions',
      },
      {
        label: 'Active Alerts',
        value: String(activeAlerts).padStart(2, '0'),
        icon: 'vital_signs',
        accent: 'text-on-tertiary-container',
        orb: 'bg-on-tertiary-container/5',
        footer: activeAlerts > 0 ? 'Track closely' : 'All clear',
      },
    ]

    const activities = patients
      .slice()
      .sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0).getTime() - new Date(a?.updatedAt || a?.createdAt || 0).getTime())
      .slice(0, 3)
      .map((patient, index) => {
        const latestLab = Array.isArray(patient?.labs) && patient.labs.length > 0 ? patient.labs[patient.labs.length - 1] : null
        const latestMedication = Array.isArray(patient?.medications) && patient.medications.length > 0 ? patient.medications[patient.medications.length - 1] : null

        if (latestLab) {
          return {
            title: 'Lab Results Updated',
            time: formatRelativeTime(patient?.updatedAt || patient?.createdAt),
            body: `${patient?.name || patient?.fullName || 'Patient'} (${patient?.ward || 'Ward'}): ${latestLab.test || 'Lab'} ${latestLab.result || '--'} ${latestLab.reference || ''}`.trim(),
            icon: 'biotech',
            iconTone: 'bg-secondary-container/30 group-hover:bg-secondary group-hover:text-white',
            tags: ['Lab', String(latestLab.status || 'resulted')],
          }
        }

        if (latestMedication) {
          return {
            title: 'Medication Plan Updated',
            time: formatRelativeTime(patient?.updatedAt || patient?.createdAt),
            body: `${patient?.name || patient?.fullName || 'Patient'} (${patient?.ward || 'Ward'}): ${latestMedication.name || 'Medication'} ${latestMedication.dose || ''} ${latestMedication.frequency || ''}`.trim(),
            icon: 'medication',
            iconTone: 'bg-primary/10 group-hover:bg-primary group-hover:text-white',
            tags: ['Medication', String(latestMedication.status || 'active')],
          }
        }

        return {
          title: 'Patient Record Updated',
          time: formatRelativeTime(patient?.updatedAt || patient?.createdAt),
          body: `${patient?.name || patient?.fullName || 'Patient'} (${patient?.ward || 'Ward'}) clinical profile refreshed.`,
          icon: index % 2 === 0 ? 'sync_alt' : 'edit_note',
          iconTone: index % 2 === 0
            ? 'bg-primary/10 group-hover:bg-primary group-hover:text-white'
            : 'bg-tertiary-fixed/30 group-hover:bg-on-tertiary-container group-hover:text-white',
          tags: ['System Log'],
        }
      })

    const criticalVitals = urgentRiskPatients.slice(0, 2).map((patient) => {
      const vitals = getLatestVitals(patient)
      const spo2 = vitals?.spo2
      const hr = vitals?.hr
      const hasHypoxia = typeof spo2 === 'number' && spo2 < 92

      return {
        title: hasHypoxia ? 'Hypoxia' : 'High Risk Status',
        time: formatRelativeTime(patient?.updatedAt || patient?.createdAt),
        patient: patient?.name || patient?.fullName || 'Patient',
        room: `${String(patient?.ward || 'Ward').toUpperCase()}, ${patient?.bed || 'Bed --'}`,
        metric: hasHypoxia ? 'SpO2 Level' : 'Heart Rate',
        value: hasHypoxia ? String(spo2) : String(hr || '--'),
        unit: hasHypoxia ? '%' : 'bpm',
      }
    })

    const vitalsSynced = patients.filter((patient) => Array.isArray(patient?.vitalsHistory) && patient.vitalsHistory.length > 0).length
    const medsLogged = patients.filter((patient) => Array.isArray(patient?.medications) && patient.medications.length > 0).length
    const notesReady = patients.filter((patient) => (patient?.primaryDiagnosis || patient?.diagnosis || '').trim().length > 0).length

    const readinessParts = totalPatients > 0
      ? [vitalsSynced / totalPatients, medsLogged / totalPatients, notesReady / totalPatients]
      : [0]
    const readiness = Math.round((readinessParts.reduce((sum, value) => sum + value, 0) / readinessParts.length) * 100)

    return {
      overviewCards,
      activities,
      criticalVitals,
      totalPatients,
      vitalsSynced,
      medsLogged,
      notesReady,
      readiness,
    }
  }, [patients])

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto bg-background px-4 pb-8 pt-4 text-[13px] md:px-5 md:text-sm xl:px-7">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="mb-2 text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              Shift Overview <span className="text-primary">Ward 4C</span>
            </h2>
            <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500 shadow-sm">
              <span className="material-symbols-outlined text-base">calendar_today</span>
              <span className="text-xs font-semibold md:text-sm">Monday, Oct 23 | 07:00 - 19:00 Shift</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5 xl:gap-6">
          <div className="col-span-12 space-y-5 lg:col-span-8 xl:space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {analytics.overviewCards.map((card) => (
                <article key={card.label} className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-rich">
                  <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full transition-transform duration-500 group-hover:scale-150 ${card.orb}`} />
                  <p className="relative z-10 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                  <div className="relative z-10 flex items-end justify-between">
                    <h3 className={`text-2xl font-black ${card.accent}`}>{card.value}</h3>
                    <span className={`material-symbols-outlined text-[20px] ${card.accent} opacity-50`}>{card.icon}</span>
                  </div>
                  <p className={`relative z-10 mt-3 text-[10px] font-bold uppercase tracking-wide ${card.accent}`}>{card.footer}</p>
                </article>
              ))}
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-rich">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-1.5 rounded-full bg-primary" />
                  <h4 className="text-base font-extrabold tracking-tight md:text-lg">Clinical Activity Feed</h4>
                </div>
                <button className="rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/5">View Timeline</button>
              </div>

              <div className="divide-y divide-slate-50">
                {analytics.activities.map((activity) => (
                  <div key={activity.title} className="group flex gap-4 px-6 py-5 transition-all hover:bg-slate-50/80">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm transition-all ${activity.iconTone}`}>
                      <span className="material-symbols-outlined text-[20px]">{activity.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <p className="text-xs font-bold text-slate-900 md:text-sm">{activity.title}</p>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-tighter text-slate-400">{activity.time}</span>
                      </div>
                      <p className="mb-3 text-xs leading-relaxed text-slate-600">{activity.body}</p>
                      <div className="flex flex-wrap gap-2">
                        {activity.tags.map((tag) => (
                          <span key={`${activity.title}-${tag}`} className="rounded-full border border-slate-200/50 bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="col-span-12 space-y-5 lg:col-span-4 xl:space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-rich">
              <div className="flex items-center justify-between border-b border-error/10 bg-error/5 px-5 py-4">
                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-error md:text-sm">
                  <span className="material-symbols-outlined animate-pulse text-[18px]">report_problem</span>
                  Critical Vitals
                </h4>
                <span className="rounded-full bg-error px-3 py-1 text-[10px] font-black text-white shadow-error-glow">2 NEW</span>
              </div>

              <div className="space-y-3 p-5">
                {analytics.criticalVitals.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">No critical patients right now.</p>
                ) : analytics.criticalVitals.map((alert) => (
                  <div key={alert.patient} className="cursor-pointer rounded-xl border-l-4 border-error bg-error-container/10 p-4 transition-colors hover:bg-error-container/20">
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-error">{alert.title}</span>
                      <span className="text-[10px] font-bold text-slate-400">{alert.time}</span>
                    </div>
                    <p className="mb-2 text-xs font-black text-slate-900 md:text-sm">
                      {alert.patient} <span className="ml-2 text-xs font-bold text-slate-400 md:text-sm">{alert.room}</span>
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{alert.metric}</p>
                    <p className="text-xl font-black text-error md:text-2xl">
                      {alert.value}
                      <span className="ml-1 text-xs font-bold uppercase text-slate-400">{alert.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-rich">
              <h4 className="mb-6 flex items-center justify-between text-sm font-black text-slate-900 md:text-base">
                Handoff Readiness
                <span className="material-symbols-outlined text-slate-300">verified</span>
              </h4>

              <div className="relative mb-6 flex items-center justify-center py-2">
                <svg className="h-32 w-32 -rotate-90 transform md:h-36 md:w-36" viewBox="0 0 160 160" aria-hidden="true">
                  <defs>
                    <linearGradient id="handoffGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00236f" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <circle cx="80" cy="80" r="72" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100" />
                  <circle cx="80" cy="80" r="72" fill="transparent" stroke="url(#handoffGrad)" strokeWidth="12" strokeDasharray="452.39" strokeDashoffset="144.7" strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-900 md:text-3xl">{analytics.readiness}%</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Verified</span>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-on-tertiary-container" />
                    <span className="text-xs font-bold uppercase tracking-tight text-slate-500">Vitals Synchronized</span>
                  </div>
                  <span className="text-sm font-black text-on-tertiary-container">{analytics.vitalsSynced}/{analytics.totalPatients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-on-tertiary-container" />
                    <span className="text-xs font-bold uppercase tracking-tight text-slate-500">Medications Logged</span>
                  </div>
                  <span className="text-sm font-black text-on-tertiary-container">{analytics.medsLogged}/{analytics.totalPatients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-error" />
                    <span className="text-xs font-bold uppercase tracking-tight text-slate-500">Physician Notes</span>
                  </div>
                  <span className="text-sm font-black text-error">{analytics.notesReady}/{analytics.totalPatients}</span>
                </div>
              </div>

              <button className="w-full rounded-xl bg-primary py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98] hover:bg-blue-900">
                Compile Handoff Packet
              </button>
            </section>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm font-semibold text-slate-500">Loading handoff metrics...</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm font-semibold text-error">{error}</p>
        ) : null}
      </div>
    </div>
  )
}

export default HandoffContent

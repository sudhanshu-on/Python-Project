import { useEffect, useMemo, useState } from 'react'
import { listPatients } from '../../services/patientApi'
import useTranslation from '../../hooks/useTranslation'

function getInitials(name) {
  if (!name) return 'PT'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function trendPath(trend) {
  if (trend === 'deteriorating') return 'M0 35 L10 32 L20 38 L30 15 L40 25 L50 5 L60 12 L70 10 L80 18 L90 2 L100 8'
  if (trend === 'improving') return 'M0 5 L15 15 L30 5 L45 25 L60 15 L75 35 L100 25'
  return 'M0 20 L25 20 L50 20 L75 20 L100 20'
}

function statusMeta(patient) {
  const level = patient.riskLevel || 'low'
  if (level === 'high') {
    return {
      riskClass: 'bg-error-container text-on-error-container',
      riskLabel: 'High Risk',
      statusDot: 'bg-error animate-pulse',
      statusText: 'text-error',
      statusLabel: 'Critical',
      trendColor: 'text-error',
    }
  }

  if (level === 'medium') {
    return {
      riskClass: 'bg-orange-100 text-orange-700',
      riskLabel: 'Moderate',
      statusDot: 'bg-orange-500',
      statusText: 'text-orange-600',
      statusLabel: 'Watcher',
      trendColor: 'text-orange-500',
    }
  }

  return {
    riskClass: 'bg-tertiary-fixed text-[#005321]',
    riskLabel: 'Low Risk',
    statusDot: 'bg-green-500',
    statusText: 'text-green-600',
    statusLabel: 'Stable',
    trendColor: 'text-green-500',
  }
}

function latestVitals(patient) {
  const history = Array.isArray(patient.vitalsHistory) ? patient.vitalsHistory : []
  const last = history[history.length - 1] || {}

  return {
    bp: last.bpSystolic && last.bpDiastolic ? `${last.bpSystolic}/${last.bpDiastolic}` : '--/--',
    o2: last.spo2 ? `${last.spo2}%` : '--%',
    hr: last.hr || '--',
  }
}

function PatientsListPanel({ refreshKey, onOpenPatient, onNewPatient }) {
  const { t } = useTranslation()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadPatients() {
      setLoading(true)
      setError('')

      try {
        const result = await listPatients()
        if (!active) return
        setPatients(Array.isArray(result.data) ? result.data : [])
      } catch (fetchError) {
        if (!active) return
        setError(fetchError.message || 'Unable to load patients')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadPatients()

    return () => {
      active = false
    }
  }, [refreshKey])

  const criticalCount = useMemo(
    () => patients.filter((patient) => patient.riskLevel === 'high').length,
    [patients],
  )

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto bg-surface-bright">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-slate-50/70 px-4 shadow-sm shadow-slate-200/50 backdrop-blur-xl md:px-8">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-full max-w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
            <input className="w-full rounded-lg border-none bg-surface-container-low py-2 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20" placeholder={t('patientList.search')} type="text" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/50">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/50">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <div className="mx-2 h-8 w-[1px] bg-slate-200" />
          <div className="flex cursor-pointer items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-blue-900">Dr. Aris Thorne</p>
              <p className="text-[10px] text-slate-500">Chief Resident</p>
            </div>
            <img
              alt="User profile"
              className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuABa9H_oWM9HpOCGwBbZ-k6YwfVVK6a3Y2UmxU7ZY32t_zyzbM_y5JHPqFvE5KwcAj-AQ-JZLTlUCsJKmxekZAvlNAJ06PoRzRR1xQil-xuZssGErFT8GyPunsD6blBvwuorLjJmTeIvQJVjPoNFXnmrxSSVqVuglPv5PcW1lpta09MWbdf9dhqk8QP8ngQ82EfFMWWYZecT19JVAigb3bNkAmvNRETysZwZtBorGzWJNwgErMA3F9SQp_O4HQeA2TRheW6U-ZBAA"
            />
          </div>
        </div>
      </header>

      <div className="px-4 pb-8 pt-6 md:px-6 xl:px-8">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="mb-8 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <nav className="mb-1 flex gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>Clinical Workspace</span>
              <span>/</span>
              <span className="text-primary">Patient Registry</span>
            </nav>
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-900">Active Patient Census</h1>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg bg-surface-container-highest px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-white">
              Download Report
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-container px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-900/10 transition-transform active:scale-95">
              <span className="material-symbols-outlined text-lg">filter_list</span>
              Advanced Filter
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-surface-container-lowest p-6 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Patients</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">{patients.length}</span>
              <span className="text-xs font-medium text-green-500">Live count</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-surface-container-lowest p-6 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Critical Status</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-error">{criticalCount}</span>
              <span className="text-xs font-medium text-slate-400">
                {patients.length ? `${Math.round((criticalCount / patients.length) * 100)}% of census` : '0% of census'}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-surface-container-lowest p-6 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Awaiting Transfer</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">08</span>
              <span className="text-xs font-medium text-slate-400">Step-down unit</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-surface-container-lowest p-6 shadow-sm">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Average Acuity</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-900">3.4</span>
              <span className="text-xs font-medium text-orange-500">Elevated</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
            <div className="flex gap-4">
              <button className="border-b-2 border-primary pb-1 text-sm font-bold text-primary">All Patients</button>
              <button className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600">My Assignments</button>
              <button className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600">Flagged</button>
            </div>
            <span className="text-xs text-slate-400">Showing 1-{Math.min(patients.length, 10)} of {patients.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <th className="px-6 py-4 font-bold">{t('patientList.name')}</th>
                  <th className="px-6 py-4 font-bold">{t('patientList.age')}</th>
                  <th className="px-6 py-4 font-bold">{t('patientList.riskLevel')}</th>
                  <th className="px-6 py-4 font-bold">Latest Vitals</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 text-center font-bold">Trend</th>
                  <th className="px-6 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-slate-500" colSpan={7}>Loading patients...</td>
                  </tr>
                ) : null}

                {!loading && error ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-error" colSpan={7}>{error}</td>
                  </tr>
                ) : null}

                {!loading && !error && patients.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-sm text-slate-500" colSpan={7}>No patients available. Add a new patient to get started.</td>
                  </tr>
                ) : null}

                {!loading && !error
                  ? patients.map((patient) => {
                      const meta = statusMeta(patient)
                      const vitals = latestVitals(patient)
                      return (
                        <tr
                          key={patient._id}
                          className="cursor-pointer transition-colors hover:bg-slate-50/50"
                          onClick={() => onOpenPatient(patient)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                                {getInitials(patient.name || patient.fullName)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-blue-900">{patient.name || patient.fullName}</p>
                                <p className="text-[10px] text-slate-400">ID: #{String(patient._id).slice(-6).toUpperCase()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-700">{patient.age || '--'}y / <span className="font-bold">{(patient.ward || 'GEN').toUpperCase()}</span> / {patient.bed || 'Bed --'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-tight ${meta.riskClass}`}>
                              {meta.riskLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-4">
                              <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-slate-400">BP</p>
                                <p className={`text-xs font-bold ${patient.riskLevel === 'high' ? 'text-error' : 'text-blue-900'}`}>{vitals.bp}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-slate-400">O2</p>
                                <p className={`text-xs font-bold ${patient.riskLevel === 'high' ? 'text-error' : 'text-blue-900'}`}>{vitals.o2}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-slate-400">HR</p>
                                <p className={`text-xs font-bold ${patient.riskLevel === 'high' ? 'text-error' : 'text-blue-900'}`}>{vitals.hr}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${meta.statusDot}`}></div>
                              <span className={`text-xs font-bold ${meta.statusText}`}>{patient.currentStatus || meta.statusLabel}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <svg className={`h-8 w-16 ${meta.trendColor}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 100 40">
                                <path d={trendPath(patient.trend)}></path>
                              </svg>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                onOpenPatient(patient)
                              }}
                              className="text-slate-400 transition-colors hover:text-primary"
                            >
                              <span className="material-symbols-outlined">more_vert</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-6">
            <p className="text-xs text-slate-500">Rows per page: <span className="font-bold text-slate-700">10</span></p>
            <div className="flex items-center gap-1">
              <button className="flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-200"><span className="material-symbols-outlined text-sm">first_page</span></button>
              <button className="flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-200"><span className="material-symbols-outlined text-sm">navigate_before</span></button>
              <button className="flex h-8 items-center justify-center rounded bg-primary px-3 text-xs font-bold text-white">1</button>
              <button className="flex h-8 items-center justify-center rounded px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200">2</button>
              <button className="flex h-8 items-center justify-center rounded px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200">3</button>
              <span className="px-2 text-slate-400">...</span>
              <button className="flex h-8 items-center justify-center rounded px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200">12</button>
              <button className="flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-200"><span className="material-symbols-outlined text-sm">navigate_next</span></button>
              <button className="flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-200"><span className="material-symbols-outlined text-sm">last_page</span></button>
            </div>
          </div>
        </div>
      </div>
      </div>

      <button
        type="button"
        onClick={onNewPatient}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-2xl transition-all hover:scale-110 active:scale-90"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  )
}

export default PatientsListPanel

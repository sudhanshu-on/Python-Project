import { useEffect, useState } from 'react'
import DashboardContent from './components/dashboard/DashboardContent'
import HandoffContent from './components/handoff/HandoffContent'
import AiAssistantPanel from './components/layout/AiAssistantPanel'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import NewPatientForm from './components/patient/NewPatientForm'
import PatientsListPanel from './components/patient/PatientsListPanel'
import ReferralsContent from './components/referrals/ReferralsContent'
import { getPatientById } from './services/patientApi'
import { LanguageProvider } from './contexts/LanguageContext'
import useTranslation from './hooks/useTranslation'

const VIEW = {
  DASHBOARD: 'dashboard',
  PATIENTS: 'patients',
  NEW_PATIENT: 'new_patient',
  HANDOFFS: 'handoffs',
  REFERRALS: 'referrals',
}

function AppContent() {
  const { t } = useTranslation()
  const [activeView, setActiveView] = useState(VIEW.PATIENTS)
    const [isAiOpen, setIsAiOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [patientRefreshKey, setPatientRefreshKey] = useState(0)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1279px)')

    function handleViewportChange() {
      if (mediaQuery.matches) {
        setIsAiOpen(false)
      } else {
          setIsAiOpen(false) // Ensure it stays closed on larger screens
      }
    }

    handleViewportChange()
    mediaQuery.addEventListener('change', handleViewportChange)

    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  useEffect(() => {
    let active = true

    async function loadPatient() {
      if (!selectedPatientId) {
        return
      }

      try {
        const result = await getPatientById(selectedPatientId)
        if (active) {
          setSelectedPatient(result.data || null)
        }
      } catch (_error) {
        // Keep prior selected patient on fetch failure.
      }
    }

    loadPatient()

    return () => {
      active = false
    }
  }, [selectedPatientId, patientRefreshKey])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-surface text-on-surface">
      <Sidebar
        activeView={activeView}
        onOpenDashboard={() => setActiveView(VIEW.DASHBOARD)}
        onOpenPatients={() => setActiveView(VIEW.PATIENTS)}
        onOpenHandoffs={() => setActiveView(VIEW.HANDOFFS)}
        onOpenReferrals={() => setActiveView(VIEW.REFERRALS)}
        onNewPatient={() => setActiveView(VIEW.NEW_PATIENT)}
      />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeView !== VIEW.PATIENTS ? (
          <TopBar
            title={
              activeView === VIEW.NEW_PATIENT
                ? t('views.registerPatient')
                : activeView === VIEW.HANDOFFS
                  ? t('views.handoffs')
                  : activeView === VIEW.REFERRALS
                    ? t('views.referrals') || 'Patient Referrals'
                    : t('views.dashboard')
            }
            showSearch={activeView !== VIEW.NEW_PATIENT && activeView !== VIEW.REFERRALS}
            onBack={
              activeView === VIEW.NEW_PATIENT || activeView === VIEW.DASHBOARD
                ? () => setActiveView(VIEW.PATIENTS)
                : undefined
            }
            onToggleAiPanel={() => setIsAiOpen((prev) => !prev)}
            isAiOpen={isAiOpen}
            onNewPatient={() => setActiveView(VIEW.NEW_PATIENT)}
            showNewPatient={activeView !== VIEW.NEW_PATIENT}
          />
        ) : null}

        {activeView === VIEW.DASHBOARD ? (
          <DashboardContent
            patient={selectedPatient}
            onPatientUpdated={() => setPatientRefreshKey((value) => value + 1)}
          />
        ) : activeView === VIEW.PATIENTS ? (
          <PatientsListPanel
            refreshKey={patientRefreshKey}
            onNewPatient={() => setActiveView(VIEW.NEW_PATIENT)}
            onOpenPatient={(patient) => {
              setSelectedPatient(patient)
              setSelectedPatientId(patient?._id || patient?.id || null)
              setActiveView(VIEW.DASHBOARD)
            }}
          />
        ) : activeView === VIEW.HANDOFFS ? (
          <HandoffContent />
        ) : activeView === VIEW.REFERRALS ? (
          <ReferralsContent onNewReferral={() => {}} />
        ) : (
          <NewPatientForm
            onCancel={() => setActiveView(VIEW.PATIENTS)}
            onSaved={(patient) => {
              setSelectedPatient(patient || null)
              setSelectedPatientId(patient?._id || patient?.id || null)
              setPatientRefreshKey((value) => value + 1)
              setActiveView(VIEW.PATIENTS)
            }}
          />
        )}
      </main>

      {activeView === VIEW.DASHBOARD ? <AiAssistantPanel isOpen={isAiOpen} /> : null}
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App

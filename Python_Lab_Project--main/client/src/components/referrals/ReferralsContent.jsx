import { useEffect, useState } from 'react'
import { listPatients } from '../../services/patientApi'
import useTranslation from '../../hooks/useTranslation'
import ReferralForm from './ReferralForm'

function ReferralsContent({ onNewReferral }) {
  const { t } = useTranslation()
  const [patients, setPatients] = useState([])
  const [filteredPatients, setFilteredPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [showReferralForm, setShowReferralForm] = useState(false)

  useEffect(() => {
    async function loadPatients() {
      setLoading(true)
      try {
        const response = await listPatients()
        setPatients(response.data || [])
        setFilteredPatients(response.data || [])
      } catch (error) {
        console.error('Error loading patients:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPatients()
  }, [])

  // Load referrals from localStorage
  useEffect(() => {
    const savedReferrals = localStorage.getItem('patientReferrals')
    if (savedReferrals) {
      setReferrals(JSON.parse(savedReferrals))
    }
  }, [])

  useEffect(() => {
    if (search.trim()) {
      const filtered = patients.filter(
        (p) =>
          (p.name || p.fullName || '')
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (p._id || p.id || '').toLowerCase().includes(search.toLowerCase())
      )
      setFilteredPatients(filtered)
    } else {
      setFilteredPatients(patients)
    }
  }, [search, patients])

  const handleReferralSubmit = (referralData) => {
    const newReferral = {
      id: Date.now(),
      patientId: selectedPatient?._id || selectedPatient?.id,
      patientName: selectedPatient?.name || selectedPatient?.fullName,
      ...referralData,
      referredAt: new Date().toISOString(),
      status: 'pending',
    }

    const updatedReferrals = [...referrals, newReferral]
    setReferrals(updatedReferrals)
    localStorage.setItem('patientReferrals', JSON.stringify(updatedReferrals))
    
    setShowReferralForm(false)
    setSelectedPatient(null)
  }

  const getReferralStatus = (status) => {
    switch (status) {
      case 'pending':
        return 'text-orange-500'
      case 'accepted':
        return 'text-green-600'
      case 'rejected':
        return 'text-error'
      default:
        return 'text-slate-500'
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-surface-bright px-6 py-4 shadow-sm">
        <h2 className="text-lg font-bold text-primary">{t('referrals.title') || 'Patient Referrals'}</h2>
        <p className="text-xs text-slate-500">{t('referrals.subtitle') || 'Refer patients to other hospitals'}</p>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6 p-6">
        {/* Left: Patient Selection */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="mb-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                placeholder={t('patientList.search') || 'Search patients...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border-none bg-surface-container-low py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-slate-500">{t('common.loading') || 'Loading...'}</p>
            </div>
          ) : filteredPatients.length > 0 ? (
            <div className="space-y-2 overflow-y-auto pr-2">
              {filteredPatients.map((patient) => (
                <button
                  key={patient._id || patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                    selectedPatient?._id === (patient._id || patient.id) || selectedPatient?.id === patient.id
                      ? 'border-primary bg-primary-fixed/20'
                      : 'border-slate-100 bg-white hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {(patient.name || patient.fullName || 'P')
                        .split(' ')
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{patient.name || patient.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {patient._id || patient.id}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <p className="text-slate-500">{t('patientList.noPatients') || 'No patients found'}</p>
            </div>
          )}
        </div>

        {/* Right: Referral Form or Details */}
        <div className="w-96 flex flex-col rounded-xl border border-slate-100 bg-surface-container-lowest p-6 shadow-sm">
          {selectedPatient ? (
            <>
              {showReferralForm ? (
                <ReferralForm
                  patient={selectedPatient}
                  onSubmit={handleReferralSubmit}
                  onCancel={() => setShowReferralForm(false)}
                />
              ) : (
                <>
                  <div className="mb-6 pb-4 border-b border-slate-200">
                    <h3 className="font-headline text-lg font-bold text-primary mb-2">
                      {selectedPatient.name || selectedPatient.fullName}
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold">ID:</span> {selectedPatient._id || selectedPatient.id}</p>
                      <p><span className="font-semibold">{t('patientList.age') || 'Age'}:</span> {selectedPatient.age || '--'} years</p>
                      <p><span className="font-semibold">{t('patientList.gender') || 'Gender'}:</span> {selectedPatient.gender || '--'}</p>
                      <p><span className="font-semibold">{t('patientList.riskLevel') || 'Risk Level'}:</span> {selectedPatient.riskLevel || '--'}</p>
                      <p><span className="font-semibold">Diagnosis:</span> {selectedPatient.diagnosis || '--'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowReferralForm(true)}
                    className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-white font-semibold transition-transform hover:scale-105 active:scale-95"
                  >
                    <span className="material-symbols-outlined">send</span>
                    {t('referrals.refer') || 'Create Referral'}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
              <p className="text-slate-500">{t('referrals.selectPatient') || 'Select a patient to refer'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Referrals History */}
      {referrals.length > 0 && (
        <div className="border-t border-slate-100 bg-surface-bright p-6">
          <h3 className="font-headline text-base font-bold text-primary mb-4">{t('referrals.history') || 'Referral History'}</h3>
          <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
            {referrals.map((referral) => (
              <div key={referral.id} className="rounded-lg border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{referral.patientName}</p>
                    <p className="text-xs text-slate-500">
                      To: <span className="font-semibold">{referral.hospitalName}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(referral.referredAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${getReferralStatus(referral.status)}`}>
                    {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReferralsContent

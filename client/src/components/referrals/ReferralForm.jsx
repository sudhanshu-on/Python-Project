import { useState } from 'react'
import useTranslation from '../../hooks/useTranslation'

function ReferralForm({ patient, onSubmit, onCancel }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    hospitalName: '',
    departmentName: '',
    reason: '',
    notes: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validation
    if (!formData.hospitalName.trim()) {
      alert(t('referrals.hospitalRequired') || 'Hospital name is required')
      return
    }
    if (!formData.reason.trim()) {
      alert(t('referrals.reasonRequired') || 'Referral reason is required')
      return
    }

    onSubmit(formData)
    setFormData({
      hospitalName: '',
      departmentName: '',
      reason: '',
      notes: '',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="mb-4 pb-4 border-b border-slate-200">
        <h3 className="font-headline text-lg font-bold text-primary">
          {t('referrals.createReferral') || 'Create Referral'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {t('referrals.patientName') || 'Patient'}: <span className="font-semibold text-slate-900">{patient.name || patient.fullName}</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {/* Hospital Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-on-surface">
            {t('referrals.hospitalName') || 'Hospital Name'} *
          </label>
          <input
            type="text"
            name="hospitalName"
            value={formData.hospitalName}
            onChange={handleChange}
            placeholder={t('referrals.hospitalPlaceholder') || 'e.g., City Medical Center'}
            className="rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        {/* Department Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-on-surface">
            {t('referrals.departmentName') || 'Department/Speciality'}
          </label>
          <input
            type="text"
            name="departmentName"
            value={formData.departmentName}
            onChange={handleChange}
            placeholder={t('referrals.departmentPlaceholder') || 'e.g., Cardiology'}
            className="rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Referral Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-on-surface">
            {t('referrals.reason') || 'Reason for Referral'} *
          </label>
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder={t('referrals.reasonPlaceholder') || 'e.g., Complex cardiac condition requiring specialist evaluation'}
            rows={3}
            className="rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
            required
          />
        </div>

        {/* Additional Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-on-surface">
            {t('referrals.notes') || 'Additional Notes'}
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder={t('referrals.notesPlaceholder') || 'Any additional information...'}
            rows={2}
            className="rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Patient Summary */}
        <div className="rounded-lg border border-primary/20 bg-primary-fixed/10 p-3">
          <p className="text-xs font-semibold text-primary mb-2">
            {t('referrals.patientSummary') || 'Patient Information'}
          </p>
          <div className="text-xs space-y-1 text-slate-600">
            <p><span className="font-semibold">Diagnosis:</span> {patient.diagnosis || '--'}</p>
            <p><span className="font-semibold">Symptoms:</span> {patient.symptoms || '--'}</p>
            <p><span className="font-semibold">Risk Level:</span> {patient.riskLevel || '--'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
        >
          {t('common.cancel') || 'Cancel'}
        </button>
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
        >
          <span className="material-symbols-outlined text-base">check_circle</span>
          {t('referrals.sendReferral') || 'Send Referral'}
        </button>
      </div>
    </form>
  )
}

export default ReferralForm

import { useState } from 'react'
import useTranslation from '../../hooks/useTranslation'
import { languageOptions } from '../../data/translations'

function Sidebar({ activeView, onOpenDashboard, onOpenPatients, onOpenHandoffs, onOpenReferrals, onNewPatient }) {
  const { t, changeLanguage, language } = useTranslation()
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)

  const navItems = [
    { icon: 'dashboard', label: t('sidebar.dashboard'), view: 'dashboard', onClick: onOpenDashboard },
    { icon: 'group', label: t('sidebar.patients'), view: 'patients', onClick: onOpenPatients },
    { icon: 'swap_horiz', label: t('sidebar.handoffs'), view: 'handoffs', onClick: onOpenHandoffs },
    { icon: 'send', label: t('sidebar.referrals') || 'Referrals', view: 'referrals', onClick: onOpenReferrals },
  ]

  const currentLanguageName = languageOptions.find((opt) => opt.code === language)?.name || 'English'
  const currentLanguageFlag = languageOptions.find((opt) => opt.code === language)?.flag || '🇺🇸'

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode)
    setIsLanguageDropdownOpen(false)
  }

  return (
    <aside className="hidden h-dvh w-[84px] flex-col border-r border-slate-100 bg-white py-5 shadow-[8px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 md:flex xl:w-56">
      <div className="mb-8 flex items-center gap-3 px-5 xl:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-white">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
        </div>
        <div className="hidden xl:block">
          <h1 className="font-headline text-xl font-bold leading-tight tracking-tight text-primary">{t('sidebar.title')}</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('sidebar.version')}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-2 xl:px-3">
        {navItems.map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={item.onClick}
            className={`group flex items-center gap-4 rounded-r-full px-4 py-3 transition-all duration-200 ${
              activeView === item.view
                ? 'bg-surface-container-low text-primary'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="hidden text-[13px] font-semibold uppercase tracking-wide xl:block">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-4 px-4 xl:px-6">
        <button
          type="button"
          onClick={onNewPatient}
          className="hidden w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-95 xl:flex"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {t('sidebar.newPatient')}
        </button>
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          {/* Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex w-full items-center gap-4 px-4 py-2 text-slate-400 transition-colors hover:text-primary"
              title={t('sidebar.language')}
            >
              <span className="text-xl">{currentLanguageFlag}</span>
              <span className="hidden text-xs font-semibold uppercase tracking-wider xl:block">{currentLanguageName}</span>
              <span className={`material-symbols-outlined ml-auto text-sm transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {/* Language Dropdown Menu */}
            {isLanguageDropdownOpen && (
              <div className="absolute left-4 bottom-full mb-2 w-[calc(100%-32px)] rounded-lg border border-slate-100 bg-white shadow-lg z-50">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
                      language === lang.code
                        ? 'bg-primary-container text-primary'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    {lang.name}
                    {language === lang.code && (
                      <span className="material-symbols-outlined ml-auto text-sm">check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a className="flex items-center gap-4 px-4 py-2 text-slate-400 transition-colors hover:text-slate-600" href="#">
            <span className="material-symbols-outlined text-xl">contact_support</span>
            <span className="hidden text-xs font-semibold uppercase tracking-wider xl:block">{t('sidebar.support')}</span>
          </a>
          <a className="flex items-center gap-4 px-4 py-2 text-slate-400 transition-colors hover:text-error" href="#">
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="hidden text-xs font-semibold uppercase tracking-wider xl:block">{t('sidebar.signOut')}</span>
          </a>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

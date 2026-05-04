import useTranslation from '../../hooks/useTranslation'

function TopBar({
  title,
  showSearch,
  onBack,
  onToggleAiPanel,
  isAiOpen,
  onNewPatient,
  showNewPatient,
}) {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-50 flex w-full items-center justify-between bg-surface-bright/85 px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl md:px-6 xl:px-8">
      <div className="flex items-center gap-4 md:gap-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 text-blue-900 transition-colors hover:bg-slate-100"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : null}

        <div className="font-headline text-xl font-bold tracking-tight text-primary">{title}</div>

        {showSearch ? (
          <div className="relative hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span>
            <input
              className="w-[clamp(16rem,26vw,24rem)] rounded-full border-none bg-surface-container-low py-2 pl-10 pr-6 text-sm transition-all focus:ring-2 focus:ring-primary/20"
              placeholder={t('topBar.search')}
              type="text"
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {showNewPatient ? (
          <button
            type="button"
            onClick={onNewPatient}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white md:hidden"
          >
            {t('topBar.newPatient')}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onToggleAiPanel}
          className="inline-flex items-center gap-1 rounded-lg bg-surface-container-low px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-base">chat</span>
          {isAiOpen ? t('topBar.hideAi') : t('topBar.showAi')}
        </button>

        <div className="hidden items-center gap-2 md:flex">
          <button className="rounded-full p-2 text-slate-500 transition-colors hover:bg-surface-container-low">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="rounded-full p-2 text-slate-500 transition-colors hover:bg-surface-container-low">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>

        <div className="hidden h-8 w-px bg-slate-200 md:block" />

        <div className="hidden items-center gap-3 md:flex">
          <div className="text-right">
            <p className="text-sm font-semibold text-primary">Dr. Julian Vane</p>
            <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Chief Medical Officer</p>
          </div>
          <img
            alt="Chief Medical Officer profile"
            className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUSkUOTW_jS_2r82R_HbwfSzPvGQ127MjP8g99IEiJP0BYtdGkdzyjh7vPDhVrmPGuurVMHQ-4olhvwOukb_V-kHYSeuug3lZPLCr59xih5hW59ob52X-6XP1S8sQ4_CW9BuSnLN4XY_Ym_H-HBr6PKvvNZrdlBzUrqZ2jzYpdofDI1Z9OK8m7RZxfPMP8yIIyuokhB2iEpgplDfAbJOz98dIx0cFGRVUp-8RZKwgUjINJVj8VgJ5RqcTRoMUZAZEC7Jo2SHHFx7A"
          />
        </div>
      </div>
    </header>
  )
}

export default TopBar

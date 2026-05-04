function AiAssistantPanel({ isOpen }) {
  return (
    <aside
      className={`fixed right-0 top-0 z-[60] h-dvh w-full max-w-[360px] flex-col border-l border-slate-100 bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.03)] transition-transform duration-300 xl:static xl:flex xl:max-w-[350px] xl:translate-x-0 2xl:max-w-[370px] ${
        isOpen ? 'translate-x-0 flex' : 'translate-x-full hidden xl:hidden'
      }`}
    >
      <div className="border-b border-slate-50 p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-blue-900/10">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <div>
            <h2 className="font-headline text-xl font-black tracking-tight text-primary">ShiftCare AI</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Always Active Assistant</p>
          </div>
        </div>

        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">analytics</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Clinical Insight</span>
          </div>

          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-error" />
              <p className="text-xs font-semibold text-slate-700">Patient shows increasing systolic BP trend (Avg 145 last 4hrs).</p>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-error" />
              <p className="text-xs font-semibold text-slate-700">High-risk lab results for renal panel (Creatinine 1.82).</p>
            </li>
            <li className="mt-4 flex items-start gap-3 rounded-lg border border-primary/5 bg-white p-3 shadow-sm">
              <span className="material-symbols-outlined text-lg text-primary">lightbulb</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-tight text-primary">Suggested Action</p>
                <p className="text-xs font-bold text-on-surface">Review of Lisinopril/Furosemide adjustment immediately.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="no-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto p-6 md:p-8">
        <div className="max-w-[85%] self-start rounded-xl rounded-bl-none border border-white bg-surface-container-low p-4">
          <p className="text-xs font-medium text-slate-600">Hello Dr. Vane. I have analyzed Elena Rodriguez history. Would you like a discharge summary or a shift handover report?</p>
        </div>
        <div className="max-w-[85%] self-end rounded-xl rounded-br-none bg-primary p-4 text-white shadow-md">
          <p className="text-xs font-medium">Generate a summary of pulmonary status over the last 12 hours.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-primary" />
          <div className="h-1 w-1 rounded-full bg-primary opacity-50" />
          <div className="h-1 w-1 rounded-full bg-primary opacity-25" />
          <span className="ml-2 text-[10px] font-bold uppercase text-primary">AI is thinking...</span>
        </div>
      </div>

      <div className="mt-auto border-t border-slate-50 bg-white p-6 md:p-8">
        <button className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container py-4 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-transform active:scale-[0.98]">
          <span className="material-symbols-outlined text-sm">summarize</span>
          Generate Summary
        </button>
        <div className="relative">
          <input className="w-full rounded-xl border-none bg-surface-container-low py-4 pl-5 pr-14 text-sm placeholder:text-slate-400 transition-all focus:bg-white focus:ring-2 focus:ring-primary/10" placeholder="Ask about patient history..." type="text" />
          <button className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-primary-container text-white shadow-md">
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default AiAssistantPanel

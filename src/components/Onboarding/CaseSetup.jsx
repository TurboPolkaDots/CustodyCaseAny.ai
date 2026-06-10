export default function CaseSetup({ caseInfo, setCaseInfo, onNext, onBack }) {
  const update = (field, value) => setCaseInfo({ ...caseInfo, [field]: value })

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2">Case Information</h2>
      <p className="text-slate-400 text-sm mb-6">Basic details about your case (stored locally only).</p>

      <div className="space-y-4">
        {/* Case Type Selector */}
        <div>
          <label className="block text-sm text-slate-300 mb-2">What type of case is this?</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update('caseType', 'modification')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                caseInfo.caseType === 'modification'
                  ? 'border-indigo-500 bg-indigo-600/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <p className="text-sm font-medium text-white">Modification / Enforcement</p>
              <p className="text-xs text-slate-400 mt-1">I already have a custody order or settlement</p>
            </button>
            <button
              type="button"
              onClick={() => update('caseType', 'initial')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                caseInfo.caseType === 'initial'
                  ? 'border-indigo-500 bg-indigo-600/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <p className="text-sm font-medium text-white">Initial Custody / Divorce</p>
              <p className="text-xs text-slate-400 mt-1">I'm going through a new divorce or separation</p>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Case Name</label>
          <input
            type="text"
            value={caseInfo.caseName}
            onChange={(e) => update('caseName', e.target.value)}
            placeholder="e.g. Smith v. Smith"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Case Number (optional)</label>
          <input
            type="text"
            value={caseInfo.caseNumber}
            onChange={(e) => update('caseNumber', e.target.value)}
            placeholder="e.g. 2024-DR-1234"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Jurisdiction (optional)</label>
          <input
            type="text"
            value={caseInfo.jurisdiction}
            onChange={(e) => update('jurisdiction', e.target.value)}
            placeholder="e.g. District Court, Denver County"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!caseInfo.caseName.trim() || !caseInfo.caseType}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

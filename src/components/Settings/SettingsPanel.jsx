import { useState, useEffect } from 'react'
import { Settings, Database, Shield, Cpu, Trash2, Download, Key, RotateCcw, AlertTriangle, Cloud, CheckCircle, XCircle, FileText } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useOllama } from '../../hooks/useOllama'

export default function SettingsPanel() {
  const { config } = useAppStore()
  const { connected, models, checkStatus } = useOllama()
  const [storageStats, setStorageStats] = useState(null)
  const [changingPass, setChangingPass] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [aiConfig, setAiConfig] = useState({ provider: 'ollama', apiKey: '', model: '', providers: {} })
  const [aiTestResult, setAiTestResult] = useState(null)
  const [aiSaving, setAiSaving] = useState(false)
  const [caseInfo, setCaseInfo] = useState({ caseName: '', caseNumber: '', jurisdiction: '', userRole: '', caseType: 'modification' })
  const [caseTypeWarning, setCaseTypeWarning] = useState(false)
  const [caseSaved, setCaseSaved] = useState(false)

  useEffect(() => {
    loadStorageStats()
    loadAiConfig()
    loadCaseInfo()
  }, [])

  const loadCaseInfo = async () => {
    try {
      const cfg = await window.api.invoke('config:load')
      if (cfg?.caseInfo) setCaseInfo(cfg.caseInfo)
    } catch {}
  }

  const saveCaseInfo = async () => {
    try {
      const cfg = await window.api.invoke('config:load') || {}
      await window.api.invoke('config:save', { ...cfg, caseInfo })
      setCaseSaved(true)
      setTimeout(() => setCaseSaved(false), 2000)
    } catch {}
  }

  const loadAiConfig = async () => {
    try {
      const cfg = await window.api.invoke('ai:get-config')
      setAiConfig(cfg)
    } catch (error) {
      console.error('Failed to load AI config:', error)
    }
  }

  const saveAiConfig = async (updates) => {
    setAiSaving(true)
    setAiTestResult(null)
    const newConfig = { ...aiConfig, ...updates }
    setAiConfig(newConfig)
    try {
      await window.api.invoke('ai:set-config', {
        provider: newConfig.provider,
        apiKey: newConfig.apiKey,
        model: newConfig.model
      })
    } catch (error) {
      console.error('Failed to save AI config:', error)
    }
    setAiSaving(false)
  }

  const testAiConnection = async () => {
    setAiTestResult(null)
    try {
      const result = await window.api.invoke('ai:test-connection')
      setAiTestResult(result)
    } catch {
      setAiTestResult({ connected: false })
    }
  }

  const loadStorageStats = async () => {
    try {
      const stats = await window.api.invoke('storage:stats')
      setStorageStats(stats)
    } catch (error) {
      console.error('Failed to load storage stats:', error)
    }
  }

  const handleChangePassphrase = async () => {
    setPassMsg('')
    try {
      const result = await window.api.invoke('passphrase:change', { oldPass, newPass })
      if (result.success) {
        setPassMsg('Passphrase changed successfully')
        setChangingPass(false)
        setOldPass('')
        setNewPass('')
      } else {
        setPassMsg(result.error || 'Failed to change passphrase')
      }
    } catch (error) {
      setPassMsg('Failed to change passphrase')
    }
  }

  const handleStartNewCase = async () => {
    if (!confirm('Start a new case? This will permanently delete all documents, timeline events, violations, patterns, and outlines. Your passphrase and settings will be preserved.')) return
    if (!confirm('Are you absolutely sure? This cannot be undone.')) return
    try {
      await window.api.invoke('data:clear-case')
      // Clear case info
      const newCaseInfo = { caseName: '', caseNumber: '', jurisdiction: '', userRole: '', caseType: 'modification' }
      setCaseInfo(newCaseInfo)
      const cfg = await window.api.invoke('config:load') || {}
      await window.api.invoke('config:save', { ...cfg, caseInfo: newCaseInfo })
      // Reset report state
      useAppStore.getState().updateReport({ done: false, stepStatus: {}, progress: '', error: '' })
      setPassMsg('')
      loadStorageStats()
      alert('Case data cleared. Update your case info above and upload documents for the new case.')
    } catch (error) {
      console.error('Clear case failed:', error)
    }
  }

  const handleExport = async () => {
    try {
      await window.api.invoke('data:export')
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete all data? This cannot be undone.')) return
    try {
      await window.api.invoke('data:delete')
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6 max-w-2xl">
        {/* AI Provider */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-white">AI Engine</h3>
          </div>

          {/* Provider selector */}
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">Provider</label>
            <select
              value={aiConfig.provider}
              onChange={(e) => {
                const provider = e.target.value
                setAiTestResult(null)
                saveAiConfig({ provider, apiKey: provider === 'ollama' ? '' : aiConfig.apiKey, model: '' })
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {Object.entries(aiConfig.providers || {}).map(([key, p]) => (
                <option key={key} value={key}>{p.name}{p.local ? ' — Private' : ''}</option>
              ))}
            </select>
          </div>

          {/* Cloud provider warning */}
          {aiConfig.provider !== 'ollama' && (
            <div className="mb-3 p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-300 font-medium">Privacy Warning</p>
                  <p className="text-xs text-amber-400/80 mt-1">
                    Using a cloud AI provider sends your document text to external servers.
                    Your custody documents, communications, and case data will leave your device.
                    This may compromise the confidentiality of sensitive family court information.
                    Only use this option if you understand and accept these risks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API Key (cloud providers) */}
          {aiConfig.provider !== 'ollama' && (
            <div className="mb-3">
              <label className="text-xs text-slate-500 mb-1 block">API Key</label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                onBlur={() => saveAiConfig({ apiKey: aiConfig.apiKey })}
                placeholder={`Enter your ${aiConfig.providers?.[aiConfig.provider]?.name || ''} API key`}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Model selector (cloud providers) */}
          {aiConfig.provider !== 'ollama' && aiConfig.providers?.[aiConfig.provider]?.models && (
            <div className="mb-3">
              <label className="text-xs text-slate-500 mb-1 block">Model</label>
              <select
                value={aiConfig.model || aiConfig.providers[aiConfig.provider].defaultModel}
                onChange={(e) => saveAiConfig({ model: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {aiConfig.providers[aiConfig.provider].models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ollama status (when ollama selected) */}
          {aiConfig.provider === 'ollama' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-slate-400">
                  {connected ? 'Connected' : 'Disconnected'} — localhost:11434
                </span>
                <button onClick={checkStatus} className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto">
                  Refresh
                </button>
              </div>
              {models.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {models.map((m) => (
                    <span key={m.name} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">{m.name}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-green-400/60 mt-2 flex items-center gap-1">
                <Shield className="w-3 h-3" /> All processing stays on your device
              </p>
            </>
          )}

          {/* Test connection button */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={testAiConnection}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            >
              Test Connection
            </button>
            {aiTestResult && (
              <span className={`text-xs flex items-center gap-1 ${aiTestResult.connected ? 'text-green-400' : 'text-red-400'}`}>
                {aiTestResult.connected
                  ? <><CheckCircle className="w-3 h-3" /> Connected</>
                  : <><XCircle className="w-3 h-3" /> Not connected</>
                }
              </span>
            )}
          </div>
        </div>

        {/* Storage */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-white">Storage</h3>
          </div>
          {storageStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-slate-800/50 rounded">
                <p className="text-lg font-medium text-white">{storageStats.documentCount || 0}</p>
                <p className="text-xs text-slate-500">Documents</p>
              </div>
              <div className="text-center p-2 bg-slate-800/50 rounded">
                <p className="text-lg font-medium text-white">{storageStats.dbSize || '0 MB'}</p>
                <p className="text-xs text-slate-500">Database Size</p>
              </div>
            </div>
          )}
          {config?.folderPath && (
            <p className="text-xs text-slate-500 mt-3">Watch folder: {config.folderPath}</p>
          )}
        </div>

        {/* Security */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-white">Security</h3>
          </div>
          {!changingPass ? (
            <button
              onClick={() => setChangingPass(true)}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
            >
              <Key className="w-4 h-4" /> Change Passphrase
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="Current passphrase"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="New passphrase"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassphrase}
                  disabled={!oldPass || newPass.length < 8}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded text-sm transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={() => { setChangingPass(false); setOldPass(''); setNewPass('') }}
                  className="px-4 py-2 bg-slate-800 text-slate-400 rounded text-sm hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
              {passMsg && <p className="text-xs text-slate-400">{passMsg}</p>}
            </div>
          )}
        </div>

        {/* Case Info */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-white">Case Information</h3>
          </div>
          <div className="space-y-3">
            {/* Case Type Selector */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Case Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (caseInfo.caseType !== 'modification') setCaseTypeWarning(true)
                    setCaseInfo({ ...caseInfo, caseType: 'modification' })
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    caseInfo.caseType === 'modification'
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="text-xs font-medium text-white">Modification / Enforcement</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Existing custody order</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (caseInfo.caseType !== 'initial') setCaseTypeWarning(true)
                    setCaseInfo({ ...caseInfo, caseType: 'initial' })
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    caseInfo.caseType === 'initial'
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="text-xs font-medium text-white">Initial Custody / Divorce</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">New divorce or separation</p>
                </button>
              </div>
              {caseTypeWarning && (
                <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Changing case type affects how your documents are analyzed
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Case Name</label>
              <input
                type="text"
                value={caseInfo.caseName}
                onChange={(e) => setCaseInfo({ ...caseInfo, caseName: e.target.value })}
                placeholder="e.g. Smith v. Smith"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Case Number</label>
              <input
                type="text"
                value={caseInfo.caseNumber}
                onChange={(e) => setCaseInfo({ ...caseInfo, caseNumber: e.target.value })}
                placeholder="e.g. 2024-DR-1234"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Jurisdiction</label>
              <input
                type="text"
                value={caseInfo.jurisdiction}
                onChange={(e) => setCaseInfo({ ...caseInfo, jurisdiction: e.target.value })}
                placeholder="e.g. District Court, Denver County"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Your Role</label>
              <select
                value={caseInfo.userRole}
                onChange={(e) => setCaseInfo({ ...caseInfo, userRole: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select your role...</option>
                <option value="Father / Petitioner">Father / Petitioner</option>
                <option value="Father / Respondent">Father / Respondent</option>
                <option value="Mother / Petitioner">Mother / Petitioner</option>
                <option value="Mother / Respondent">Mother / Respondent</option>
                <option value="Grandparent / Guardian">Grandparent / Guardian</option>
                <option value="Other">Other</option>
              </select>
              <p className="text-[10px] text-slate-600 mt-1">This tells the AI whose perspective to write from</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveCaseInfo}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-colors"
              >
                Save
              </button>
              {caseSaved && <span className="text-xs text-green-400">Saved</span>}
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-slate-900 rounded-lg border border-amber-900/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-medium text-amber-300">Legal Disclaimer</h3>
          </div>
          <div className="text-xs text-slate-400 space-y-2">
            <p><strong className="text-slate-300">This software does not provide legal advice.</strong></p>
            <p>CustodyCase.ai is a document organization and analysis tool only. All AI-generated output — including violation detection, pattern analysis, timelines, and outlines — may contain errors, inaccuracies, or hallucinated content.</p>
            <p>You are solely responsible for verifying all facts, dates, and conclusions before use in any legal proceeding. Always consult a licensed attorney for legal guidance.</p>
            <p className="text-slate-600 pt-1">By using this software, you acknowledge and accept these terms. See our full <span className="text-indigo-400 cursor-pointer" onClick={() => window.api.invoke('shell:open-external', 'https://custodycaseai.com/terms.html')}>Terms of Service</span> and <span className="text-indigo-400 cursor-pointer" onClick={() => window.api.invoke('shell:open-external', 'https://custodycaseai.com/privacy.html')}>Privacy Policy</span>.</p>
          </div>
        </div>

        {/* Case Management */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-white">Case Management</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Clear all documents, analysis results, and start fresh with a new case. Your passphrase and settings are preserved.
          </p>
          <button
            onClick={handleStartNewCase}
            className="flex items-center gap-2 px-4 py-2 bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 rounded text-sm transition-colors w-full justify-center"
          >
            <RotateCcw className="w-4 h-4" /> Start New Case
          </button>
        </div>

        {/* Data Management */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-medium text-white">Data Management</h3>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-sm transition-colors"
            >
              <Download className="w-4 h-4" /> Export Data
            </button>
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

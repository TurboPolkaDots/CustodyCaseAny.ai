import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, FileText, Scale, Upload, Play, Loader, CheckCircle,
  Clock, AlertTriangle, Layers, FileOutput, ChevronRight
} from 'lucide-react'
import { useDocuments } from '../../hooks/useDocuments'
import { useAppStore } from '../../stores/appStore'

const STEPS_MODIFICATION = [
  { key: 'judgment', label: 'Parsing Judgment', icon: Scale },
  { key: 'timeline', label: 'Building Timeline', icon: Clock },
  { key: 'violations', label: 'Detecting Violations', icon: AlertTriangle },
  { key: 'patterns', label: 'Grouping Patterns', icon: Layers },
  { key: 'outline', label: 'Generating Outline', icon: FileOutput }
]

const STEPS_INITIAL = [
  { key: 'judgment', label: 'Checking Key Issues', icon: Scale },
  { key: 'timeline', label: 'Building Timeline', icon: Clock },
  { key: 'violations', label: 'Finding Evidence', icon: AlertTriangle },
  { key: 'patterns', label: 'Identifying Themes', icon: Layers },
  { key: 'outline', label: 'Generating Outline', icon: FileOutput }
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { documents, refreshDocuments } = useDocuments()
  const [judgmentDocId, setJudgmentDocId] = useState(null)
  const [aiLocal, setAiLocal] = useState(true)
  const [keyIssueCount, setKeyIssueCount] = useState(0)
  const report = useAppStore((s) => s.report)
  const generateReport = useAppStore((s) => s.generateReport)
  const caseType = useAppStore((s) => s.caseInfo?.caseType || 'modification')
  const isInitial = caseType === 'initial'
  const STEPS = isInitial ? STEPS_INITIAL : STEPS_MODIFICATION

  useEffect(() => {
    refreshDocuments()
    // Check AI provider
    window.api.invoke('ai:get-config').then((cfg) => {
      setAiLocal(cfg?.provider === 'ollama')
    }).catch(() => {})
    // Load key issue count for initial cases
    window.api.invoke('obligations:list').then((obls) => {
      setKeyIssueCount((obls || []).length)
    }).catch(() => {})
    // Check if a report was already generated (survives app restarts)
    const checkExisting = async () => {
      if (!report.done && !report.generating) {
        const outline = await window.api.invoke('outline:get')
        if (outline) {
          useAppStore.getState().updateReport({
            done: true,
            stepStatus: {
              judgment: 'done', timeline: 'done', violations: 'done',
              patterns: 'done', outline: 'done'
            }
          })
        }
      }
    }
    checkExisting()
  }, [])

  const completeDocs = documents.filter((d) => d.processing_status === 'complete')
  const hasDocuments = completeDocs.length > 0

  const handleGenerate = () => {
    if (isInitial) {
      generateReport(null)
    } else {
      if (!judgmentDocId) {
        useAppStore.getState().updateReport({ error: 'Please select your judgment/settlement document' })
        return
      }
      generateReport(judgmentDocId)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-8 h-8 text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">CustodyCase.ai</h1>
      </div>
      <p className="text-slate-400 text-sm mb-8">
        {isInitial
          ? 'Organize your custody documents and generate a case preparation outline.'
          : 'Organize your custody evidence and generate a mediation preparation report.'
        }
      </p>

      {/* Instructions */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-5 mb-6">
        <h2 className="text-sm font-medium text-white mb-3">How it works</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold flex-shrink-0">1</span>
            <div>
              <p className="text-sm text-slate-300">Upload your documents</p>
              <p className="text-xs text-slate-500">
                Go to the <button onClick={() => navigate('/documents')} className="text-indigo-400 hover:text-indigo-300">Documents</button> tab and upload your {isInitial ? 'financial records, communications, parenting logs, and any other relevant documents' : 'judgment/settlement, OFW messages, emails, screenshots, and any other evidence'}.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold flex-shrink-0">2</span>
            <div>
              {isInitial ? (
                <>
                  <p className="text-sm text-slate-300">Define your key issues</p>
                  <p className="text-xs text-slate-500">
                    Go to the <button onClick={() => navigate('/judgment')} className="text-indigo-400 hover:text-indigo-300">Key Issues</button> page and add the issues you want to address in your custody case, or let AI suggest them from your documents.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300">Select your judgment document below</p>
                  <p className="text-xs text-slate-500">Tell us which uploaded document is your custody order / settlement agreement.</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold flex-shrink-0">3</span>
            <div>
              <p className="text-sm text-slate-300">Hit Generate Report</p>
              <p className="text-xs text-slate-500">
                {isInitial
                  ? 'The AI will review your key issues, build a timeline, find supporting evidence, identify themes, and generate a case preparation outline. You can review each step in the sidebar tabs.'
                  : 'The AI will parse your judgment, build a timeline, detect violations, identify patterns, and generate a mediation outline. You can review each step in the sidebar tabs.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Warning */}
      <div className="bg-amber-900/15 border border-amber-800/30 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-200 font-medium">This process takes time</p>
          <p className="text-xs text-amber-300/70 mt-1">
            {aiLocal
              ? 'All AI processing runs locally on your machine for maximum privacy. Depending on the number and size of your documents, generating a full report can take anywhere from 15 minutes to several hours. Do not close the app while processing.'
              : 'Processing time depends on the AI model selected and the number and size of your documents. Cloud models are typically faster than local processing. Do not close the app while processing.'
            }
          </p>
        </div>
      </div>

      {/* Select Judgment Doc (modification) / Key Issues Status (initial) */}
      {isInitial ? (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-5 mb-6">
          <h2 className="text-sm font-medium text-white mb-3">Key Issues Status</h2>
          <div className="flex items-center gap-3">
            <div className="text-center p-3 bg-slate-800/50 rounded-lg flex-1">
              <p className="text-2xl font-bold text-white">{keyIssueCount}</p>
              <p className="text-xs text-slate-500">Key Issues Defined</p>
            </div>
            <div className="text-center p-3 bg-slate-800/50 rounded-lg flex-1">
              <p className="text-2xl font-bold text-white">{completeDocs.length}</p>
              <p className="text-xs text-slate-500">Documents Uploaded</p>
            </div>
          </div>
          {keyIssueCount === 0 && (
            <p className="text-xs text-amber-400 mt-3">
              Add key issues before generating a report.{' '}
              <button onClick={() => navigate('/judgment')} className="text-indigo-400 hover:text-indigo-300 underline">
                Go to Key Issues
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-5 mb-6">
          <h2 className="text-sm font-medium text-white mb-3">
            Select your judgment / settlement document
          </h2>
          {completeDocs.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {completeDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setJudgmentDocId(d.id); useAppStore.getState().updateReport({ error: '' }) }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    judgmentDocId === d.id
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <p className="text-sm text-white truncate">{d.file_name}</p>
                    {judgmentDocId === d.id && (
                      <span className="ml-auto text-xs text-indigo-400">Selected</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Upload className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No documents uploaded yet</p>
              <button
                onClick={() => navigate('/documents')}
                className="text-indigo-400 hover:text-indigo-300 text-sm mt-1"
              >
                Go to Documents to upload
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={report.generating || (isInitial ? keyIssueCount === 0 : (!hasDocuments || !judgmentDocId))}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-3 mb-6"
      >
        {report.generating ? (
          <Loader className="w-5 h-5 animate-spin" />
        ) : (
          <Play className="w-5 h-5" />
        )}
        {report.generating ? 'Generating Report...' : 'Generate Report'}
      </button>

      {report.error && (
        <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-300">{report.error}</p>
        </div>
      )}

      {/* Progress Steps */}
      {(report.generating || report.done) && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-5 mb-6">
          <div className="space-y-3">
            {STEPS.map(({ key, label, icon: Icon }) => {
              const status = report.stepStatus[key]
              return (
                <div key={key} className="flex items-center gap-3">
                  {status === 'done' ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : status === 'running' ? (
                    <Loader className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
                  ) : status === 'error' ? (
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-700 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    status === 'done' ? 'text-green-300' :
                    status === 'running' ? 'text-white' :
                    status === 'error' ? 'text-red-300' :
                    'text-slate-600'
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
          {report.progress && (
            <p className="text-xs text-slate-500 mt-3">{report.progress}</p>
          )}
        </div>
      )}

      {/* Done — Review Links */}
      {report.done && (
        <div className="bg-green-900/10 border border-green-800/30 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-medium text-green-300">Report Complete</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Your {isInitial ? 'case preparation' : 'mediation preparation'} report is ready. Review each section or export directly.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/outline', label: 'View Outline', icon: FileOutput },
              { to: '/timeline', label: 'Review Timeline', icon: Clock },
              { to: '/violations', label: isInitial ? 'Review Evidence' : 'Review Violations', icon: AlertTriangle },
              { to: '/patterns', label: isInitial ? 'Review Themes' : 'Review Patterns', icon: Layers }
            ].map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex items-center gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-sm text-slate-300 transition-colors"
              >
                <Icon className="w-4 h-4 text-indigo-400" />
                {label}
                <ChevronRight className="w-3 h-3 text-slate-600 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, RefreshCw, Cpu, Download, ExternalLink, Loader } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

const REQUIRED_MODEL = 'llama3.2:3b'

export default function OllamaCheck({ onComplete, onBack }) {
  const [checking, setChecking] = useState(true)
  const [pulling, setPulling] = useState(false)
  const [pullProgress, setPullProgress] = useState('')
  const { ollamaState, setOllamaState } = useAppStore()

  const hasRequiredModel = ollamaState.models?.some(
    (m) => m.name === REQUIRED_MODEL || m.name.startsWith('llama3.2')
  )

  const checkOllama = async () => {
    setChecking(true)
    try {
      const result = await window.api.invoke('ollama:status')
      setOllamaState(result)
    } catch {
      setOllamaState({ connected: false, models: [] })
    } finally {
      setChecking(false)
    }
  }

  const openDownloadPage = async () => {
    await window.api.invoke('shell:open-external', 'https://ollama.com/download')
  }

  const pullModel = async () => {
    setPulling(true)
    setPullProgress('Starting download...')
    try {
      const result = await window.api.invoke('ollama:pull', REQUIRED_MODEL)
      if (result.success) {
        setPullProgress('Done!')
        await checkOllama()
      } else {
        setPullProgress(result.error || 'Pull failed')
      }
    } catch {
      setPullProgress('Pull failed — try running: ollama pull llama3.2:3b')
    } finally {
      setPulling(false)
    }
  }

  useEffect(() => {
    checkOllama()
  }, [])

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Cpu className="w-6 h-6 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">AI Engine Check</h2>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        CustodyCase.ai uses Ollama for local AI processing. Make sure it is running.
      </p>

      <div className="bg-slate-800 rounded-lg p-4">
        {/* Connection status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {checking ? (
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            ) : ollamaState.connected ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {checking ? 'Checking...' : ollamaState.connected ? 'Ollama Connected' : 'Ollama Not Found'}
              </p>
              <p className="text-xs text-slate-500">localhost:11434</p>
            </div>
          </div>
          {!checking && (
            <button
              onClick={checkOllama}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Retry
            </button>
          )}
        </div>

        {/* Not connected — show download button */}
        {!checking && !ollamaState.connected && (
          <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
            <p className="text-xs text-slate-400">
              Ollama needs to be installed and running for AI features to work.
            </p>
            <button
              onClick={openDownloadPage}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors w-full justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              Download Ollama
            </button>
            <p className="text-xs text-slate-500 text-center">
              After installing, launch Ollama and click Retry above
            </p>
          </div>
        )}

        {/* Connected — show models */}
        {ollamaState.connected && ollamaState.models.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Available models:</p>
            <div className="flex flex-wrap gap-2">
              {ollamaState.models.map((m) => (
                <span
                  key={m.name}
                  className={`px-2 py-1 rounded text-xs ${
                    m.name === REQUIRED_MODEL || m.name.startsWith('llama3.2')
                      ? 'bg-green-900/50 text-green-300 border border-green-700/50'
                      : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Connected but missing required model — show pull button */}
        {ollamaState.connected && !hasRequiredModel && (
          <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
            <p className="text-xs text-amber-300">
              Required model <code className="text-indigo-400">{REQUIRED_MODEL}</code> not found.
            </p>
            <button
              onClick={pullModel}
              disabled={pulling}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors w-full justify-center"
            >
              {pulling ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {pulling ? 'Pulling model...' : `Pull ${REQUIRED_MODEL}`}
            </button>
            {pullProgress && (
              <p className="text-xs text-slate-400 text-center">{pullProgress}</p>
            )}
          </div>
        )}

        {/* Connected with required model — all good */}
        {ollamaState.connected && hasRequiredModel && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-xs text-green-300">Ready — required model available</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
        >
          {ollamaState.connected ? 'Complete Setup' : 'Continue Without AI'}
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { MessageSquare, Loader, BarChart3 } from 'lucide-react'

export default function CommunicationDashboard() {
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      const result = await window.api.invoke('comms:results')
      if (result) setAnalysis(result)
    } catch (error) {
      console.error('Failed to load communication results:', error)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    setProgress({ stage: 'Starting...', percent: 0 })
    try {
      const unsub = window.api.on('comms:progress', (data) => setProgress(data))
      const result = await window.api.invoke('comms:analyze')
      unsub()
      if (result) setAnalysis(result)
    } catch (error) {
      console.error('Communication analysis failed:', error)
    } finally {
      setAnalyzing(false)
      setProgress(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Communications</h1>
          <p className="text-slate-400 text-sm mt-1">Analyze tone, response times, and deflection patterns</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {analyzing ? <Loader className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
          {analyzing ? 'Analyzing...' : 'Analyze Communications'}
        </button>
      </div>

      {analyzing && progress && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-6">
          <p className="text-sm text-slate-300 mb-2">{progress.stage}</p>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress.percent || 0}%` }} />
          </div>
        </div>
      )}

      {!analysis && !analyzing ? (
        <div className="text-center py-16">
          <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No communication analysis yet</p>
          <p className="text-slate-600 text-xs mt-1">Upload OFW messages or emails, then analyze</p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {analysis.toneAnalysis && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
              <h3 className="text-sm font-medium text-white mb-3">Tone Analysis</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(analysis.toneAnalysis).map(([tone, count]) => (
                  <div key={tone} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <span className="text-sm text-slate-300 capitalize">{tone}</span>
                    <span className="text-sm text-indigo-400 font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis.responsePatterns && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
              <h3 className="text-sm font-medium text-white mb-3">Response Patterns</h3>
              <div className="text-sm text-slate-400 whitespace-pre-wrap">{analysis.responsePatterns}</div>
            </div>
          )}

          {analysis.deflectionPatterns && analysis.deflectionPatterns.length > 0 && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
              <h3 className="text-sm font-medium text-white mb-3">Deflection Patterns</h3>
              <div className="space-y-2">
                {analysis.deflectionPatterns.map((p, i) => (
                  <div key={i} className="text-sm text-slate-400 p-2 bg-slate-800/50 rounded">{p}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Layers, Loader, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import { usePatterns } from '../../hooks/usePatterns'
import { useAppStore } from '../../stores/appStore'

function PatternDetail({ pattern }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <div>
            <p className="text-sm font-medium text-white">{pattern.pattern_name}</p>
            <p className="text-xs text-slate-500">{pattern.pattern_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-indigo-400">{pattern.frequency}x</p>
            <p className="text-xs text-slate-500">occurrences</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs ${
            pattern.evidence_strength === 'strong'
              ? 'bg-green-900/50 text-green-300'
              : pattern.evidence_strength === 'moderate'
              ? 'bg-yellow-900/50 text-yellow-300'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {pattern.evidence_strength}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3">
          <p className="text-sm text-slate-300 mb-3">{pattern.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>First: {pattern.first_occurrence}</span>
            <span>Last: {pattern.last_occurrence}</span>
          </div>
          {pattern.violations && pattern.violations.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-slate-500">Related violations:</p>
              {pattern.violations.map((v, i) => (
                <div key={i} className="text-xs text-slate-400 p-2 bg-slate-800/50 rounded">
                  {v.description} — {v.event_date}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PatternGroups() {
  const { patterns, grouping, progress, groupPatterns, loadPatterns } = usePatterns()
  const caseType = useAppStore((s) => s.caseInfo?.caseType || 'modification')
  const isInitial = caseType === 'initial'

  useEffect(() => {
    loadPatterns()
  }, [loadPatterns])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{isInitial ? 'Key Themes' : 'Patterns'}</h1>
          <p className="text-slate-400 text-sm mt-1">{isInitial ? 'Key themes identified from your supporting evidence' : 'Recurring violation patterns identified across your evidence'}</p>
        </div>
        <button
          onClick={groupPatterns}
          disabled={grouping}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {grouping ? <Loader className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
          {grouping ? (isInitial ? 'Identifying...' : 'Grouping...') : (isInitial ? 'Identify Themes' : 'Group Patterns')}
        </button>
      </div>

      {grouping && progress && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-6">
          <p className="text-sm text-slate-300 mb-2">{progress.stage}</p>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress.percent || 0}%` }} />
          </div>
        </div>
      )}

      {patterns.length === 0 && !grouping ? (
        <div className="text-center py-16">
          <Layers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{isInitial ? 'No themes identified yet' : 'No patterns identified yet'}</p>
          <p className="text-slate-600 text-xs mt-1">{isInitial ? 'Find supporting evidence first, then identify themes' : 'Detect violations first, then group them into patterns'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patterns.map((p) => (
            <PatternDetail key={p.id} pattern={p} />
          ))}
        </div>
      )}
    </div>
  )
}

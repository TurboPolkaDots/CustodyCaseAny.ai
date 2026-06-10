import { useState, useEffect } from 'react'
import { AlertTriangle, Loader, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { useViolations } from '../../hooks/useViolations'
import { useAppStore } from '../../stores/appStore'
import { CONFIDENCE_LEVELS } from '../../utils/constants'

function ViolationCard({ violation, onUpdate }) {
  const confidence = CONFIDENCE_LEVELS[violation.confidence?.toUpperCase()] || CONFIDENCE_LEVELS.MEDIUM

  return (
    <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className={`text-xs font-medium ${confidence.color}`}>{confidence.label} Confidence</span>
            <span className="text-xs text-slate-500">{violation.event_date}</span>
          </div>
          <p className="text-sm text-white mb-2">{violation.description}</p>
          {violation.evidence_summary && (
            <p className="text-xs text-slate-400 mb-2">{violation.evidence_summary}</p>
          )}
          <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-400">
            {violation.category}
          </span>
        </div>
        <button
          onClick={() => onUpdate(violation.id, { included_in_outline: !violation.included_in_outline })}
          className="text-slate-500 hover:text-indigo-400 flex-shrink-0"
          title={violation.included_in_outline ? 'Remove from outline' : 'Add to outline'}
        >
          {violation.included_in_outline ? (
            <ToggleRight className="w-6 h-6 text-indigo-400" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  )
}

export default function ViolationsDashboard() {
  const { violations, detecting, progress, detectViolations, loadViolations, updateViolation } = useViolations()
  const caseType = useAppStore((s) => s.caseInfo?.caseType || 'modification')
  const isInitial = caseType === 'initial'

  useEffect(() => {
    loadViolations()
  }, [loadViolations])

  const stats = {
    total: violations.length,
    high: violations.filter((v) => v.confidence === 'high').length,
    inOutline: violations.filter((v) => v.included_in_outline).length
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{isInitial ? 'Supporting Evidence' : 'Violations'}</h1>
          <p className="text-slate-400 text-sm mt-1">{isInitial ? 'Evidence supporting your key issues from documents' : 'Settlement violations detected from your documents'}</p>
        </div>
        <button
          onClick={detectViolations}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {detecting ? <Loader className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {detecting ? (isInitial ? 'Finding...' : 'Detecting...') : (isInitial ? 'Find Evidence' : 'Detect Violations')}
        </button>
      </div>

      {detecting && progress && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-6">
          <p className="text-sm text-slate-300 mb-2">{progress.stage}</p>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress.percent || 0}%` }} />
          </div>
        </div>
      )}

      {violations.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-slate-500">{isInitial ? 'Total Evidence' : 'Total Violations'}</p>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.high}</p>
            <p className="text-xs text-slate-500">High Confidence</p>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-400">{stats.inOutline}</p>
            <p className="text-xs text-slate-500">In Outline</p>
          </div>
        </div>
      )}

      {violations.length === 0 && !detecting ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{isInitial ? 'No supporting evidence found yet' : 'No violations detected yet'}</p>
          <p className="text-slate-600 text-xs mt-1">{isInitial ? 'Define key issues and upload documents first' : 'Parse your judgment and upload evidence first'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {violations.map((v) => (
            <ViolationCard key={v.id} violation={v} onUpdate={updateViolation} />
          ))}
        </div>
      )}
    </div>
  )
}

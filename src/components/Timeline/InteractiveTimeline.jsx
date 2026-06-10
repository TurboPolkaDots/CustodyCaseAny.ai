import { useState, useEffect } from 'react'
import { Clock, Loader, Filter, FileText } from 'lucide-react'
import { useTimeline } from '../../hooks/useTimeline'
import { CATEGORY_COLORS } from '../../utils/constants'

function TimelineEvent({ event }) {
  const colors = CATEGORY_COLORS[event.category] || CATEGORY_COLORS.OTHER

  return (
    <div className="flex gap-4 pb-6 relative">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colors.bg} border-2 ${colors.border} z-10`} />
        <div className="w-px flex-1 bg-slate-800" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">{event.event_date}</span>
          <span className={`px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text}`}>
            {event.category}
          </span>
          {event.confidence && (
            <span className="text-xs text-slate-600">({event.confidence})</span>
          )}
        </div>
        <p className="text-sm text-slate-300">{event.event_text}</p>
        {event.people_involved && (
          <p className="text-xs text-slate-500 mt-1">
            Involves: {Array.isArray(event.people_involved) ? event.people_involved.join(', ') : event.people_involved}
          </p>
        )}
        {event.document_id && (
          <button className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1">
            <FileText className="w-3 h-3" /> View source
          </button>
        )}
      </div>
    </div>
  )
}

function TimelineFilters({ filters, setFilters, allEvents }) {
  const categories = [...new Set(allEvents.map((e) => e.category).filter(Boolean))]
  const people = [...new Set(allEvents.flatMap((e) =>
    Array.isArray(e.people_involved) ? e.people_involved : e.people_involved ? [e.people_involved] : []
  ))]

  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <Filter className="w-4 h-4 text-slate-500" />
      <select
        value={filters.category || ''}
        onChange={(e) => setFilters({ ...filters, category: e.target.value || null })}
        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={filters.person || ''}
        onChange={(e) => setFilters({ ...filters, person: e.target.value || null })}
        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
      >
        <option value="">All People</option>
        {people.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      {(filters.category || filters.person) && (
        <button
          onClick={() => setFilters({ category: null, person: null, dateRange: null })}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

export default function InteractiveTimeline() {
  const { events, allEvents, building, progress, buildTimeline, loadEvents, filters, setFilters } = useTimeline()

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Timeline</h1>
          <p className="text-slate-400 text-sm mt-1">Chronological view of events from your documents</p>
        </div>
        <button
          onClick={buildTimeline}
          disabled={building}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {building ? <Loader className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {building ? 'Building...' : 'Build Timeline'}
        </button>
      </div>

      {building && progress && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-6">
          <p className="text-sm text-slate-300 mb-2">{progress.stage}</p>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress.percent || 0}%` }} />
          </div>
        </div>
      )}

      {allEvents.length > 0 && <TimelineFilters filters={filters} setFilters={setFilters} allEvents={allEvents} />}

      {events.length === 0 && !building ? (
        <div className="text-center py-16">
          <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No timeline events yet</p>
          <p className="text-slate-600 text-xs mt-1">Upload documents, then click "Build Timeline"</p>
        </div>
      ) : (
        <div className="ml-4">
          {events.map((event, i) => (
            <TimelineEvent key={event.id || i} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

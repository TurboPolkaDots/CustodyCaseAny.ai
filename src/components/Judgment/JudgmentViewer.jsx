import { useState, useEffect } from 'react'
import { Scale, Upload, Loader, ChevronDown, ChevronRight, Edit3, Check, Plus, Trash2, Sparkles } from 'lucide-react'
import { useJudgment } from '../../hooks/useJudgment'
import { useDocuments } from '../../hooks/useDocuments'
import { useAppStore } from '../../stores/appStore'
import { OBLIGATION_CATEGORIES } from '../../utils/constants'

function ObligationCard({ obligation, onUpdate, onDelete, showDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(obligation.obligation_text)

  const save = () => {
    onUpdate(obligation.id, { obligation_text: text })
    setEditing(false)
  }

  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              rows={3}
            />
            <button onClick={save} className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              <Check className="w-3 h-3" /> Save
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-300 flex-1">{obligation.obligation_text}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300">
                <Edit3 className="w-3 h-3" />
              </button>
              {showDelete && onDelete && (
                <button onClick={() => onDelete(obligation.id)} className="text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-slate-500">{obligation.responsible_party}</span>
        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">{obligation.category}</span>
      </div>
    </div>
  )
}

function SectionCard({ sectionLetter, obligations, onUpdate, onDelete, showDelete, isInitial }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-white font-medium text-sm mb-2 hover:text-indigo-300"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {isInitial ? sectionLetter : `Section ${sectionLetter}`}
        <span className="text-xs text-slate-500">({obligations.length} {isInitial ? 'issues' : 'obligations'})</span>
      </button>
      {expanded && (
        <div className="space-y-2 ml-6">
          {obligations.map((o) => (
            <ObligationCard key={o.id} obligation={o} onUpdate={onUpdate} onDelete={onDelete} showDelete={showDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

function KeyIssueForm({ onAdd }) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState('Other')
  const [party, setParty] = useState('Both')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!text.trim() || adding) return
    setAdding(true)
    try {
      await onAdd({ text: text.trim(), category, responsible_party: party })
      setText('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-4">
      <h3 className="text-sm font-medium text-white mb-3">Add Key Issue</h3>
      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe the key issue (e.g., 'Father has been primary caregiver since separation')"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          rows={2}
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {OBLIGATION_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Child's Best Interests">Child's Best Interests</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Responsible Party</label>
            <select
              value={party}
              onChange={(e) => setParty(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Both">Both</option>
              <option value="Child">Child</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!text.trim() || adding}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {adding ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {adding ? 'Adding...' : 'Add Issue'}
        </button>
      </div>
    </div>
  )
}

export default function JudgmentViewer() {
  const { obligations, parsing, progress, parseJudgment, loadObligations, updateObligation } = useJudgment()
  const { documents, refreshDocuments } = useDocuments()
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const [showOtherDocs, setShowOtherDocs] = useState(false)
  const caseType = useAppStore((s) => s.caseInfo?.caseType || 'modification')
  const isInitial = caseType === 'initial'

  useEffect(() => {
    loadObligations()
    refreshDocuments()
  }, [loadObligations, refreshDocuments])

  const addIssue = async (issue) => {
    try {
      await window.api.invoke('obligations:insert', issue)
      loadObligations()
    } catch (error) {
      console.error('Failed to add issue:', error)
    }
  }

  const deleteIssue = async (id) => {
    try {
      await window.api.invoke('obligations:delete', id)
      loadObligations()
    } catch (error) {
      console.error('Failed to delete issue:', error)
    }
  }

  const suggestIssues = async () => {
    setSuggesting(true)
    try {
      const result = await window.api.invoke('issues:suggest')
      if (result?.issues?.length > 0) {
        for (const issue of result.issues) {
          await window.api.invoke('obligations:insert', issue)
        }
        loadObligations()
      }
    } catch (error) {
      console.error('Failed to suggest issues:', error)
    } finally {
      setSuggesting(false)
    }
  }

  // Initial case mode — Key Issues editor
  if (isInitial) {
    const grouped = obligations.reduce((acc, o) => {
      const key = o.category || 'Other'
      if (!acc[key]) acc[key] = []
      acc[key].push(o)
      return acc
    }, {})

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Key Issues</h1>
            <p className="text-slate-400 text-sm mt-1">Define the key issues for your initial custody case</p>
          </div>
          <button
            onClick={suggestIssues}
            disabled={suggesting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-slate-300 rounded-lg text-sm font-medium transition-colors"
          >
            {suggesting ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {suggesting ? 'Analyzing...' : 'Suggest Issues from Documents'}
          </button>
        </div>

        <KeyIssueForm onAdd={addIssue} />

        {obligations.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm text-slate-400">{obligations.length} key issues defined</p>
            </div>
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, obls]) => (
                <SectionCard
                  key={category}
                  sectionLetter={category}
                  obligations={obls}
                  onUpdate={updateObligation}
                  onDelete={deleteIssue}
                  showDelete={true}
                  isInitial={true}
                />
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Scale className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No key issues defined yet</p>
            <p className="text-slate-600 text-xs mt-1">Add issues manually above or let AI suggest them from your documents</p>
          </div>
        )}
      </div>
    )
  }

  // Modification case mode — original judgment parser
  const completeDocs = documents.filter((d) => d.processing_status === 'complete')
  const courtFilings = completeDocs.filter(
    (d) => ['COURT_FILING', 'PARENTING_PLAN', 'LEGAL_CORRESPONDENCE'].includes(d.classification) ||
           d.file_name.toLowerCase().match(/judgment|order|settlement|decree|custody|parenting/)
  )
  const otherDocs = completeDocs.filter((d) => !courtFilings.includes(d))

  const grouped = obligations.reduce((acc, o) => {
    const key = o.section_letter || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Judgment / Settlement</h1>
          <p className="text-slate-400 text-sm mt-1">Parse your custody order into structured obligations</p>
        </div>
      </div>

      {obligations.length === 0 && !parsing && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <p className="text-slate-400 text-sm mb-4">
            Select a court filing to parse into obligations:
          </p>
          {completeDocs.length > 0 ? (
            <div className="space-y-2">
              {courtFilings.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDocId(d.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedDocId === d.id
                      ? 'border-indigo-500 bg-indigo-600/10'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="text-sm text-white">{d.file_name}</p>
                  {d.classification && (
                    <p className="text-xs text-slate-500 mt-0.5">{d.classification}</p>
                  )}
                </button>
              ))}
              {courtFilings.length === 0 && (
                <p className="text-xs text-slate-500">No court filings detected — check other documents below</p>
              )}
              {otherDocs.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowOtherDocs(!showOtherDocs)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {showOtherDocs ? 'Hide' : 'Show'} other documents ({otherDocs.length})
                  </button>
                  {showOtherDocs && (
                    <div className="space-y-2 mt-2">
                      {otherDocs.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDocId(d.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedDocId === d.id
                              ? 'border-indigo-500 bg-indigo-600/10'
                              : 'border-slate-700/50 hover:border-slate-600'
                          }`}
                        >
                          <p className="text-sm text-slate-300">{d.file_name}</p>
                          {d.classification && (
                            <p className="text-xs text-slate-600 mt-0.5">{d.classification}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => selectedDocId && parseJudgment(selectedDocId)}
                disabled={!selectedDocId}
                className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Parse Judgment
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Upload your judgment/settlement document first</p>
            </div>
          )}
        </div>
      )}

      {parsing && progress && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader className="w-5 h-5 text-indigo-400 animate-spin" />
            <p className="text-sm text-white">{progress.stage}</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${progress.percent || 0}%` }}
            />
          </div>
        </div>
      )}

      {obligations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <p className="text-sm text-slate-400">{obligations.length} obligations found</p>
          </div>
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, obls]) => (
              <SectionCard
                key={letter}
                sectionLetter={letter}
                obligations={obls}
                onUpdate={updateObligation}
                showDelete={false}
                isInitial={false}
              />
            ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { FileOutput, Loader, Download, Edit3, Check, Eye } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export default function OutlineEditor() {
  const caseType = useAppStore((s) => s.caseInfo?.caseType || 'modification')
  const isInitial = caseType === 'initial'
  const [outline, setOutline] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(null)
  const [editingSection, setEditingSection] = useState(null)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    loadOutline()
  }, [])

  const loadOutline = async () => {
    try {
      const result = await window.api.invoke('outline:get')
      if (result) setOutline(result)
    } catch (error) {
      console.error('Failed to load outline:', error)
    }
  }

  const generateOutline = async () => {
    setGenerating(true)
    setProgress({ stage: 'Starting...', percent: 0 })
    try {
      const unsub = window.api.on('outline:progress', (data) => setProgress(data))
      const result = await window.api.invoke('outline:generate')
      unsub()
      if (result) setOutline(result)
    } catch (error) {
      console.error('Outline generation failed:', error)
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  const exportOutline = async () => {
    try {
      await window.api.invoke('outline:export')
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const updateSection = async (index, newContent) => {
    if (!outline) return
    const updated = { ...outline }
    updated.sections = [...outline.sections]
    updated.sections[index] = { ...updated.sections[index], content: newContent }
    setOutline(updated)
    setEditingSection(null)
    try {
      await window.api.invoke('outline:update', updated)
    } catch (error) {
      console.error('Failed to save outline:', error)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Outline</h1>
          <p className="text-slate-400 text-sm mt-1">{isInitial ? 'Initial custody case outline with supporting evidence' : 'Mediation preparation outline with evidence citations'}</p>
        </div>
        <div className="flex items-center gap-2">
          {outline && (
            <>
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={exportOutline}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Export .docx
              </button>
            </>
          )}
          <button
            onClick={generateOutline}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {generating ? <Loader className="w-4 h-4 animate-spin" /> : <FileOutput className="w-4 h-4" />}
            {generating ? 'Generating...' : outline ? 'Regenerate' : 'Generate Outline'}
          </button>
        </div>
      </div>

      {generating && progress && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-6">
          <p className="text-sm text-slate-300 mb-2">{progress.stage}</p>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress.percent || 0}%` }} />
          </div>
        </div>
      )}

      {!outline && !generating ? (
        <div className="text-center py-16">
          <FileOutput className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No outline generated yet</p>
          <p className="text-slate-600 text-xs mt-1">{isInitial ? 'Define key issues and find evidence first, then generate your outline' : 'Detect violations and patterns first, then generate your outline'}</p>
        </div>
      ) : outline ? (
        <div className="space-y-4">
          {outline.disclaimer && (
            <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-4">
              <p className="text-xs text-amber-300">{outline.disclaimer}</p>
            </div>
          )}
          {outline.sections?.map((section, i) => (
            <div key={i} className="bg-slate-900 rounded-lg border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">{section.title}</h3>
                {!previewMode && (
                  <button
                    onClick={() => setEditingSection(editingSection === i ? null : i)}
                    className="text-slate-500 hover:text-indigo-400"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {editingSection === i ? (
                <div>
                  <textarea
                    defaultValue={section.content}
                    rows={8}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                    id={`section-${i}`}
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById(`section-${i}`)
                      updateSection(i, el.value)
                    }}
                    className="mt-2 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-400 whitespace-pre-wrap">{section.content}</div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

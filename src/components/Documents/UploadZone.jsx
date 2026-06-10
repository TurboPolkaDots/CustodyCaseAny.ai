import { useState, useCallback } from 'react'
import { Upload, FileText } from 'lucide-react'

export default function UploadZone({ onFiles }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files).map((f) => ({
        name: f.name,
        path: f.path,
        size: f.size,
        type: f.type
      }))
      if (files.length > 0) onFiles(files)
    },
    [onFiles]
  )

  const handleBrowse = async () => {
    const files = await window.api.invoke('folder:select-files')
    if (files) onFiles(files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragging
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-400 text-sm mb-1">
        Drag and drop files here, or{' '}
        <button onClick={handleBrowse} className="text-indigo-400 hover:text-indigo-300 underline">
          browse
        </button>
      </p>
      <p className="text-slate-600 text-xs">
        PDF, DOCX, images (JPG, PNG, TIFF), CSV, TXT supported
      </p>
    </div>
  )
}

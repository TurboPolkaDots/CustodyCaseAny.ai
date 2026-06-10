import { FileText, Loader, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { CATEGORY_COLORS, CLASSIFICATION_TYPES, PROCESSING_STATUS } from '../../utils/constants'

function StatusBadge({ status }) {
  if (status === PROCESSING_STATUS.COMPLETE) {
    return <CheckCircle className="w-4 h-4 text-green-400" />
  }
  if (status === PROCESSING_STATUS.ERROR) {
    return <AlertCircle className="w-4 h-4 text-red-400" />
  }
  return <Loader className="w-4 h-4 text-indigo-400 animate-spin" />
}

function ClassificationBadge({ classification }) {
  if (!classification) return null
  const colors = CATEGORY_COLORS[classification] || CATEGORY_COLORS.OTHER
  const label = CLASSIFICATION_TYPES[classification] || classification

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text} border ${colors.border}`}>
      {label}
    </span>
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export default function FileList({ documents, loading, selectedId, onSelect, onDelete }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    )
  }

  const handleDelete = async (e, doc) => {
    e.stopPropagation()
    if (onDelete) onDelete(doc.id)
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => onSelect(doc)}
          className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer group ${
            selectedId === doc.id
              ? 'bg-indigo-600/10 border-indigo-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{doc.file_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{formatSize(doc.file_size)}</span>
                <span className="text-xs text-slate-600">&#183;</span>
                <span className="text-xs text-slate-500 uppercase">{doc.file_type}</span>
                <ClassificationBadge classification={doc.classification} />
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(e, doc)}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <StatusBadge status={doc.processing_status} />
          </div>
        </div>
      ))}
    </div>
  )
}

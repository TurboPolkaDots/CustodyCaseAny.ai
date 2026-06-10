import { FileText, Tag, Calendar, Users } from 'lucide-react'
import { CLASSIFICATION_TYPES, CATEGORY_COLORS } from '../../utils/constants'

export default function DocumentViewer({ document }) {
  const metadata = document.metadata_json ? JSON.parse(document.metadata_json) : null

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-sm font-medium text-white truncate">{document.file_name}</h3>
        {document.classification && (
          <span
            className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
              CATEGORY_COLORS[document.classification]?.bg
            } ${CATEGORY_COLORS[document.classification]?.text}`}
          >
            {CLASSIFICATION_TYPES[document.classification]}
          </span>
        )}
      </div>

      {metadata && (
        <div className="p-4 border-b border-slate-800 space-y-2">
          {metadata.dates && metadata.dates.length > 0 && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
              <div className="text-xs text-slate-400">
                {metadata.dates.join(', ')}
              </div>
            </div>
          )}
          {metadata.people && metadata.people.length > 0 && (
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-slate-500 mt-0.5" />
              <div className="text-xs text-slate-400">
                {metadata.people.join(', ')}
              </div>
            </div>
          )}
          {metadata.topics && metadata.topics.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-slate-500 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {metadata.topics.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 max-h-96 overflow-y-auto">
        {document.summary && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-1">Summary</p>
            <p className="text-sm text-slate-300">{document.summary}</p>
          </div>
        )}
        <p className="text-xs text-slate-500 mb-1">Extracted Text</p>
        <pre className="text-sm text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
          {document.extracted_text || 'No text extracted yet.'}
        </pre>
      </div>
    </div>
  )
}

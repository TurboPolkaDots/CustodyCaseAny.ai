import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, Clock, Loader, ArrowRight, CheckCircle } from 'lucide-react'
import UploadZone from './UploadZone'
import FileList from './FileList'
import DocumentViewer from './DocumentViewer'
import { useDocuments } from '../../hooks/useDocuments'

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { documents, loading, ingestFiles, refreshDocuments, queue } = useDocuments()
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    refreshDocuments()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-slate-400 text-sm mt-1">Upload and manage your custody documents</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          disabled={queue.processing}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload
        </button>
      </div>

      {/* Time warning */}
      {showUpload && (
        <div className="bg-amber-900/15 border border-amber-800/30 rounded-lg p-3 mb-4 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/70">
            Each document is processed one at a time through AI extraction and classification. Large files or scanned documents take longer. For best results, upload a few files at a time and let them finish before adding more.
          </p>
        </div>
      )}

      {showUpload && (
        <UploadZone
          onFiles={(files) => {
            ingestFiles(files)
            setShowUpload(false)
          }}
        />
      )}

      {/* Queue progress indicator */}
      {queue.processing && (
        <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Loader className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
            <p className="text-sm text-indigo-300 font-medium">
              Processing document {queue.completed + 1} of {queue.total}
            </p>
          </div>
          <p className="text-xs text-slate-400 truncate ml-7">
            {queue.current}
          </p>
          <div className="ml-7 mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(((queue.completed + 0.5) / queue.total) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 ml-7 mt-1">
            Do not close the app while processing
          </p>
        </div>
      )}

      {documents.length === 0 && !showUpload ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-slate-500 mb-2">No documents yet</p>
          <button
            onClick={() => setShowUpload(true)}
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FileList
            documents={documents}
            loading={loading}
            selectedId={selectedDoc?.id}
            onSelect={setSelectedDoc}
            onDelete={async (id) => {
              await window.api.invoke('documents:delete', id)
              if (selectedDoc?.id === id) setSelectedDoc(null)
              refreshDocuments()
            }}
          />
          {selectedDoc && <DocumentViewer document={selectedDoc} />}
        </div>
      )}

      {/* Next step prompt */}
      {documents.length > 0 && !queue.processing && (
        <div className="mt-6 bg-indigo-900/15 border border-indigo-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-sm text-indigo-200 font-medium">
                  {documents.filter((d) => d.processing_status === 'complete').length} document{documents.filter((d) => d.processing_status === 'complete').length !== 1 ? 's' : ''} ready
                </p>
                <p className="text-xs text-slate-400">Next: select your judgment and generate a report</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

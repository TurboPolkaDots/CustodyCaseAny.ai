import { Folder } from 'lucide-react'

export default function FolderSetup({ folderPath, setFolderPath, onNext, onBack }) {
  const selectFolder = async () => {
    const path = await window.api.invoke('folder:select')
    if (path) setFolderPath(path)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Folder className="w-6 h-6 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Document Folder</h2>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        Choose a folder where your custody documents are stored. New files added here will be
        automatically detected.
      </p>

      <button
        onClick={selectFolder}
        className="w-full py-8 border-2 border-dashed border-slate-700 rounded-xl hover:border-indigo-500 transition-colors flex flex-col items-center gap-2"
      >
        <Folder className="w-8 h-8 text-slate-500" />
        <span className="text-sm text-slate-400">
          {folderPath || 'Click to select folder'}
        </span>
      </button>

      {folderPath && (
        <div className="mt-3 px-3 py-2 bg-slate-800 rounded-lg">
          <p className="text-xs text-slate-500">Selected:</p>
          <p className="text-sm text-slate-300 truncate">{folderPath}</p>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!folderPath}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

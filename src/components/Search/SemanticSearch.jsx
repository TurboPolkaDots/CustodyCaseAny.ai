import { useState } from 'react'
import { Search, Loader, FileText } from 'lucide-react'

export default function SemanticSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [indexed, setIndexed] = useState(false)
  const [indexing, setIndexing] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await window.api.invoke('search:semantic', query)
      setResults(res || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const buildIndex = async () => {
    setIndexing(true)
    try {
      const unsub = window.api.on('search:progress', () => {})
      await window.api.invoke('search:index')
      unsub()
      setIndexed(true)
    } catch (error) {
      console.error('Indexing failed:', error)
    } finally {
      setIndexing(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Search</h1>
        <p className="text-slate-400 text-sm mt-1">Semantic search across all your documents</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for themes, events, or concepts..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            {searching ? <Loader className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {!indexed && (
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-6">
          <p className="text-sm text-slate-400 mb-2">
            Build a search index to enable semantic search across your documents.
          </p>
          <button
            onClick={buildIndex}
            disabled={indexing}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            {indexing ? 'Building index...' : 'Build Search Index'}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={i} className="bg-slate-900 rounded-lg border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-white">{r.file_name}</span>
                <span className="text-xs text-slate-500">Score: {(r.score * 100).toFixed(0)}%</span>
              </div>
              <p className="text-sm text-slate-400">{r.chunk_text}</p>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !searching && query && (
        <p className="text-center text-slate-500 text-sm py-8">No results found</p>
      )}
    </div>
  )
}

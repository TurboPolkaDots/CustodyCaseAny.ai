import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  FileText,
  Clock,
  AlertTriangle,
  Layers,
  FileOutput,
  Search,
  Settings,
  Shield,
  Home,
  Play,
  Upload,
  Scale
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'

export default function Sidebar() {
  const navigate = useNavigate()
  const { ollamaState, setOllamaState, activeJobs } = useAppStore()
  const caseType = useAppStore((s) => s.caseInfo?.caseType || 'modification')
  const isInitial = caseType === 'initial'

  const sections = [
    {
      items: [
        { to: '/', label: 'Dashboard', icon: Home }
      ]
    },
    {
      label: 'Evidence',
      items: [
        { to: '/documents', label: 'Documents', icon: Upload },
        { to: '/search', label: 'Search', icon: Search }
      ]
    },
    {
      label: 'Analysis',
      items: [
        { to: '/judgment', label: isInitial ? 'Key Issues' : 'Judgment', icon: Scale },
        { to: '/timeline', label: 'Timeline', icon: Clock },
        { to: '/violations', label: isInitial ? 'Evidence' : 'Violations', icon: AlertTriangle },
        { to: '/patterns', label: isInitial ? 'Themes' : 'Patterns', icon: Layers }
      ]
    },
    {
      label: 'Report',
      items: [
        { to: '/outline', label: 'Outline', icon: FileOutput }
      ]
    }
  ]
  const report = useAppStore((s) => s.report)

  useEffect(() => {
    const check = async () => {
      try {
        const result = await window.api.invoke('ollama:status')
        setOllamaState(result)
      } catch {}
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [setOllamaState])

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      <div className="drag-region p-4 pb-2">
        <div className="no-drag flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-indigo-400" />
          <h1 className="text-lg font-bold text-white">CustodyCase.ai</h1>
        </div>
        <p className="text-xs text-slate-500 ml-8">Local Document Analyzer</p>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-4' : ''}>
            {section.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => {
                const locked = report.generating && to !== '/'
                return (
                  <NavLink
                    key={to}
                    to={locked ? '#' : to}
                    end={to === '/'}
                    onClick={(e) => {
                      if (locked) e.preventDefault()
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        locked
                          ? 'text-slate-600 cursor-not-allowed border border-transparent'
                          : isActive
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                    {locked && <span className="ml-auto text-[10px] text-slate-700">locked</span>}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Generate Report button */}
      <div className="px-3 pb-2">
        <button
          onClick={() => navigate('/')}
          disabled={report.generating}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            report.generating
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 cursor-default'
              : report.done
                ? 'bg-green-600/20 text-green-300 border border-green-500/30 hover:bg-green-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          }`}
        >
          {report.generating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full animate-spin" />
              Generating...
            </>
          ) : report.done ? (
            <>
              <FileOutput className="w-4 h-4" />
              Report Ready
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Settings */}
      <div className="px-3 pb-2">
        <NavLink
          to={report.generating ? '#' : '/settings'}
          onClick={(e) => { if (report.generating) e.preventDefault() }}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              report.generating
                ? 'text-slate-600 cursor-not-allowed border border-transparent'
                : isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
            }`
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </NavLink>
      </div>

      {/* Status bar */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              ollamaState.connected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-slate-500">
            AI: {ollamaState.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {activeJobs.length > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} running...
          </div>
        )}
      </div>
    </aside>
  )
}

import { useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './stores/appStore'
import Sidebar from './components/Layout/Sidebar'
import MainContent from './components/Layout/MainContent'
import OnboardingWizard from './components/Onboarding/OnboardingWizard'
import LockScreen from './components/Lock/LockScreen'
import DocumentsPage from './components/Documents/DocumentsPage'
import JudgmentViewer from './components/Judgment/JudgmentViewer'
import InteractiveTimeline from './components/Timeline/InteractiveTimeline'
import ViolationsDashboard from './components/Violations/ViolationsDashboard'
import PatternGroups from './components/Patterns/PatternGroups'
import OutlineEditor from './components/Outline/OutlineEditor'
import SemanticSearch from './components/Search/SemanticSearch'
import SettingsPanel from './components/Settings/SettingsPanel'
import Dashboard from './components/Dashboard/Dashboard'

const AUTO_LOCK_MS = 15 * 60 * 1000

export default function App() {
  const { onboardingComplete, dbUnlocked, initFromConfig, touchActivity, lastActivity, setDbUnlocked } = useAppStore()

  // Load config on mount
  useEffect(() => {
    initFromConfig()
  }, [initFromConfig])

  // Auto-lock timer
  useEffect(() => {
    if (!dbUnlocked) return
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > AUTO_LOCK_MS) {
        window.api.invoke('db:lock')
        setDbUnlocked(false)
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [dbUnlocked, lastActivity, setDbUnlocked])

  // Track user activity
  useEffect(() => {
    const handler = () => touchActivity()
    window.addEventListener('mousemove', handler)
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('mousemove', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [touchActivity])

  if (!onboardingComplete) {
    return <OnboardingWizard />
  }

  if (!dbUnlocked) {
    return <LockScreen />
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <MainContent>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/judgment" element={<JudgmentViewer />} />
          <Route path="/timeline" element={<InteractiveTimeline />} />
          <Route path="/violations" element={<ViolationsDashboard />} />
          <Route path="/patterns" element={<PatternGroups />} />
          <Route path="/outline" element={<OutlineEditor />} />
          <Route path="/search" element={<SemanticSearch />} />
          <Route path="/settings" element={<SettingsPanel />} />
        </Routes>
      </MainContent>
    </div>
  )
}

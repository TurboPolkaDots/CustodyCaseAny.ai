import { useState, useCallback } from 'react'

export function useViolations() {
  const [violations, setViolations] = useState([])
  const [detecting, setDetecting] = useState(false)
  const [progress, setProgress] = useState(null)

  const detectViolations = useCallback(async () => {
    setDetecting(true)
    setProgress({ stage: 'Starting...', percent: 0 })
    try {
      const unsub = window.api.on('violations:progress', (data) => {
        setProgress(data)
      })
      const result = await window.api.invoke('violations:detect')
      unsub()
      if (result.violations) setViolations(result.violations)
      return result
    } catch (error) {
      console.error('Violation detection failed:', error)
    } finally {
      setDetecting(false)
      setProgress(null)
    }
  }, [])

  const loadViolations = useCallback(async () => {
    try {
      const result = await window.api.invoke('violations:list')
      setViolations(result || [])
    } catch (error) {
      console.error('Failed to load violations:', error)
    }
  }, [])

  const updateViolation = useCallback(async (id, updates) => {
    try {
      await window.api.invoke('violations:update', { id, ...updates })
      setViolations((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
      )
    } catch (error) {
      console.error('Failed to update violation:', error)
    }
  }, [])

  return { violations, detecting, progress, detectViolations, loadViolations, updateViolation }
}

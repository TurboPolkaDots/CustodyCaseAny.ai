import { useState, useCallback } from 'react'

export function usePatterns() {
  const [patterns, setPatterns] = useState([])
  const [grouping, setGrouping] = useState(false)
  const [progress, setProgress] = useState(null)

  const groupPatterns = useCallback(async () => {
    setGrouping(true)
    setProgress({ stage: 'Starting...', percent: 0 })
    try {
      const unsub = window.api.on('patterns:progress', (data) => {
        setProgress(data)
      })
      const result = await window.api.invoke('patterns:group')
      unsub()
      if (result.patterns) setPatterns(result.patterns)
      return result
    } catch (error) {
      console.error('Pattern grouping failed:', error)
    } finally {
      setGrouping(false)
      setProgress(null)
    }
  }, [])

  const loadPatterns = useCallback(async () => {
    try {
      const result = await window.api.invoke('patterns:list')
      setPatterns(result || [])
    } catch (error) {
      console.error('Failed to load patterns:', error)
    }
  }, [])

  return { patterns, grouping, progress, groupPatterns, loadPatterns }
}

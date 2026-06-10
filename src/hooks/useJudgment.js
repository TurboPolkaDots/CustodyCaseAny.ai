import { useState, useCallback } from 'react'

export function useJudgment() {
  const [obligations, setObligations] = useState([])
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(null)

  const parseJudgment = useCallback(async (documentId) => {
    setParsing(true)
    setProgress({ stage: 'Starting...', percent: 0 })
    try {
      const unsub = window.api.on('judgment:progress', (data) => {
        setProgress(data)
      })
      const result = await window.api.invoke('judgment:parse', documentId)
      unsub()
      if (result.obligations) setObligations(result.obligations)
      return result
    } catch (error) {
      console.error('Judgment parse failed:', error)
    } finally {
      setParsing(false)
      setProgress(null)
    }
  }, [])

  const loadObligations = useCallback(async () => {
    try {
      const result = await window.api.invoke('obligations:list')
      setObligations(result || [])
    } catch (error) {
      console.error('Failed to load obligations:', error)
    }
  }, [])

  const updateObligation = useCallback(async (id, updates) => {
    try {
      await window.api.invoke('obligations:update', { id, ...updates })
      setObligations((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
      )
    } catch (error) {
      console.error('Failed to update obligation:', error)
    }
  }, [])

  return { obligations, parsing, progress, parseJudgment, loadObligations, updateObligation }
}

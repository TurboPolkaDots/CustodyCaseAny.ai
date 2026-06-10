import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'

export function useOllama() {
  const { ollamaState, setOllamaState } = useAppStore()

  const checkStatus = useCallback(async () => {
    try {
      const result = await window.api.invoke('ollama:status')
      setOllamaState(result)
      return result
    } catch {
      setOllamaState({ connected: false, models: [] })
      return { connected: false, models: [] }
    }
  }, [setOllamaState])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [checkStatus])

  return { ...ollamaState, checkStatus }
}

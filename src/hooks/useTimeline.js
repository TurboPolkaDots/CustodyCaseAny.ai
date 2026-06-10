import { useState, useCallback } from 'react'

export function useTimeline() {
  const [events, setEvents] = useState([])
  const [building, setBuilding] = useState(false)
  const [progress, setProgress] = useState(null)
  const [filters, setFilters] = useState({ category: null, person: null, dateRange: null })

  const buildTimeline = useCallback(async () => {
    setBuilding(true)
    setProgress({ stage: 'Starting...', percent: 0 })
    try {
      const unsub = window.api.on('timeline:progress', (data) => {
        setProgress(data)
      })
      const result = await window.api.invoke('timeline:build')
      unsub()
      if (result.events) setEvents(result.events)
      return result
    } catch (error) {
      console.error('Timeline build failed:', error)
    } finally {
      setBuilding(false)
      setProgress(null)
    }
  }, [])

  const loadEvents = useCallback(async () => {
    try {
      const result = await window.api.invoke('timeline:events')
      setEvents(result || [])
    } catch (error) {
      console.error('Failed to load events:', error)
    }
  }, [])

  const filteredEvents = events.filter((e) => {
    if (filters.category && e.category !== filters.category) return false
    if (filters.person && !e.people_involved?.includes(filters.person)) return false
    if (filters.dateRange) {
      const d = new Date(e.event_date)
      if (d < filters.dateRange[0] || d > filters.dateRange[1]) return false
    }
    return true
  })

  return { events: filteredEvents, allEvents: events, building, progress, buildTimeline, loadEvents, filters, setFilters }
}

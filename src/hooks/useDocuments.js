import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../stores/appStore'

export function useDocuments() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [queue, setQueue] = useState({ total: 0, completed: 0, current: null, processing: false })
  const { addJob, removeJob } = useAppStore()
  const processingRef = useRef(false)

  const refreshDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const docs = await window.api.invoke('documents:list')
      setDocuments(docs || [])
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Process pending documents one at a time in the background
  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true

    try {
      while (true) {
        // Refresh to find pending docs
        const docs = await window.api.invoke('documents:list')
        setDocuments(docs || [])

        const pending = (docs || []).filter((d) => d.processing_status === 'pending')
        if (pending.length === 0) break

        const total = pending.length
        for (let i = 0; i < pending.length; i++) {
          const doc = pending[i]
          setQueue({ total, completed: i, current: doc.file_name, processing: true })

          const jobId = `process-${doc.id}`
          addJob({ id: jobId, type: 'process', name: doc.file_name, progress: 0 })

          try {
            await window.api.invoke('documents:process', doc.id)
          } catch (error) {
            console.error(`Processing failed for ${doc.file_name}:`, error)
          } finally {
            removeJob(jobId)
          }

          // Refresh list after each so user sees updates
          const updated = await window.api.invoke('documents:list')
          setDocuments(updated || [])
        }

        // Check if more were added during processing
        const recheck = await window.api.invoke('documents:list')
        const stillPending = (recheck || []).filter((d) => d.processing_status === 'pending')
        if (stillPending.length === 0) break
      }
    } finally {
      setQueue({ total: 0, completed: 0, current: null, processing: false })
      processingRef.current = false
      refreshDocuments()
    }
  }, [addJob, removeJob, refreshDocuments])

  const ingestFiles = useCallback(
    async (files) => {
      // Register all files instantly — they appear in the list right away
      for (const file of files) {
        try {
          await window.api.invoke('documents:register', file)
        } catch (error) {
          console.error('Register failed:', error)
        }
      }

      // Refresh list so all files show up immediately
      await refreshDocuments()

      // Start background processing queue
      processQueue()
    },
    [refreshDocuments, processQueue]
  )

  useEffect(() => {
    const unsubscribe = window.api.on('documents:progress', (data) => {
      if (data.documentId) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === data.documentId
              ? { ...d, processing_status: data.status }
              : d
          )
        )
      }
    })
    return unsubscribe
  }, [])

  // On mount, check for any pending docs and resume processing
  useEffect(() => {
    refreshDocuments().then(() => {
      processQueue()
    })
  }, [])

  return { documents, loading, ingestFiles, refreshDocuments, queue }
}

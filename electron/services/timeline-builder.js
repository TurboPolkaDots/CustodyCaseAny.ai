import { aiProvider } from './ai-provider.js'

const MODEL = 'llama3.2:3b'
const LOCAL_CHUNK_SIZE = 6000
const CLOUD_CHUNK_SIZE = 30000
const LOCAL_MAX_TEXT = 18000
const CLOUD_MAX_TEXT = 60000

export class TimelineBuilder {
  constructor(db, sendProgress) {
    this.db = db
    this.sendProgress = sendProgress || (() => {})
  }

  async build() {
    const documents = this.db.listDocuments()
    const completeDocs = documents.filter((d) => d.processing_status === 'complete' && d.extracted_text)

    if (completeDocs.length === 0) {
      this.sendProgress({ stage: 'Error: No processed documents found', percent: 0 })
      return { events: [] }
    }

    // Check Ollama
    const connected = await aiProvider.isConnected()
    if (!connected) {
      this.sendProgress({ stage: 'Error: Ollama not connected', percent: 0 })
      return { events: [] }
    }

    // Clear existing events
    this.db.db.prepare('DELETE FROM timeline_events').run()

    const allEvents = []
    let errors = 0

    for (let i = 0; i < completeDocs.length; i++) {
      const doc = completeDocs[i]
      const pct = Math.round(((i + 1) / completeDocs.length) * 90)
      this.sendProgress({
        stage: `Extracting events from ${doc.file_name} (${i + 1}/${completeDocs.length})...`,
        percent: pct
      })

      try {
        const events = await this._extractEvents(doc)
        allEvents.push(...events)
      } catch (error) {
        console.error(`Timeline extraction failed for ${doc.file_name}:`, error)
        errors++
      }
    }

    // Deduplicate by date + similar text
    this.sendProgress({ stage: 'Deduplicating events...', percent: 92 })
    const unique = this._deduplicateEvents(allEvents)

    // Sort chronologically
    unique.sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))

    // Store
    this.sendProgress({ stage: 'Saving events...', percent: 95 })
    for (const event of unique) {
      this.db.insertTimelineEvent(event)
    }

    const final = this.db.listTimelineEvents()
    this.sendProgress({
      stage: `Complete — ${final.length} events found${errors > 0 ? ` (${errors} errors)` : ''}`,
      percent: 100
    })
    return { events: final }
  }

  async _extractEvents(doc) {
    const isLocal = aiProvider.isLocal()
    const maxText = isLocal ? LOCAL_MAX_TEXT : CLOUD_MAX_TEXT
    const chunkSize = isLocal ? LOCAL_CHUNK_SIZE : CLOUD_CHUNK_SIZE
    const text = doc.extracted_text.substring(0, maxText)
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize))
    }

    const events = []
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]
      try {
        const response = await aiProvider.chat(MODEL, [
          {
            role: 'system',
            content: `Extract dated events from this custody-related document text. For each event:
- event_date: YYYY-MM-DD format (must be a real, specific date found in the text — do NOT guess or invent dates)
- event_text: brief factual description of what happened (must come directly from the document, do NOT invent or hallucinate events)
- category: one of (Communication, Custody, Financial, Medical, Education, Legal, Behavioral, Other)
- people: array of people mentioned in that specific event
- confidence: high, medium, or low

RULES:
- ONLY extract events that have a clear date reference in the text
- ONLY describe events that are actually described in the text — never fabricate events
- Skip any garbled, corrupted, or unreadable text — do not try to interpret encoding artifacts
- Do NOT include famous cases, news events, or anything not directly from this document
- If the text is mostly unreadable or garbled, return an empty array

Respond ONLY with valid JSON: {"events": [{"event_date": "...", "event_text": "...", "category": "...", "people": [...], "confidence": "..."}]}

If no dated events found, respond: {"events": []}`
          },
          {
            role: 'user',
            content: chunk
          }
        ], { format: 'json' })

        let result
        try {
          result = typeof response === 'string' ? JSON.parse(response) : response
        } catch (parseErr) {
          // Try to extract JSON from the response
          const match = response.match(/\{[\s\S]*\}/)
          if (match) {
            result = JSON.parse(match[0])
          } else {
            console.error(`JSON parse failed for chunk ${ci} of ${doc.file_name}:`, parseErr.message)
            continue
          }
        }

        for (const e of (result.events || [])) {
          // Skip entries with no valid date
          if (!e.event_date || e.event_date === 'null' || !/^\d{4}-\d{2}/.test(e.event_date)) continue

          // Skip entries with no meaningful text
          if (!e.event_text || e.event_text.length < 10) continue

          // Skip garbled text (high ratio of non-alphanumeric characters)
          if (this._isGarbled(e.event_text)) continue

          // Skip dates with placeholder months/days (e.g. 0X, 00)
          if (/\d{4}-0[0X]-/.test(e.event_date) || /-00$/.test(e.event_date)) continue

          events.push({
            document_id: doc.id,
            event_date: e.event_date,
            event_text: e.event_text,
            category: e.category,
            people_involved: e.people || [],
            confidence: e.confidence || 'medium'
          })
        }
      } catch (error) {
        console.error(`Ollama call failed for chunk ${ci} of ${doc.file_name}:`, error.message)
      }
    }

    return events
  }

  _isGarbled(text) {
    if (!text) return true
    // Count alphanumeric + common punctuation + spaces
    const clean = text.replace(/[a-zA-Z0-9\s.,;:!?'"()\-/]/g, '')
    // If more than 30% of characters are unusual, it's garbled
    return clean.length / text.length > 0.3
  }

  _deduplicateEvents(events) {
    const seen = new Map()
    const unique = []

    for (const event of events) {
      const key = `${event.event_date}:${(event.event_text || '').substring(0, 50).toLowerCase()}`
      if (!seen.has(key)) {
        seen.set(key, true)
        unique.push(event)
      }
    }

    return unique
  }
}

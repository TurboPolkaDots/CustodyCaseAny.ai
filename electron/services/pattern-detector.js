import { aiProvider } from './ai-provider.js'
import { loadConfig } from './config.js'

const MODEL = 'llama3.2:3b'

export class PatternDetector {
  constructor(db, sendProgress) {
    this.db = db
    this.sendProgress = sendProgress || (() => {})
    const config = loadConfig() || {}
    this.caseType = config.caseInfo?.caseType || 'modification'
    this.isInitial = this.caseType === 'initial'
  }

  async detectViolations() {
    const obligations = this.db.listObligations()
    const events = this.db.listTimelineEvents()
    const documents = this.db.listDocuments()

    if (obligations.length === 0) {
      const msg = this.isInitial
        ? 'No key issues found. Add key issues before finding evidence.'
        : 'No obligations found. The judgment document may not have extracted properly — try deleting and re-uploading it.'
      this.sendProgress({ stage: `Error: ${msg}`, percent: 0 })
      return { violations: [], error: msg }
    }

    const connected = await aiProvider.isConnected()
    if (!connected) {
      this.sendProgress({ stage: 'Error: Ollama not connected', percent: 0 })
      return { violations: [], error: 'Ollama not connected' }
    }

    // Clear existing violations
    this.db.db.prepare('DELETE FROM violations').run()

    const violations = []
    let errors = 0

    // For each obligation, check evidence
    for (let i = 0; i < obligations.length; i++) {
      const obl = obligations[i]
      const pct = Math.round(((i + 1) / obligations.length) * 85)
      this.sendProgress({
        stage: `Checking obligation ${i + 1} of ${obligations.length}...`,
        percent: pct
      })

      // Gather evidence context — use ALL docs if no category match
      const evidenceContext = this._buildEvidenceContext(documents, events, obl)
      if (!evidenceContext.trim()) continue

      try {
        const systemPrompt = this.isInitial
          ? `You are analyzing custody documents for an initial custody/divorce case. Given a key issue and evidence from documents, find evidence that supports this custody goal or concern.

For each piece of supporting evidence found:
- event_date: when this occurred (YYYY-MM-DD)
- description: what happened that supports or relates to this issue
- evidence_summary: specific evidence from the documents
- confidence: high, medium, or low
- category: the issue category

Respond ONLY with valid JSON: {"violations": [{"event_date": "...", "description": "...", "evidence_summary": "...", "confidence": "...", "category": "..."}]}
If no supporting evidence found: {"violations": []}`
          : `You are analyzing custody documents for settlement violations. Given an obligation from the custody order and evidence from documents, determine if there are violations.

For each violation found:
- event_date: when the violation occurred (YYYY-MM-DD)
- description: what happened that violated the obligation
- evidence_summary: specific evidence supporting this finding
- confidence: high, medium, or low
- category: the obligation category

Respond ONLY with valid JSON: {"violations": [{"event_date": "...", "description": "...", "evidence_summary": "...", "confidence": "...", "category": "..."}]}
If no violations found: {"violations": []}`

        const userContent = this.isInitial
          ? `KEY ISSUE:\n${obl.obligation_text}\n\nCategory: ${obl.category}\nResponsible Party: ${obl.responsible_party}\n\nDOCUMENT EVIDENCE:\n${evidenceContext}`
          : `OBLIGATION:\n${obl.obligation_text}\n\nCategory: ${obl.category}\nResponsible Party: ${obl.responsible_party}\n\nEVIDENCE:\n${evidenceContext}`

        const response = await aiProvider.chat(MODEL, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ], { format: 'json' })

        let result
        try {
          result = typeof response === 'string' ? JSON.parse(response) : response
        } catch {
          const match = response.match(/\{[\s\S]*\}/)
          if (match) result = JSON.parse(match[0])
          else continue
        }

        for (const v of (result.violations || [])) {
          const vid = this.db.insertViolation({
            obligation_id: obl.id,
            document_id: null,
            event_date: v.event_date,
            description: v.description,
            evidence_summary: v.evidence_summary,
            confidence: v.confidence || 'medium',
            category: v.category || obl.category
          })
          violations.push({ ...v, id: vid })
        }
      } catch (error) {
        console.error(`Violation check failed for obligation ${obl.id}:`, error.message)
        errors++
      }
    }

    const final = this.db.listViolations()
    this.sendProgress({
      stage: `Complete — ${final.length} violations found${errors > 0 ? ` (${errors} errors)` : ''}`,
      percent: 100
    })
    return { violations: final }
  }

  async groupPatterns() {
    const violations = this.db.listViolations()

    if (violations.length === 0) {
      const msg = this.isInitial
        ? 'No evidence found. Find supporting evidence first.'
        : 'No violations found. Run violation detection first.'
      this.sendProgress({ stage: `Error: ${msg}`, percent: 0 })
      return { patterns: [], error: msg }
    }

    const connected = await aiProvider.isConnected()
    if (!connected) {
      this.sendProgress({ stage: 'Error: Ollama not connected', percent: 0 })
      return { patterns: [], error: 'Ollama not connected' }
    }

    // Clear existing patterns
    this.db.db.prepare('DELETE FROM pattern_violations').run()
    this.db.db.prepare('DELETE FROM patterns').run()

    this.sendProgress({ stage: 'Analyzing violation patterns...', percent: 30 })

    const violationSummary = violations.map((v) =>
      `[${v.event_date}] ${v.category}: ${v.description} (${v.confidence} confidence)`
    ).join('\n')

    try {
      const systemPrompt = this.isInitial
        ? `Analyze this supporting evidence for an initial custody case and group them into key themes that support the custody position.

For each theme:
- pattern_name: descriptive theme name
- pattern_type: category of theme
- description: detailed description of the theme and how it supports the custody case
- frequency: number of evidence items supporting this theme
- evidence_strength: strong, moderate, or weak
- violation_indices: array of 0-based indices of evidence items belonging to this theme

Respond ONLY with valid JSON: {"patterns": [{"pattern_name": "...", "pattern_type": "...", "description": "...", "frequency": N, "evidence_strength": "...", "violation_indices": [0, 1, ...]}]}`
        : `Analyze these custody settlement violations and group them into recurring patterns.

For each pattern:
- pattern_name: descriptive name
- pattern_type: category of pattern
- description: detailed description of the pattern
- frequency: number of occurrences
- evidence_strength: strong, moderate, or weak
- violation_indices: array of 0-based indices of violations belonging to this pattern

Respond ONLY with valid JSON: {"patterns": [{"pattern_name": "...", "pattern_type": "...", "description": "...", "frequency": N, "evidence_strength": "...", "violation_indices": [0, 1, ...]}]}`

      const response = await aiProvider.chat(MODEL, [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: this.isInitial ? `Supporting Evidence:\n${violationSummary}` : `Violations:\n${violationSummary}`
        }
      ], { format: 'json' })

      let result
      try {
        result = typeof response === 'string' ? JSON.parse(response) : response
      } catch {
        const match = response.match(/\{[\s\S]*\}/)
        if (match) result = JSON.parse(match[0])
        else throw new Error('Failed to parse pattern response')
      }

      this.sendProgress({ stage: 'Saving patterns...', percent: 80 })

      for (const p of (result.patterns || [])) {
        const indices = p.violation_indices || []
        const matchedViolations = indices
          .filter((i) => i >= 0 && i < violations.length)
          .map((i) => violations[i])

        const dates = matchedViolations
          .map((v) => v.event_date)
          .filter(Boolean)
          .sort()

        const patternId = this.db.insertPattern({
          pattern_name: p.pattern_name,
          pattern_type: p.pattern_type,
          description: p.description,
          frequency: p.frequency || matchedViolations.length,
          first_occurrence: dates[0] || null,
          last_occurrence: dates[dates.length - 1] || null,
          evidence_strength: p.evidence_strength || 'moderate'
        })

        for (const v of matchedViolations) {
          if (v.id) this.db.linkPatternViolation(patternId, v.id)
        }
      }
    } catch (error) {
      console.error('Pattern grouping failed:', error)
    }

    const final = this.db.listPatterns()
    this.sendProgress({
      stage: `Complete — ${final.length} patterns found`,
      percent: 100
    })
    return { patterns: final }
  }

  _buildEvidenceContext(documents, events, obligation) {
    const parts = []

    // Add relevant timeline events — only category-matched, limit to 8
    const relatedEvents = events.filter(
      (e) => e.category === obligation.category ||
             (e.event_text && obligation.category && e.event_text.toLowerCase().includes(obligation.category.toLowerCase()))
    )
    if (relatedEvents.length > 0) {
      parts.push('TIMELINE EVENTS:')
      for (const e of relatedEvents.slice(0, 8)) {
        parts.push(`[${e.event_date}] ${e.event_text}`)
      }
    } else {
      // No matching events — just include a handful of recent ones for context
      const recent = events.slice(-5)
      if (recent.length > 0) {
        parts.push('RECENT EVENTS:')
        for (const e of recent) {
          parts.push(`[${e.event_date}] ${e.event_text}`)
        }
      }
    }

    // Add document excerpts — only category-matched docs, skip if no match
    const completeDocs = documents.filter((d) => d.processing_status === 'complete' && d.extracted_text)
    const relatedDocs = completeDocs.filter(
      (d) => d.classification === obligation.category?.toUpperCase()?.replace(/\s/g, '_') ||
             (d.extracted_text && obligation.category && d.extracted_text.toLowerCase().includes(obligation.category.toLowerCase()))
    )
    for (const d of relatedDocs.slice(0, 2)) {
      parts.push(`\nDOCUMENT: ${d.file_name}`)
      const docLimit = aiProvider.isLocal() ? 1200 : 4000
      parts.push(d.extracted_text.substring(0, docLimit))
    }

    return parts.join('\n')
  }
}

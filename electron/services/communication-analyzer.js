import { aiProvider } from './ai-provider.js'

const MODEL = 'llama3.2:3b'

export class CommunicationAnalyzer {
  constructor(db, sendProgress) {
    this.db = db
    this.sendProgress = sendProgress || (() => {})
  }

  async analyze() {
    const documents = this.db.listDocuments()

    // Find communication documents — match by classification OR by filename patterns
    const commsDocs = documents.filter((d) => {
      if (!d.extracted_text) return false
      const cls = (d.classification || '').toUpperCase()
      const name = (d.file_name || '').toLowerCase()
      return ['OFW_MESSAGE', 'EMAIL', 'TEXT_MESSAGE'].includes(cls) ||
        name.includes('ofw') ||
        name.includes('message') ||
        name.includes('email') ||
        name.includes('text') ||
        name.includes('communication')
    })

    if (commsDocs.length === 0) {
      this.sendProgress({ stage: 'No communication documents found', percent: 0 })
      return {
        error: 'No communication documents found. Upload OFW messages, emails, or text messages first.',
        toneAnalysis: {},
        responsePatterns: '',
        deflectionPatterns: [],
        documentCount: 0
      }
    }

    const connected = await aiProvider.isConnected()
    if (!connected) {
      this.sendProgress({ stage: 'Error: AI not connected', percent: 0 })
      return { error: 'AI provider not connected', toneAnalysis: {}, responsePatterns: '', deflectionPatterns: [], documentCount: 0 }
    }

    this.sendProgress({ stage: `Analyzing ${commsDocs.length} communications...`, percent: 20 })

    // Combine communication texts (truncated)
    const commsText = commsDocs
      .map((d) => `--- ${d.file_name} (${d.classification}) ---\n${d.extracted_text.substring(0, 2000)}`)
      .join('\n\n')
      .substring(0, 12000)

    // Tone analysis
    let toneAnalysis = {}
    try {
      const toneResult = await aiProvider.chatJson(MODEL, [
        {
          role: 'system',
          content: `Analyze the tone of these custody-related communications. Count occurrences of each tone category.
Categories: cooperative, hostile, deflective, manipulative, neutral, professional, threatening, dismissive

Respond with JSON: {"tones": {"cooperative": N, "hostile": N, ...}}`
        },
        { role: 'user', content: commsText }
      ])
      toneAnalysis = toneResult.tones || {}
    } catch {
      toneAnalysis = { error: 'Analysis failed' }
    }

    this.sendProgress({ stage: 'Analyzing response patterns...', percent: 50 })

    // Response pattern analysis
    let responsePatterns = ''
    try {
      responsePatterns = await aiProvider.chat(MODEL, [
        {
          role: 'system',
          content: 'Analyze these custody communications for response patterns. Note: response times, avoidance of topics, pattern of non-responses, and any concerning patterns. Be factual and neutral. Keep to 2-3 paragraphs.'
        },
        { role: 'user', content: commsText }
      ])
    } catch {
      responsePatterns = 'Analysis unavailable.'
    }

    this.sendProgress({ stage: 'Identifying deflection patterns...', percent: 75 })

    // Deflection patterns
    let deflectionPatterns = []
    try {
      const deflResult = await aiProvider.chatJson(MODEL, [
        {
          role: 'system',
          content: `Identify specific deflection patterns in these custody communications. Look for:
- Topic changes to avoid accountability
- Blame-shifting
- Gaslighting language
- DARVO patterns
- False equivalencies

Respond with JSON: {"patterns": ["description of pattern 1", "description of pattern 2", ...]}`
        },
        { role: 'user', content: commsText }
      ])
      deflectionPatterns = deflResult.patterns || []
    } catch {
      deflectionPatterns = []
    }

    const analysis = {
      toneAnalysis,
      responsePatterns,
      deflectionPatterns,
      documentCount: commsDocs.length,
      analyzedAt: new Date().toISOString()
    }

    this.sendProgress({ stage: 'Complete', percent: 100 })
    return analysis
  }
}

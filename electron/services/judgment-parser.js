import { aiProvider } from './ai-provider.js'

const MODEL = 'llama3.2:3b'
// Cloud models handle full documents in one shot; local models need smaller chunks
const LOCAL_CHUNK_SIZE = 12000
const CLOUD_CHUNK_SIZE = 60000
const CHUNK_OVERLAP = 500

export class JudgmentParser {
  constructor(db, sendProgress) {
    this.db = db
    this.sendProgress = sendProgress || (() => {})
  }

  async parse(documentId) {
    const doc = this.db.getDocument(documentId)
    if (!doc || !doc.extracted_text) {
      throw new Error('Document not found or has no text')
    }

    const text = doc.extracted_text
    this.sendProgress({ stage: 'Analyzing judgment...', percent: 5 })

    // Clear existing obligations for this document
    const existing = this.db.listObligations().filter((o) => o.document_id === documentId)
    for (const o of existing) {
      this.db.db.prepare('DELETE FROM obligations WHERE id = ?').run(o.id)
    }

    // Cloud models can handle full docs; local models need ~12k chunks
    const chunkSize = aiProvider.isLocal() ? LOCAL_CHUNK_SIZE : CLOUD_CHUNK_SIZE
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize - CHUNK_OVERLAP) {
      const chunk = text.substring(i, i + chunkSize)
      if (chunk.trim().length > 100) {
        chunks.push({ index: chunks.length, text: chunk })
      }
    }

    this.sendProgress({ stage: `Processing ${chunks.length} sections...`, percent: 10 })

    const allObligations = []
    for (let i = 0; i < chunks.length; i++) {
      const pct = 10 + Math.round(((i + 1) / chunks.length) * 80)
      this.sendProgress({ stage: `Parsing section ${i + 1} of ${chunks.length}...`, percent: pct })

      const obligations = await this._extractObligations(chunks[i].text, documentId, i)
      allObligations.push(...obligations)
    }

    // Deduplicate overlapping chunk results
    const unique = this._deduplicateObligations(allObligations)

    this.sendProgress({ stage: `Saving ${unique.length} obligations...`, percent: 95 })
    for (const obl of unique) {
      this.db.insertObligation(obl)
    }

    this.sendProgress({ stage: `Complete — ${unique.length} obligations found`, percent: 100 })

    return { obligations: this.db.listObligations() }
  }

  async _extractObligations(text, documentId, chunkIndex) {
    try {
      const result = await aiProvider.chatJson(MODEL, [
        {
          role: 'system',
          content: `Extract ALL specific obligations, requirements, and orders from this section of a custody order/judgment.

Look for:
- Financial obligations (child support amounts, insurance, medical expenses, tax exemptions)
- Custody/visitation schedules (regular, holiday, summer, weekday/weekend)
- Decision-making requirements (education, medical, religious, extracurricular)
- Communication requirements (OFW, email, response times, co-parenting communication)
- Travel/relocation restrictions
- Right of first refusal provisions
- Transportation responsibilities
- Any other court-ordered requirements or prohibitions

For each obligation found:
- text: the specific obligation (quote or closely paraphrase the court order language)
- responsible_party: Mother, Father, Both, or Court
- category: Custody Schedule, Communication, Decision Making, Financial, Medical, Education, Travel, Relocation, Right of First Refusal, Holiday Schedule, Transportation, or Other

Be thorough — extract EVERY obligation, even minor ones. If no obligations found, return an empty array.

Respond with JSON: {"obligations": [{"text": "...", "responsible_party": "...", "category": "..."}]}`
        },
        {
          role: 'user',
          content: text
        }
      ])

      return (result.obligations || []).map((o) => ({
        document_id: documentId,
        section_id: `Part ${chunkIndex + 1}`,
        section_letter: String.fromCharCode(65 + (chunkIndex % 26)),
        obligation_text: o.text,
        responsible_party: o.responsible_party,
        category: o.category
      }))
    } catch {
      return []
    }
  }

  async suggestKeyIssues() {
    const documents = this.db.listDocuments().filter((d) => d.processing_status === 'complete' && d.extracted_text)
    if (documents.length === 0) {
      return { issues: [], error: 'No processed documents found. Upload and process documents first.' }
    }

    this.sendProgress({ stage: 'Reading documents...', percent: 10 })

    // Build a context from all documents (truncated per doc)
    const docLimit = aiProvider.isLocal() ? LOCAL_CHUNK_SIZE : CLOUD_CHUNK_SIZE
    const docContext = documents.map((d) =>
      `DOCUMENT: ${d.file_name}\n${d.extracted_text.substring(0, docLimit)}`
    ).join('\n\n---\n\n')

    this.sendProgress({ stage: 'Analyzing documents for key issues...', percent: 30 })

    try {
      const result = await aiProvider.chatJson(MODEL, [
        {
          role: 'system',
          content: `You are analyzing custody/divorce documents for someone going through an initial custody case (no existing court order yet).

Based on the documents provided, suggest key issues that should be addressed in their custody case.

For each issue:
- text: a clear statement of the issue (e.g. "Father has been primary caregiver since separation", "Mother works night shifts impacting availability")
- category: Custody Schedule, Communication, Decision Making, Financial, Medical, Education, Travel, Relocation, Right of First Refusal, Holiday Schedule, Transportation, Child's Best Interests, or Other
- responsible_party: Mother, Father, Both, or Child

Focus on:
- Parenting time and custody schedule concerns
- Financial support needs (child support, insurance, medical costs)
- Decision-making authority (education, medical, religious)
- Living arrangements and stability
- Any safety or welfare concerns documented
- Communication patterns between parents
- Child's needs and best interests

Suggest 5-15 key issues based on what the documents reveal. If documents are limited, suggest common issues that should be addressed.

Respond with JSON: {"issues": [{"text": "...", "category": "...", "responsible_party": "..."}]}`
        },
        {
          role: 'user',
          content: docContext
        }
      ])

      this.sendProgress({ stage: `Found ${(result.issues || []).length} suggested issues`, percent: 100 })
      return { issues: result.issues || [] }
    } catch (error) {
      return { issues: [], error: error.message || 'Failed to suggest issues' }
    }
  }

  _deduplicateObligations(obligations) {
    const seen = new Map()
    const unique = []

    for (const obl of obligations) {
      const key = (obl.obligation_text || '').toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 100)
      if (key.length > 20 && !seen.has(key)) {
        seen.set(key, true)
        unique.push(obl)
      }
    }

    return unique
  }
}

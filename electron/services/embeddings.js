import { aiProvider } from './ai-provider.js'
import { ollama } from './ollama.js'

const EMBED_MODEL = 'nomic-embed-text'
const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

async function ensureEmbedModel() {
  const models = await ollama.listModels()
  const have = models.some((m) => (m.name || m.model || '').startsWith(EMBED_MODEL))
  if (have) return
  const res = await fetch('http://localhost:11434/api/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: EMBED_MODEL, stream: false })
  })
  if (!res.ok) {
    throw new Error(`Could not pull embedding model ${EMBED_MODEL}. Run: ollama pull ${EMBED_MODEL}`)
  }
  await res.json()
}

export class EmbeddingsService {
  constructor(db, sendProgress) {
    this.db = db
    this.sendProgress = sendProgress || (() => {})
  }

  async buildIndex() {
    const documents = this.db.listDocuments()
    const completeDocs = documents.filter((d) => d.processing_status === 'complete' && d.extracted_text)

    if (completeDocs.length === 0) {
      throw new Error('No processed documents to index')
    }

    this.sendProgress({ stage: `Checking embedding model (${EMBED_MODEL})…`, percent: 0 })
    await ensureEmbedModel()

    // Clear existing embeddings
    this.db.db.prepare('DELETE FROM embeddings').run()

    for (let i = 0; i < completeDocs.length; i++) {
      const doc = completeDocs[i]
      const pct = Math.round((i / completeDocs.length) * 90)
      this.sendProgress({ stage: `Indexing ${doc.file_name}...`, percent: pct })

      const chunks = this._chunkText(doc.extracted_text)

      for (let j = 0; j < chunks.length; j++) {
        try {
          const embeddings = await aiProvider.embed(EMBED_MODEL, chunks[j])
          if (embeddings && embeddings.length > 0) {
            const embeddingBuffer = Buffer.from(new Float32Array(embeddings[0]).buffer)
            this.db.insertEmbedding({
              document_id: doc.id,
              chunk_index: j,
              chunk_text: chunks[j],
              embedding: embeddingBuffer
            })
          }
        } catch (error) {
          console.error(`Embedding failed for chunk ${j} of ${doc.file_name}:`, error)
        }
      }
    }

    this.sendProgress({ stage: 'Complete', percent: 100 })
  }

  async search(query, topK = 10) {
    await ensureEmbedModel()
    // Get query embedding
    const queryEmbeddings = await aiProvider.embed(EMBED_MODEL, query)
    if (!queryEmbeddings || queryEmbeddings.length === 0) {
      throw new Error('Failed to generate query embedding')
    }
    const queryVec = queryEmbeddings[0]

    // Get all embeddings
    const allEmbeddings = this.db.listEmbeddings()

    // Compute cosine similarity
    const scored = allEmbeddings
      .map((emb) => {
        const storedVec = new Float32Array(emb.embedding.buffer, emb.embedding.byteOffset, emb.embedding.byteLength / 4)
        const score = cosineSimilarity(queryVec, storedVec)
        return { ...emb, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)

    // Attach file names
    const documents = this.db.listDocuments()
    const docMap = new Map(documents.map((d) => [d.id, d]))

    return scored.map((s) => ({
      ...s,
      file_name: docMap.get(s.document_id)?.file_name || 'Unknown'
    }))
  }

  _chunkText(text) {
    const words = text.split(/\s+/)
    const chunks = []
    for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const chunk = words.slice(i, i + CHUNK_SIZE).join(' ')
      if (chunk.trim()) chunks.push(chunk)
    }
    return chunks
  }
}

function cosineSimilarity(a, b) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dotProduct / denom
}

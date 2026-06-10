const OLLAMA_BASE = 'http://localhost:11434'

export class OllamaClient {
  constructor(baseUrl = OLLAMA_BASE) {
    this.baseUrl = baseUrl
  }

  async isConnected() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      return res.ok
    } catch {
      return false
    }
  }

  async listModels() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      if (!res.ok) return []
      const data = await res.json()
      return data.models || []
    } catch {
      return []
    }
  }

  async chat(model, messages, options = {}) {
    const body = {
      model,
      messages,
      stream: false,
      ...options
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      throw new Error(`Ollama chat failed: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    return data.message?.content || ''
  }

  async chatJson(model, messages, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.chat(model, messages, { format: 'json' })
        return JSON.parse(response)
      } catch (error) {
        if (attempt === retries) throw error
      }
    }
  }

  async *chatStream(model, messages, options = {}) {
    const body = {
      model,
      messages,
      stream: true,
      ...options
    }

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      throw new Error(`Ollama chat stream failed: ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            yield data.message.content
          }
        } catch {}
      }
    }
  }

  async embed(model, input) {
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input })
    })

    if (!res.ok) {
      throw new Error(`Ollama embed failed: ${res.status}`)
    }

    const data = await res.json()
    return data.embeddings || []
  }
}

export const ollama = new OllamaClient()

import { ollama } from './ollama.js'
import { loadConfig, updateConfig } from './config.js'

// Cloud provider configurations
const PROVIDERS = {
  ollama: {
    name: 'Ollama (Local)',
    local: true,
    defaultModel: 'llama3.2:3b'
  },
  openai: {
    name: 'OpenAI',
    local: false,
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o1-mini']
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    local: false,
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']
  },
  xai: {
    name: 'xAI (Grok)',
    local: false,
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-4-fast-reasoning-latest',
    models: ['grok-4-latest', 'grok-4-fast-reasoning-latest', 'grok-3-latest']
  }
}

class AIProvider {
  getConfig() {
    const config = loadConfig() || {}
    return {
      provider: config.aiProvider || 'ollama',
      apiKey: config.aiApiKey || '',
      model: config.aiModel || ''
    }
  }

  setConfig({ provider, apiKey, model }) {
    updateConfig({
      aiProvider: provider,
      aiApiKey: apiKey || '',
      aiModel: model || ''
    })
  }

  getActiveModel() {
    const { provider, model } = this.getConfig()
    if (model) return model
    return PROVIDERS[provider]?.defaultModel || 'llama3.2:3b'
  }

  isLocal() {
    const { provider } = this.getConfig()
    return provider === 'ollama'
  }

  async isConnected() {
    const { provider, apiKey } = this.getConfig()
    if (provider === 'ollama') {
      return await ollama.isConnected()
    }
    // For cloud providers, just check if API key is set
    return !!apiKey
  }

  async chat(model, messages, options = {}) {
    const { provider, apiKey } = this.getConfig()
    // For cloud providers, always use the configured cloud model (ignore local model names like llama3.2:3b)
    const activeModel = provider === 'ollama' ? (model || this.getActiveModel()) : this.getActiveModel()

    if (provider === 'ollama') {
      return await ollama.chat(activeModel, messages, options)
    }

    return await this._cloudChat(provider, apiKey, activeModel, messages, options)
  }

  async chatJson(model, messages, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const { provider } = this.getConfig()
        let response
        if (provider === 'ollama') {
          response = await ollama.chat(model || this.getActiveModel(), messages, { format: 'json' })
        } else {
          // Ask cloud models to respond in JSON via system prompt
          const jsonMessages = [...messages]
          if (jsonMessages[0]?.role === 'system') {
            jsonMessages[0].content += '\n\nYou MUST respond with valid JSON only. No other text.'
          }
          response = await this.chat(model, jsonMessages)
        }
        return typeof response === 'string' ? JSON.parse(response) : response
      } catch (error) {
        if (attempt === retries) throw error
      }
    }
  }

  async embed(model, input) {
    // Embeddings only work with Ollama (a dedicated embed model, not a chat model)
    return await ollama.embed(model || 'nomic-embed-text', input)
  }

  async _cloudChat(provider, apiKey, model, messages, options) {
    const providerConfig = PROVIDERS[provider]
    if (!providerConfig) throw new Error(`Unknown provider: ${provider}`)
    if (!apiKey) throw new Error(`No API key configured for ${providerConfig.name}`)

    if (provider === 'anthropic') {
      return await this._anthropicChat(apiKey, model, messages)
    }

    // OpenAI-compatible API (OpenAI, xAI)
    return await this._openaiChat(providerConfig.baseUrl, apiKey, model, messages)
  }

  async _openaiChat(baseUrl, apiKey, model, messages) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, temperature: 0.3 })
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  async _anthropicChat(apiKey, model, messages) {
    // Convert from OpenAI format to Anthropic format
    const systemMsg = messages.find((m) => m.role === 'system')
    const userMessages = messages.filter((m) => m.role !== 'system')

    const body = {
      model,
      max_tokens: 4096,
      messages: userMessages
    }
    if (systemMsg) body.system = systemMsg.content

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    return data.content?.[0]?.text || ''
  }
}

export const aiProvider = new AIProvider()
export { PROVIDERS }

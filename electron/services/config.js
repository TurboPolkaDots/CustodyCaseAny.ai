import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const configPath = () => join(app.getPath('userData'), 'custodycase-config.json')

// Fields that must never sit on disk in plaintext.
const SECRET_FIELDS = ['aiApiKey']
const ENC_PREFIX = 'enc:v1:'

function tryEncrypt(value) {
  if (!value || typeof value !== 'string') return value
  if (value.startsWith(ENC_PREFIX)) return value
  try {
    if (!safeStorage.isEncryptionAvailable()) return value
    const buf = safeStorage.encryptString(value)
    return ENC_PREFIX + buf.toString('base64')
  } catch {
    return value
  }
}

function tryDecrypt(value) {
  if (!value || typeof value !== 'string') return value
  if (!value.startsWith(ENC_PREFIX)) return value
  try {
    if (!safeStorage.isEncryptionAvailable()) return ''
    const buf = Buffer.from(value.slice(ENC_PREFIX.length), 'base64')
    return safeStorage.decryptString(buf)
  } catch {
    return ''
  }
}

function encryptSecrets(config) {
  const out = { ...config }
  for (const k of SECRET_FIELDS) {
    if (out[k]) out[k] = tryEncrypt(out[k])
  }
  return out
}

function decryptSecrets(config) {
  const out = { ...config }
  for (const k of SECRET_FIELDS) {
    if (out[k]) out[k] = tryDecrypt(out[k])
  }
  return out
}

export function loadConfig() {
  try {
    const p = configPath()
    if (!existsSync(p)) return null
    const data = readFileSync(p, 'utf-8')
    return decryptSecrets(JSON.parse(data))
  } catch {
    return null
  }
}

export function saveConfig(config) {
  const p = configPath()
  writeFileSync(p, JSON.stringify(encryptSecrets(config), null, 2), 'utf-8')
}

export function updateConfig(updates) {
  const current = loadConfig() || {}
  const merged = { ...current, ...updates }
  saveConfig(merged)
  return merged
}

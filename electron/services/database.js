import Database from 'better-sqlite3'
import { join } from 'path'
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const SCRYPT_N = 16384

export class DatabaseService {
  constructor(userDataPath) {
    this.dbPath = join(userDataPath, 'custodycase.db')
    this.db = null
    this.encryptionKey = null
    this.salt = null
  }

  initialize(passphrase) {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    this.salt = randomBytes(SALT_LENGTH)
    this.encryptionKey = scryptSync(passphrase, this.salt, KEY_LENGTH, { N: SCRYPT_N })

    this._createSchema()

    // Store salt and encrypted test value for passphrase verification
    const testValue = this.encrypt('custodycase-verify')
    this.db.prepare(`
      INSERT OR REPLACE INTO app_meta (key, value) VALUES ('salt', ?), ('verify', ?)
    `).run(this.salt.toString('hex'), testValue)
  }

  unlock(passphrase) {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    const saltRow = this.db.prepare(`SELECT value FROM app_meta WHERE key = 'salt'`).get()
    const verifyRow = this.db.prepare(`SELECT value FROM app_meta WHERE key = 'verify'`).get()

    if (!saltRow || !verifyRow) {
      this.db.close()
      this.db = null
      throw new Error('Database not initialized')
    }

    this.salt = Buffer.from(saltRow.value, 'hex')
    this.encryptionKey = scryptSync(passphrase, this.salt, KEY_LENGTH, { N: SCRYPT_N })

    try {
      const decrypted = this.decrypt(verifyRow.value)
      if (decrypted !== 'custodycase-verify') {
        this.lock()
        return false
      }
      return true
    } catch {
      this.lock()
      return false
    }
  }

  lock() {
    this.encryptionKey = null
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  isUnlocked() {
    return this.db !== null && this.encryptionKey !== null
  }

  encrypt(plaintext) {
    if (!this.encryptionKey) throw new Error('Database locked')
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  decrypt(ciphertext) {
    if (!this.encryptionKey) throw new Error('Database locked')
    const data = Buffer.from(ciphertext, 'base64')
    const iv = data.subarray(0, IV_LENGTH)
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv)
    decipher.setAuthTag(tag)
    return decipher.update(encrypted, null, 'utf8') + decipher.final('utf8')
  }

  _createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_path TEXT,
        file_type TEXT,
        file_size INTEGER,
        mime_type TEXT,
        classification TEXT,
        classification_confidence REAL,
        extracted_text TEXT,
        metadata_json TEXT,
        summary TEXT,
        ocr_needed INTEGER DEFAULT 0,
        processing_status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS obligations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER REFERENCES documents(id),
        section_id TEXT,
        section_letter TEXT,
        obligation_text TEXT,
        responsible_party TEXT,
        category TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS timeline_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER REFERENCES documents(id),
        event_date TEXT,
        event_text TEXT,
        category TEXT,
        people_involved TEXT,
        source_page INTEGER,
        confidence TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS violations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        obligation_id INTEGER REFERENCES obligations(id),
        document_id INTEGER REFERENCES documents(id),
        event_date TEXT,
        description TEXT,
        evidence_summary TEXT,
        confidence TEXT DEFAULT 'medium',
        category TEXT,
        included_in_outline INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_name TEXT,
        pattern_type TEXT,
        description TEXT,
        frequency INTEGER DEFAULT 0,
        first_occurrence TEXT,
        last_occurrence TEXT,
        evidence_strength TEXT DEFAULT 'moderate',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS pattern_violations (
        pattern_id INTEGER REFERENCES patterns(id),
        violation_id INTEGER REFERENCES violations(id),
        PRIMARY KEY (pattern_id, violation_id)
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER REFERENCES documents(id),
        chunk_index INTEGER,
        chunk_text TEXT,
        embedding BLOB,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS outlines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        outline_json TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `)
  }

  // Document CRUD
  insertDocument(doc) {
    const stmt = this.db.prepare(`
      INSERT INTO documents (file_name, file_path, file_type, file_size, mime_type, processing_status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `)
    const result = stmt.run(doc.file_name, doc.file_path, doc.file_type, doc.file_size, doc.mime_type)
    return result.lastInsertRowid
  }

  updateDocument(id, updates) {
    const fields = []
    const values = []
    for (const [key, value] of Object.entries(updates)) {
      if (['extracted_text', 'metadata_json', 'summary'].includes(key) && value) {
        fields.push(`${key} = ?`)
        values.push(this.encrypt(value))
      } else {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }
    fields.push(`updated_at = datetime('now')`)
    values.push(id)
    this.db.prepare(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  getDocument(id) {
    const doc = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    return doc ? this._decryptDocument(doc) : null
  }

  listDocuments() {
    const docs = this.db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all()
    return docs.map((d) => this._decryptDocument(d))
  }

  deleteDocument(id) {
    this.db.prepare('DELETE FROM embeddings WHERE document_id = ?').run(id)
    this.db.prepare('DELETE FROM timeline_events WHERE document_id = ?').run(id)
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  }

  _decryptDocument(doc) {
    try {
      if (doc.extracted_text) doc.extracted_text = this.decrypt(doc.extracted_text)
      if (doc.metadata_json) doc.metadata_json = this.decrypt(doc.metadata_json)
      if (doc.summary) doc.summary = this.decrypt(doc.summary)
    } catch {
      // Leave encrypted if decryption fails
    }
    return doc
  }

  // Obligations
  insertObligation(obl) {
    const stmt = this.db.prepare(`
      INSERT INTO obligations (document_id, section_id, section_letter, obligation_text, responsible_party, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const text = obl.obligation_text ? this.encrypt(obl.obligation_text) : null
    const result = stmt.run(obl.document_id, obl.section_id, obl.section_letter, text, obl.responsible_party, obl.category)
    return result.lastInsertRowid
  }

  listObligations() {
    const obls = this.db.prepare('SELECT * FROM obligations ORDER BY section_letter, id').all()
    return obls.map((o) => {
      try { if (o.obligation_text) o.obligation_text = this.decrypt(o.obligation_text) } catch {}
      return o
    })
  }

  updateObligation(id, updates) {
    const fields = []
    const values = []
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'obligation_text' && value) {
        fields.push(`${key} = ?`)
        values.push(this.encrypt(value))
      } else {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }
    fields.push(`updated_at = datetime('now')`)
    values.push(id)
    this.db.prepare(`UPDATE obligations SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  // Timeline events
  insertTimelineEvent(event) {
    const stmt = this.db.prepare(`
      INSERT INTO timeline_events (document_id, event_date, event_text, category, people_involved, source_page, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const text = event.event_text ? this.encrypt(event.event_text) : null
    const people = event.people_involved ? JSON.stringify(event.people_involved) : null
    const result = stmt.run(event.document_id, event.event_date, text, event.category, people, event.source_page, event.confidence)
    return result.lastInsertRowid
  }

  listTimelineEvents() {
    const events = this.db.prepare('SELECT * FROM timeline_events ORDER BY event_date ASC').all()
    return events.map((e) => {
      try { if (e.event_text) e.event_text = this.decrypt(e.event_text) } catch {}
      try { if (e.people_involved) e.people_involved = JSON.parse(e.people_involved) } catch {}
      return e
    })
  }

  // Violations
  insertViolation(v) {
    const stmt = this.db.prepare(`
      INSERT INTO violations (obligation_id, document_id, event_date, description, evidence_summary, confidence, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const desc = v.description ? this.encrypt(v.description) : null
    const evidence = v.evidence_summary ? this.encrypt(v.evidence_summary) : null
    const result = stmt.run(v.obligation_id, v.document_id, v.event_date, desc, evidence, v.confidence, v.category)
    return result.lastInsertRowid
  }

  listViolations() {
    const vs = this.db.prepare('SELECT * FROM violations ORDER BY event_date DESC').all()
    return vs.map((v) => {
      try { if (v.description) v.description = this.decrypt(v.description) } catch {}
      try { if (v.evidence_summary) v.evidence_summary = this.decrypt(v.evidence_summary) } catch {}
      return v
    })
  }

  updateViolation(id, updates) {
    const fields = []
    const values = []
    for (const [key, value] of Object.entries(updates)) {
      if (['description', 'evidence_summary'].includes(key) && value) {
        fields.push(`${key} = ?`)
        values.push(this.encrypt(value))
      } else {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    }
    fields.push(`updated_at = datetime('now')`)
    values.push(id)
    this.db.prepare(`UPDATE violations SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  // Patterns
  insertPattern(p) {
    const stmt = this.db.prepare(`
      INSERT INTO patterns (pattern_name, pattern_type, description, frequency, first_occurrence, last_occurrence, evidence_strength)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    const desc = p.description ? this.encrypt(p.description) : null
    const result = stmt.run(p.pattern_name, p.pattern_type, desc, p.frequency, p.first_occurrence, p.last_occurrence, p.evidence_strength)
    return result.lastInsertRowid
  }

  linkPatternViolation(patternId, violationId) {
    this.db.prepare('INSERT OR IGNORE INTO pattern_violations (pattern_id, violation_id) VALUES (?, ?)').run(patternId, violationId)
  }

  listPatterns() {
    const patterns = this.db.prepare('SELECT * FROM patterns ORDER BY frequency DESC').all()
    return patterns.map((p) => {
      try { if (p.description) p.description = this.decrypt(p.description) } catch {}
      // Attach violations
      const pvs = this.db.prepare(`
        SELECT v.* FROM violations v
        JOIN pattern_violations pv ON pv.violation_id = v.id
        WHERE pv.pattern_id = ?
      `).all(p.id)
      p.violations = pvs.map((v) => {
        try { if (v.description) v.description = this.decrypt(v.description) } catch {}
        return v
      })
      return p
    })
  }

  // Embeddings
  insertEmbedding(emb) {
    const stmt = this.db.prepare(`
      INSERT INTO embeddings (document_id, chunk_index, chunk_text, embedding)
      VALUES (?, ?, ?, ?)
    `)
    const text = emb.chunk_text ? this.encrypt(emb.chunk_text) : null
    stmt.run(emb.document_id, emb.chunk_index, text, emb.embedding)
  }

  listEmbeddings() {
    const embs = this.db.prepare('SELECT * FROM embeddings').all()
    return embs.map((e) => {
      try { if (e.chunk_text) e.chunk_text = this.decrypt(e.chunk_text) } catch {}
      return e
    })
  }

  // Outlines
  saveOutline(outlineJson) {
    const encrypted = this.encrypt(JSON.stringify(outlineJson))
    const existing = this.db.prepare('SELECT id FROM outlines ORDER BY id DESC LIMIT 1').get()
    if (existing) {
      this.db.prepare(`UPDATE outlines SET outline_json = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(encrypted, existing.id)
    } else {
      this.db.prepare('INSERT INTO outlines (outline_json) VALUES (?)').run(encrypted)
    }
  }

  getOutline() {
    const row = this.db.prepare('SELECT * FROM outlines ORDER BY id DESC LIMIT 1').get()
    if (!row) return null
    try {
      return JSON.parse(this.decrypt(row.outline_json))
    } catch {
      return null
    }
  }

  // Stats
  getStorageStats() {
    const docCount = this.db.prepare('SELECT COUNT(*) as count FROM documents').get()
    const { size } = require('fs').statSync(this.dbPath)
    return {
      documentCount: docCount.count,
      dbSize: (size / 1048576).toFixed(1) + ' MB'
    }
  }
}

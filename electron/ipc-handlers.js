import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron'
import { IPC } from './ipc-channels.js'
import { loadConfig, saveConfig } from './services/config.js'
import { DatabaseService } from './services/database.js'
import { DocumentIngester } from './services/document-ingester.js'
import { JudgmentParser } from './services/judgment-parser.js'
import { TimelineBuilder } from './services/timeline-builder.js'
import { PatternDetector } from './services/pattern-detector.js'
import { OutlineGenerator } from './services/outline-generator.js'
import { EmbeddingsService } from './services/embeddings.js'
import { CommunicationAnalyzer } from './services/communication-analyzer.js'
import { FileWatcher } from './services/file-watcher.js'
import { ollama } from './services/ollama.js'
import { aiProvider, PROVIDERS } from './services/ai-provider.js'
import { basename, extname } from 'path'
import { statSync } from 'fs'

let db = null
let fileWatcher = null

function sendToRenderer(channel, data) {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) {
    wins[0].webContents.send(channel, data)
  }
}

export function getDb() {
  return db
}

export function registerIpcHandlers() {
  // ── Config ──
  ipcMain.handle(IPC.CONFIG_LOAD, async () => loadConfig())

  ipcMain.handle(IPC.CONFIG_SAVE, async (_event, config) => {
    saveConfig(config)
    return { success: true }
  })

  // ── Folder select ──
  ipcMain.handle(IPC.FOLDER_SELECT, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('folder:select-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'docx', 'doc', 'xlsx', 'csv', 'txt', 'eml'] }
      ]
    })
    if (result.canceled) return null
    return result.filePaths.map((p) => {
      const stat = statSync(p)
      return { name: basename(p), path: p, size: stat.size, type: '' }
    })
  })

  // ── AI Provider ──
  ipcMain.handle('ai:get-config', async () => {
    return { ...aiProvider.getConfig(), providers: PROVIDERS }
  })

  ipcMain.handle('ai:set-config', async (_event, config) => {
    aiProvider.setConfig(config)
    return { success: true }
  })

  ipcMain.handle('ai:test-connection', async () => {
    try {
      const connected = await aiProvider.isConnected()
      return { connected, provider: aiProvider.getConfig().provider }
    } catch {
      return { connected: false }
    }
  })

  // ── Ollama ──
  ipcMain.handle(IPC.OLLAMA_STATUS, async () => {
    try {
      const connected = await ollama.isConnected()
      const models = connected ? await ollama.listModels() : []
      return { connected, models }
    } catch {
      return { connected: false, models: [] }
    }
  })

  ipcMain.handle(IPC.OLLAMA_MODELS, async () => {
    try {
      return await ollama.listModels()
    } catch {
      return []
    }
  })

  ipcMain.handle('ollama:pull', async (_event, modelName) => {
    try {
      const res = await fetch('http://localhost:11434/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: false })
      })
      if (!res.ok) throw new Error(`Pull failed: ${res.status}`)
      await res.json()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('shell:open-external', async (_event, url) => {
    await shell.openExternal(url)
  })

  // ── Passphrase & DB ──
  ipcMain.handle(IPC.PASSPHRASE_SETUP, async (_event, passphrase) => {
    try {
      db = new DatabaseService(app.getPath('userData'))
      db.initialize(passphrase)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC.DB_UNLOCK, async (_event, passphrase) => {
    try {
      db = new DatabaseService(app.getPath('userData'))
      const unlocked = db.unlock(passphrase)
      if (unlocked) {
        // Start file watcher if configured
        const config = loadConfig()
        if (config?.folderPath) {
          startFileWatcher(config.folderPath)
        }
      }
      return { success: unlocked }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle(IPC.DB_LOCK, async () => {
    if (fileWatcher) {
      fileWatcher.stop()
      fileWatcher = null
    }
    if (db) {
      db.lock()
      db = null
    }
    return { success: true }
  })

  ipcMain.handle(IPC.DB_STATUS, async () => {
    return { unlocked: db !== null && db.isUnlocked() }
  })

  ipcMain.handle(IPC.PASSPHRASE_CHANGE, async (_event, { oldPass, newPass }) => {
    try {
      if (!db || !db.isUnlocked()) return { success: false, error: 'Database not unlocked' }
      // Verify old passphrase
      const testDb = new DatabaseService(app.getPath('userData'))
      const valid = testDb.unlock(oldPass)
      testDb.lock()
      if (!valid) return { success: false, error: 'Current passphrase is incorrect' }
      // Re-initialize with new passphrase (re-encrypts test value)
      db.lock()
      db = new DatabaseService(app.getPath('userData'))
      db.initialize(newPass)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ── Documents ──
  ipcMain.handle(IPC.DOCUMENTS_LIST, async () => {
    if (!db?.isUnlocked()) return []
    return db.listDocuments()
  })

  ipcMain.handle(IPC.DOCUMENTS_GET, async (_event, id) => {
    if (!db?.isUnlocked()) return null
    return db.getDocument(id)
  })

  ipcMain.handle(IPC.DOCUMENTS_INGEST, async (_event, fileInfo) => {
    if (!db?.isUnlocked()) return { success: false, error: 'Database locked' }
    const ingester = new DocumentIngester(db, (progress) => {
      sendToRenderer(IPC.DOCUMENTS_PROGRESS, progress)
    })
    return await ingester.ingest(fileInfo)
  })

  // Fast register — just saves to DB instantly
  ipcMain.handle('documents:register', async (_event, fileInfo) => {
    if (!db?.isUnlocked()) return { success: false, error: 'Database locked' }
    const ingester = new DocumentIngester(db, () => {})
    return ingester.register(fileInfo)
  })

  // Process a single document (text extraction + AI classification)
  ipcMain.handle('documents:process', async (_event, docId) => {
    if (!db?.isUnlocked()) return { success: false, error: 'Database locked' }
    const ingester = new DocumentIngester(db, (progress) => {
      sendToRenderer(IPC.DOCUMENTS_PROGRESS, progress)
    })
    return await ingester.process(docId)
  })

  ipcMain.handle(IPC.DOCUMENTS_DELETE, async (_event, id) => {
    if (!db?.isUnlocked()) return { success: false }
    db.deleteDocument(id)
    return { success: true }
  })

  ipcMain.handle(IPC.DOCUMENTS_UPDATE, async (_event, { id, ...updates }) => {
    if (!db?.isUnlocked()) return { success: false }
    db.updateDocument(id, updates)
    return { success: true }
  })

  // ── Judgment & Obligations ──
  ipcMain.handle(IPC.JUDGMENT_PARSE, async (_event, documentId) => {
    if (!db?.isUnlocked()) return { error: 'Database locked' }
    const parser = new JudgmentParser(db, (progress) => {
      sendToRenderer(IPC.JUDGMENT_PROGRESS, progress)
    })
    return await parser.parse(documentId)
  })

  ipcMain.handle(IPC.OBLIGATIONS_LIST, async () => {
    if (!db?.isUnlocked()) return []
    return db.listObligations()
  })

  ipcMain.handle(IPC.OBLIGATIONS_UPDATE, async (_event, { id, ...updates }) => {
    if (!db?.isUnlocked()) return { success: false }
    db.updateObligation(id, updates)
    return { success: true }
  })

  ipcMain.handle('issues:suggest', async () => {
    if (!db?.isUnlocked()) return { issues: [], error: 'Database locked' }
    const parser = new JudgmentParser(db, (progress) => {
      sendToRenderer(IPC.JUDGMENT_PROGRESS, progress)
    })
    return await parser.suggestKeyIssues()
  })

  ipcMain.handle('obligations:insert', async (_event, issue) => {
    if (!db?.isUnlocked()) return { success: false, error: 'Database locked' }
    const id = db.insertObligation({
      document_id: null,
      section_id: 'Key Issue',
      section_letter: issue.category || 'General',
      obligation_text: issue.text,
      responsible_party: issue.responsible_party || 'Both',
      category: issue.category || 'Other'
    })
    return { success: true, id }
  })

  ipcMain.handle('obligations:delete', async (_event, id) => {
    if (!db?.isUnlocked()) return { success: false, error: 'Database locked' }
    db.db.prepare('DELETE FROM obligations WHERE id = ?').run(id)
    return { success: true }
  })

  // ── Timeline ──
  ipcMain.handle(IPC.TIMELINE_BUILD, async () => {
    if (!db?.isUnlocked()) return { error: 'Database locked' }
    const builder = new TimelineBuilder(db, (progress) => {
      sendToRenderer(IPC.TIMELINE_PROGRESS, progress)
    })
    return await builder.build()
  })

  ipcMain.handle(IPC.TIMELINE_EVENTS, async () => {
    if (!db?.isUnlocked()) return []
    return db.listTimelineEvents()
  })

  // ── Violations & Patterns ──
  ipcMain.handle(IPC.VIOLATIONS_DETECT, async () => {
    if (!db?.isUnlocked()) return { error: 'Database locked' }
    const detector = new PatternDetector(db, (progress) => {
      sendToRenderer(IPC.VIOLATIONS_PROGRESS, progress)
    })
    return await detector.detectViolations()
  })

  ipcMain.handle(IPC.VIOLATIONS_LIST, async () => {
    if (!db?.isUnlocked()) return []
    return db.listViolations()
  })

  ipcMain.handle(IPC.VIOLATIONS_UPDATE, async (_event, { id, ...updates }) => {
    if (!db?.isUnlocked()) return { success: false }
    db.updateViolation(id, updates)
    return { success: true }
  })

  ipcMain.handle(IPC.PATTERNS_GROUP, async () => {
    if (!db?.isUnlocked()) return { error: 'Database locked' }
    const detector = new PatternDetector(db, (progress) => {
      sendToRenderer(IPC.PATTERNS_PROGRESS, progress)
    })
    return await detector.groupPatterns()
  })

  ipcMain.handle(IPC.PATTERNS_LIST, async () => {
    if (!db?.isUnlocked()) return []
    return db.listPatterns()
  })

  // ── Outline ──
  ipcMain.handle(IPC.OUTLINE_GENERATE, async () => {
    if (!db?.isUnlocked()) return null
    const generator = new OutlineGenerator(db, (progress) => {
      sendToRenderer(IPC.OUTLINE_PROGRESS, progress)
    })
    return await generator.generate()
  })

  ipcMain.handle(IPC.OUTLINE_GET, async () => {
    if (!db?.isUnlocked()) return null
    return db.getOutline()
  })

  ipcMain.handle(IPC.OUTLINE_UPDATE, async (_event, outline) => {
    if (!db?.isUnlocked()) return { success: false }
    db.saveOutline(outline)
    return { success: true }
  })

  ipcMain.handle(IPC.OUTLINE_EXPORT, async () => {
    if (!db?.isUnlocked()) return null
    const generator = new OutlineGenerator(db, () => {})
    return await generator.exportDocx()
  })

  // ── Search ──
  ipcMain.handle(IPC.SEARCH_INDEX, async () => {
    if (!db?.isUnlocked()) return { error: 'Database locked' }
    const service = new EmbeddingsService(db, (progress) => {
      sendToRenderer(IPC.SEARCH_PROGRESS, progress)
    })
    await service.buildIndex()
    return { success: true }
  })

  ipcMain.handle(IPC.SEARCH_SEMANTIC, async (_event, query) => {
    if (!db?.isUnlocked()) return []
    const service = new EmbeddingsService(db, () => {})
    return await service.search(query)
  })

  // ── Communications ──
  ipcMain.handle(IPC.COMMS_ANALYZE, async () => {
    if (!db?.isUnlocked()) return null
    try {
      const analyzer = new CommunicationAnalyzer(db, (progress) => {
        sendToRenderer(IPC.COMMS_PROGRESS, progress)
      })
      return await analyzer.analyze()
    } catch (error) {
      console.error('Communication analysis failed:', error)
      return { error: error.message || 'Analysis failed' }
    }
  })

  ipcMain.handle(IPC.COMMS_RESULTS, async () => {
    return null
  })

  // ── File Watcher ──
  ipcMain.handle(IPC.WATCHER_START, async (_event, folderPath) => {
    startFileWatcher(folderPath)
    return { success: true }
  })

  ipcMain.handle(IPC.WATCHER_STOP, async () => {
    if (fileWatcher) {
      fileWatcher.stop()
      fileWatcher = null
    }
    return { success: true }
  })

  // ── Settings ──
  ipcMain.handle(IPC.STORAGE_STATS, async () => {
    if (!db?.isUnlocked()) return null
    try {
      return db.getStorageStats()
    } catch {
      return null
    }
  })

  ipcMain.handle(IPC.DATA_EXPORT, async () => {
    if (!db?.isUnlocked()) return null
    const result = await dialog.showSaveDialog({
      defaultPath: 'custodycase-export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled) return null
    const data = {
      documents: db.listDocuments(),
      obligations: db.listObligations(),
      events: db.listTimelineEvents(),
      violations: db.listViolations(),
      patterns: db.listPatterns(),
      outline: db.getOutline(),
      exportedAt: new Date().toISOString()
    }
    const { writeFileSync } = await import('fs')
    writeFileSync(result.filePath, JSON.stringify(data, null, 2))
    return result.filePath
  })

  ipcMain.handle('data:clear-case', async () => {
    if (!db?.isUnlocked()) return { success: false }
    db.db.exec(`
      DELETE FROM pattern_violations;
      DELETE FROM patterns;
      DELETE FROM violations;
      DELETE FROM timeline_events;
      DELETE FROM obligations;
      DELETE FROM embeddings;
      DELETE FROM outlines;
      DELETE FROM documents;
    `)
    return { success: true }
  })

  ipcMain.handle(IPC.DATA_DELETE, async () => {
    if (!db?.isUnlocked()) return { success: false }
    db.db.exec(`
      DELETE FROM pattern_violations;
      DELETE FROM patterns;
      DELETE FROM violations;
      DELETE FROM timeline_events;
      DELETE FROM obligations;
      DELETE FROM embeddings;
      DELETE FROM outlines;
      DELETE FROM documents;
    `)
    return { success: true }
  })
}

function startFileWatcher(folderPath) {
  if (fileWatcher) fileWatcher.stop()
  fileWatcher = new FileWatcher(async (filePath) => {
    if (!db?.isUnlocked()) return
    sendToRenderer(IPC.WATCHER_EVENT, { type: 'new-file', path: filePath })
    const { basename: bn, extname: en } = await import('path')
    const { statSync: ss } = await import('fs')
    const stat = ss(filePath)
    const ingester = new DocumentIngester(db, (progress) => {
      sendToRenderer(IPC.DOCUMENTS_PROGRESS, progress)
    })
    await ingester.ingest({
      name: bn(filePath),
      path: filePath,
      size: stat.size,
      type: ''
    })
  })
  fileWatcher.start(folderPath)
}

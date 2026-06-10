export const IPC = {
  // Onboarding & Config
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  FOLDER_SELECT: 'folder:select',

  // Database & Security
  DB_UNLOCK: 'db:unlock',
  DB_LOCK: 'db:lock',
  DB_STATUS: 'db:status',
  PASSPHRASE_SETUP: 'passphrase:setup',
  PASSPHRASE_CHANGE: 'passphrase:change',

  // Ollama
  OLLAMA_STATUS: 'ollama:status',
  OLLAMA_MODELS: 'ollama:models',
  OLLAMA_CHAT: 'ollama:chat',
  OLLAMA_EMBED: 'ollama:embed',

  // Documents
  DOCUMENTS_LIST: 'documents:list',
  DOCUMENTS_INGEST: 'documents:ingest',
  DOCUMENTS_GET: 'documents:get',
  DOCUMENTS_DELETE: 'documents:delete',
  DOCUMENTS_UPDATE: 'documents:update',
  DOCUMENTS_PROGRESS: 'documents:progress',

  // Judgment & Obligations
  JUDGMENT_PARSE: 'judgment:parse',
  JUDGMENT_PROGRESS: 'judgment:progress',
  OBLIGATIONS_LIST: 'obligations:list',
  OBLIGATIONS_UPDATE: 'obligations:update',

  // Timeline
  TIMELINE_BUILD: 'timeline:build',
  TIMELINE_EVENTS: 'timeline:events',
  TIMELINE_PROGRESS: 'timeline:progress',

  // Violations & Patterns
  VIOLATIONS_DETECT: 'violations:detect',
  VIOLATIONS_LIST: 'violations:list',
  VIOLATIONS_UPDATE: 'violations:update',
  VIOLATIONS_PROGRESS: 'violations:progress',
  PATTERNS_GROUP: 'patterns:group',
  PATTERNS_LIST: 'patterns:list',
  PATTERNS_PROGRESS: 'patterns:progress',

  // Outline
  OUTLINE_GENERATE: 'outline:generate',
  OUTLINE_GET: 'outline:get',
  OUTLINE_UPDATE: 'outline:update',
  OUTLINE_EXPORT: 'outline:export',
  OUTLINE_PROGRESS: 'outline:progress',

  // Search
  SEARCH_SEMANTIC: 'search:semantic',
  SEARCH_INDEX: 'search:index',
  SEARCH_PROGRESS: 'search:progress',

  // Communications
  COMMS_ANALYZE: 'comms:analyze',
  COMMS_RESULTS: 'comms:results',
  COMMS_PROGRESS: 'comms:progress',

  // File Watcher
  WATCHER_START: 'watcher:start',
  WATCHER_STOP: 'watcher:stop',
  WATCHER_EVENT: 'watcher:event',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  STORAGE_STATS: 'storage:stats',
  DATA_EXPORT: 'data:export',
  DATA_DELETE: 'data:delete'
}

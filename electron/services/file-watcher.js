import { watch } from 'chokidar'
import { extname } from 'path'

const SUPPORTED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp',
  '.docx', '.doc', '.xlsx', '.csv', '.txt', '.eml'
]

export class FileWatcher {
  constructor(onNewFile) {
    this.watcher = null
    this.onNewFile = onNewFile
  }

  start(folderPath) {
    if (this.watcher) this.stop()

    this.watcher = watch(folderPath, {
      ignoreInitial: true,
      depth: 2,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    })

    this.watcher.on('add', (filePath) => {
      const ext = extname(filePath).toLowerCase()
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        this.onNewFile(filePath)
      }
    })
  }

  stop() {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }
}

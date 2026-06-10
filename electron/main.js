import { app, BrowserWindow, session, powerSaveBlocker, ipcMain } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers.js'

let mainWindow = null
let powerSaveId = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url = new URL(details.url)
    const allowedHosts = [
      'localhost', '127.0.0.1',
      // Cloud AI providers (only used when explicitly configured by user)
      'api.openai.com',
      'api.anthropic.com',
      'api.x.ai'
    ]
    const allowed =
      url.protocol === 'file:' ||
      allowedHosts.includes(url.hostname)
    if (!allowed) {
      callback({ cancel: true })
      return
    }
    callback({ requestHeaders: details.requestHeaders })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Prevent system sleep while processing
ipcMain.handle('power:keep-awake', () => {
  if (powerSaveId === null) {
    powerSaveId = powerSaveBlocker.start('prevent-app-suspension')
  }
  return { active: true }
})

ipcMain.handle('power:allow-sleep', () => {
  if (powerSaveId !== null) {
    powerSaveBlocker.stop(powerSaveId)
    powerSaveId = null
  }
  return { active: false }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

export { mainWindow }

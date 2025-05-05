import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import path from 'path'

// development環境かどうかを判断
const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true'

// グローバル変数としてmainWindowを定義
let mainWindow = null

function createWindow() {
  // BrowserWindowインスタンスを作成
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'JSON Grid Viewer',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // コンソールを開く（デバッグ用）
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 開発環境と本番環境でのURL/ファイル読み込み
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // ファイルがアプリにドロップされたときの処理
  app.on('will-finish-launching', () => {
    app.on('open-file', (event, path) => {
      event.preventDefault()
      if (mainWindow) {
        mainWindow.webContents.send('file-opened', path)
      }
    })
  })
}

// ウィンドウタイトル設定のためのIPC通信を処理（グローバルスコープに移動）
ipcMain.on('set-window-title', (event, filePath) => {
  if (mainWindow && filePath) {
    const fileName = path.basename(filePath)
    mainWindow.setTitle(`JSON Grid Viewer - ${fileName}`)
  } else if (mainWindow) {
    mainWindow.setTitle('JSON Grid Viewer')
  } else {
    console.error('mainWindow is not available when trying to set title')
  }
})

// ファイル読み込みハンドラー
ipcMain.handle('read-file', (event, filePath) => {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8')
    return fileContent
  } catch (error) {
    console.error('Error reading file:', error)
    throw error
  }
})

// アプリケーション初期化
app.whenReady().then(() => {
  // electronAppの代わりに直接アプリIDを設定
  app.setAppUserModelId('com.electron.json-viewer')

  // ドラッグ&ドロップ関連のIPCハンドラー
  ipcMain.on('ondragstart', (event, filePath) => {
    event.sender.startDrag({
      file: filePath
    })
  })

  ipcMain.on('ondrop', (event, filePath) => {
    event.sender.send('ondrop', filePath)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

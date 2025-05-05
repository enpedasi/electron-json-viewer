import { contextBridge, ipcRenderer } from 'electron'
// @electron-toolkit/preloadが原因でエラーが発生しているため、直接必要な機能だけを実装
// import { electronAPI } from '@electron-toolkit/preload'

// 必要最低限の機能だけを定義
const electronAPI = {
  platform: process.platform
}

const api = {
  onDrop: (callback) =>
    ipcRenderer.on('ondrop', (event, filePath) => {
      callback(event, filePath)
    }),
  readFile: async (filePath) => {
    return await ipcRenderer.invoke('read-file', filePath)
  },
  handleFileOpen: (callback) => ipcRenderer.on('file-opened', callback),
  // ウィンドウタイトルを設定する関数
  setWindowTitle: (filePath) => {
    ipcRenderer.send('set-window-title', filePath)
  },
  // ファイルのドラッグ&ドロップを処理する専用関数
  handleFileDrop: async (filePath) => {
    // ファイルパスをメインプロセスに送信し、タイトル更新を要求
    ipcRenderer.send('set-window-title', filePath)
    // ファイルの内容を読み込む
    return await ipcRenderer.invoke('read-file', filePath)
  }
}

// contextIsolation が有効な場合（推奨）
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', { ...electronAPI, ...api })
  } catch (error) {
    console.error('contextBridge error:', error)
  }
} else {
  // contextIsolation が無効な場合（非推奨）
  window.electron = { ...electronAPI, ...api }
}

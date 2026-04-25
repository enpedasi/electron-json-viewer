import { contextBridge, ipcRenderer, webUtils } from 'electron'
// @electron-toolkit/preloadが原因でエラーが発生しているため、直接必要な機能だけを実装
// import { electronAPI } from '@electron-toolkit/preload'

// 必要最低限の機能だけを定義
const electronAPI = {
  platform: process.platform
}

const api = {
  onDrop: (callback) => {
    const listener = (event, filePath) => callback(event, filePath)
    ipcRenderer.on('ondrop', listener)
    return () => ipcRenderer.removeListener('ondrop', listener)
  },
  readFile: async (filePath) => {
    return await ipcRenderer.invoke('read-file', filePath)
  },
  handleFilesOpen: (callback) => {
    const listener = (event, filePaths) => callback(event, filePaths)
    ipcRenderer.on('files-opened', listener)
    return () => ipcRenderer.removeListener('files-opened', listener)
  },
  setWindowTitle: (filePath) => {
    ipcRenderer.send('set-window-title', filePath)
  },
  handleFileDrop: async (filePath) => {
    ipcRenderer.send('set-window-title', filePath)
    return await ipcRenderer.invoke('read-file', filePath)
  },
  saveJsonFile: async ({ filePath, defaultPath, content }) => {
    return await ipcRenderer.invoke('save-json-file', { filePath, defaultPath, content })
  },
  showUnsavedDialog: async ({ fileName }) => {
    return await ipcRenderer.invoke('show-unsaved-dialog', { fileName })
  },
  onShowSearch: (callback) => {
    const listener = () => callback()
    ipcRenderer.on('show-search', listener)
    return () => ipcRenderer.removeListener('show-search', listener)
  }
}

window.addEventListener(
  'dragover',
  (e) => {
    e.preventDefault()
  },
  true
)

window.addEventListener(
  'drop',
  (e) => {
    e.preventDefault()

    const files = e.dataTransfer.files
    const filePaths = []
    if (files.length > 0) {
      for (const file of files) {
        try {
          const filePath = webUtils.getPathForFile(file)
          if (filePath) {
            filePaths.push(filePath)
          }
        } catch (error) {
          console.error('Error getting path for file:', error)
        }
      }
    }

    if (filePaths.length > 0) {
      ipcRenderer.send('file-dropped', filePaths)
    }
  },
  true
) // キャプチャフェーズで確実に捕捉

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

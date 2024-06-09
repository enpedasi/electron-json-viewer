import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// console.log('Preload script is loaded')

const api = {
  onDrop: (callback) =>
    ipcRenderer.on('ondrop', (event, filePath) => {
      callback(event, filePath)
    }),
  readFile: async (filePath) => {
    return await ipcRenderer.invoke('read-file', filePath)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', { ...electronAPI, ...api })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = { ...electronAPI, ...api }
}

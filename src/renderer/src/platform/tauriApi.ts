import type { DesktopApi } from './types'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { save } from '@tauri-apps/plugin-dialog'
import { platform } from '@tauri-apps/plugin-os'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

export const tauriApi: DesktopApi = {
  platform: platform(),

  async readFile(filePath: string): Promise<string> {
    return await readTextFile(filePath)
  },

  async saveJsonFile(opts) {
    let targetPath = opts.filePath
    if (!targetPath) {
      const selected = await save({
        defaultPath: opts.defaultPath || 'untitled.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (!selected) return { canceled: true }
      targetPath = selected
    }
    await writeTextFile(targetPath, opts.content)
    return { canceled: false, filePath: targetPath }
  },

  async showUnsavedDialog(opts) {
    const response: number = await invoke('show_unsaved_dialog', {
      fileName: opts.fileName
    })
    return { response }
  },

  async setWindowTitle(filePath: string | null): Promise<void> {
    const appWindow = getCurrentWebviewWindow()
    if (filePath) {
      const sep = platform() === 'windows' ? '\\' : '/'
      const fileName = filePath.substring(filePath.lastIndexOf(sep) + 1)
      await appWindow.setTitle(`JSON Grid Viewer - ${fileName}`)
    } else {
      await appWindow.setTitle('JSON Grid Viewer')
    }
  },

  handleFilesOpen(callback) {
    let unlistenDragDrop: (() => void) | undefined
    let unlistenFilesOpened: (() => void) | undefined

    getCurrentWebviewWindow()
      .onDragDropEvent((event) => {
        if (event.payload.type === 'drop') {
          callback(event, event.payload.paths)
        }
      })
      .then((fn) => {
        unlistenDragDrop = fn
      })

    listen<string[]>('files-opened', (event) => {
      callback(event, event.payload)
    }).then((fn) => {
      unlistenFilesOpened = fn
    })

    return () => {
      unlistenDragDrop?.()
      unlistenFilesOpened?.()
    }
  },

  onShowSearch(_callback) {
    return undefined
  }
}

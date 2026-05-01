import type { DesktopApi } from './types'

function getElectron(): any {
  return (window as any).electron
}

export const electronApi: DesktopApi = {
  platform: getElectron()?.platform,

  async readFile(filePath: string): Promise<string> {
    return await getElectron().readFile(filePath)
  },

  async saveJsonFile(opts) {
    return await getElectron().saveJsonFile(opts)
  },

  async showUnsavedDialog(opts) {
    return await getElectron().showUnsavedDialog(opts)
  },

  setWindowTitle(filePath: string | null): void {
    getElectron()?.setWindowTitle(filePath)
  },

  handleFilesOpen(callback) {
    return getElectron()?.handleFilesOpen(callback)
  },

  onShowSearch(callback) {
    return getElectron()?.onShowSearch(callback)
  }
}

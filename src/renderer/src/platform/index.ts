import type { DesktopApi } from './types'

const w = window as any

function createElectronApi(): DesktopApi {
  const e = w.electron
  return {
    platform: e?.platform,
    readFile: (fp) => e.readFile(fp),
    saveJsonFile: (opts) => e.saveJsonFile(opts),
    showUnsavedDialog: (opts) => e.showUnsavedDialog(opts),
    setWindowTitle: (fp) => e?.setWindowTitle(fp),
    handleFilesOpen: (cb) => e?.handleFilesOpen(cb),
    onShowSearch: (cb) => e?.onShowSearch(cb)
  }
}

let _api: DesktopApi | null = null

if (w.electron) {
  _api = createElectronApi()
}

export function getDesktopApi(): DesktopApi | null {
  return _api
}

export async function initTauriApi(): Promise<void> {
  if (_api) return
  const { tauriApi } = await import('./tauriApi')
  _api = tauriApi
}

import type { DesktopApi } from './types'

let _api: DesktopApi | null = null

export function getDesktopApi(): DesktopApi | null {
  return _api
}

export async function initTauriApi(): Promise<void> {
  if (_api) return
  const { tauriApi } = await import('./tauriApi')
  _api = tauriApi
}

export interface DesktopApi {
  platform: string | undefined
  readFile(filePath: string): Promise<string>
  saveJsonFile(opts: {
    filePath?: string | null
    defaultPath?: string
    content: string
  }): Promise<{ canceled: boolean; filePath?: string }>
  showUnsavedDialog(opts: { fileName: string }): Promise<{ response: number }>
  setWindowTitle(filePath: string | null): void
  handleFilesOpen(callback: (event: unknown, filePaths: string[]) => void): (() => void) | undefined
  onShowSearch(callback: () => void): (() => void) | undefined
}

export interface FileOpenTab {
  id: string
  filePath: string | null
  jsonData: unknown
  isDirty: boolean
}

export interface OpenFileRequest {
  filePath: string
  tabId: string
}

export interface OpenFilesPlan<Tab extends FileOpenTab> {
  tabs: Tab[]
  activeTabId: string | null
  filesToLoad: OpenFileRequest[]
}

interface PlanOpenedFilesOptions<Tab extends FileOpenTab> {
  tabs: Tab[]
  filePaths: string[]
  createTab: (filePath: string) => Tab
  prepareTabForFile: (tab: Tab, filePath: string) => Tab
}

export function planOpenedFiles<Tab extends FileOpenTab>({
  tabs,
  filePaths,
  createTab,
  prepareTabForFile
}: PlanOpenedFilesOptions<Tab>): OpenFilesPlan<Tab> {
  let nextTabs = tabs
  let activeTabId: string | null = null
  const filesToLoad: OpenFileRequest[] = []
  const openedInBatch = new Set<string>()

  filePaths.forEach((filePath, index) => {
    if (openedInBatch.has(filePath)) {
      const existingTab = nextTabs.find((tab) => tab.filePath === filePath)
      if (index === 0 && existingTab) activeTabId = existingTab.id
      return
    }

    openedInBatch.add(filePath)

    const existingTab = nextTabs.find((tab) => tab.filePath === filePath)
    if (existingTab) {
      if (index === 0) activeTabId = existingTab.id
      return
    }

    const emptyUntitled =
      index === 0
        ? nextTabs.find((tab) => tab.filePath === null && tab.jsonData === null && !tab.isDirty)
        : undefined

    if (emptyUntitled) {
      const preparedTab = prepareTabForFile(emptyUntitled, filePath)
      nextTabs = nextTabs.map((tab) => (tab.id === emptyUntitled.id ? preparedTab : tab))
      filesToLoad.push({ filePath, tabId: preparedTab.id })
      activeTabId = preparedTab.id
      return
    }

    const newTab = createTab(filePath)
    nextTabs = [...nextTabs, newTab]
    filesToLoad.push({ filePath, tabId: newTab.id })
    if (index === 0) activeTabId = newTab.id
  })

  return { tabs: nextTabs, activeTabId, filesToLoad }
}

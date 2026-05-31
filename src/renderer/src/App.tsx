import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import TabsComponent from './components/Tabs/TabsComponent'
import JsonViewComponent from './components/JsonView/JsonViewComponent'
import { v4 as uuidv4 } from 'uuid'
import {
  setValueByPath,
  deleteByPath,
  addPropertyByPath,
  addArrayItemByPath,
  renameKeyByPath,
  applyOperation,
  invertOperation,
  getValueByPath
} from './components/Cell/CellUtils'
import {
  detectFileType,
  parseContent,
  serializeData,
  validateText,
  defaultFileName,
  FileType
} from './components/Cell/FileUtils'
import { getDesktopApi, initTauriApi } from './platform'

export type ViewMode = 'grid' | 'text'
export type EditMode = 'view' | 'edit'

export interface HistoryEntry {
  op: DataOperation
  inverseOp: DataOperation
}

export interface DataOperation {
  type: 'set' | 'delete' | 'add' | 'rename'
  path: string
  value?: any
  key?: string
  newKey?: string
}

export interface TabState {
  id: string
  filePath: string | null
  fileName: string
  jsonData: any
  searchQuery: string
  searchResults: Array<{ path: string; value: any }>
  currentResultIndex: number
  mode: EditMode
  isDirty: boolean
  history: { undo: HistoryEntry[]; redo: HistoryEntry[] }
  viewMode: ViewMode
  fileType: FileType
  originalContent: string
}

const MAX_HISTORY = 100

function App() {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)

  const getFileName = (path: string | null): string => {
    if (!path) return 'Untitled'
    try {
      const api = getDesktopApi()
      if (api?.platform) {
        const separator = api.platform === 'win32' ? '\\' : '/'
        return path.substring(path.lastIndexOf(separator) + 1)
      }
      return path.substring(path.lastIndexOf('/') + 1)
    } catch (e) {
      console.error('Error getting file name:', e)
      return 'Untitled'
    }
  }

  const updateTabData = useCallback((tabId: string, updates: Partial<Omit<TabState, 'id'>>) => {
    setTabs((prevTabs) => prevTabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)))
  }, [])

  // --- アクティブなタブの取得 ---
  const activeTabData = tabs.find((tab) => tab.id === activeTabId)

  // --- タブ操作 ---
  const addTab = useCallback(
    (filePath: string | null = null, data: any = null, makeActive = true): string => {
      const newTabId = uuidv4()
      const fileName = getFileName(filePath)
      const newTab: TabState = {
        id: newTabId,
        filePath: filePath,
        fileName: fileName,
        jsonData: data,
        searchQuery: '',
        searchResults: [],
        currentResultIndex: -1,
        mode: 'view',
        isDirty: false,
        history: { undo: [], redo: [] },
        viewMode: 'grid',
        fileType: filePath ? detectFileType(filePath) : 'json',
        originalContent:
          data !== null ? serializeData(data, filePath ? detectFileType(filePath) : 'json') : ''
      }
      setTabs((prevTabs) => [...prevTabs, newTab])
      if (makeActive || tabs.length === 0) {
        setActiveTabId(newTabId)
      }
      return newTabId
    },
    [tabs.length]
  )

  // --- 保存 ---
  const handleSave = useCallback(
    async (tabId?: string): Promise<boolean> => {
      const targetId = tabId || activeTabId
      if (!targetId) return false
      const tab = tabs.find((t) => t.id === targetId)
      if (!tab || !tab.jsonData) return false

      try {
        const content = serializeData(tab.jsonData, tab.fileType)
        const result = await getDesktopApi()?.saveJsonFile({
          filePath: tab.filePath,
          defaultPath: tab.fileName || defaultFileName(tab.fileType),
          content
        })
        if (!result || result.canceled) return false

        const newFileName = getFileName(result.filePath)
        const newFileType = detectFileType(result.filePath)
        setTabs((prevTabs) =>
          prevTabs.map((t) => {
            if (t.id !== targetId) return t
            return {
              ...t,
              filePath: result.filePath,
              fileName: newFileName,
              fileType: newFileType,
              isDirty: false,
              originalContent: content
            }
          })
        )
        return true
      } catch (error) {
        console.error('Error saving file:', error)
        return false
      }
    },
    [tabs, activeTabId]
  )

  const closeTabWithCheck = useCallback(
    async (tabIdToClose: string) => {
      const tab = tabs.find((t) => t.id === tabIdToClose)
      if (!tab) return

      if (tab.isDirty) {
        const result = await getDesktopApi()?.showUnsavedDialog({ fileName: tab.fileName })
        if (result.response === 0) {
          const saved = await handleSave(tabIdToClose)
          if (!saved) return
        } else if (result.response === 2) {
          return
        }
      }

      setTabs((prevTabs) => {
        const indexToClose = prevTabs.findIndex((t) => t.id === tabIdToClose)
        if (indexToClose === -1) return prevTabs
        const newTabs = prevTabs.filter((t) => t.id !== tabIdToClose)
        if (activeTabId === tabIdToClose) {
          if (newTabs.length === 0) {
            setActiveTabId(null)
          } else {
            const newActiveIndex = Math.max(0, indexToClose - 1)
            setActiveTabId(
              newTabs[newActiveIndex < newTabs.length ? newActiveIndex : newTabs.length - 1]?.id ||
                null
            )
          }
        }
        return newTabs
      })
    },
    [tabs, activeTabId, handleSave]
  )

  // --- ファイル処理 ---
  const loadFileIntoTab = useCallback(
    async (filePath: string, tabId: string) => {
      const existingTab = tabs.find((t) => t.id === tabId)
      if (existingTab && existingTab.jsonData) {
        console.log(`Tab ${tabId} already has data for ${filePath}`)
        return
      }
      try {
        let fileContent
        const api = getDesktopApi()
        if (api && api.readFile) {
          fileContent = await api.readFile(filePath)
        } else {
          console.warn('readFile not available and not in Electron context.')
          updateTabData(tabId, {
            jsonData: { error: `Cannot read file outside Electron environment.` },
            filePath: filePath,
            fileName: `Error - ${getFileName(filePath)}`
          })
          return
        }
        const fileType = detectFileType(filePath)
        const parsed = parseContent(fileContent, fileType)
        const fileName = getFileName(filePath)
        updateTabData(tabId, {
          jsonData: parsed,
          filePath: filePath,
          fileName: fileName,
          fileType: fileType,
          originalContent: serializeData(parsed, fileType)
        })
      } catch (error: any) {
        console.error('Error loading file into tab:', filePath, error)
        const fileName = getFileName(filePath)
        updateTabData(tabId, {
          jsonData: { error: `Failed to load or parse: ${error.message || error}` },
          filePath: filePath,
          fileName: `Error - ${fileName}`
        })
      }
    },
    [updateTabData, tabs]
  )

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // --- 編集モード切替 ---
  const toggleEditMode = useCallback(() => {
    if (!activeTabId) return
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab
        return { ...tab, mode: tab.mode === 'view' ? 'edit' : 'view' }
      })
    )
  }, [activeTabId])

  const toggleViewMode = useCallback(() => {
    if (!activeTabId) return
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab
        return { ...tab, viewMode: tab.viewMode === 'grid' ? 'text' : 'grid' }
      })
    )
  }, [activeTabId])

  // --- Undo/Redo ---
  const handleUndo = useCallback(() => {
    if (!activeTabId) return
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId || tab.history.undo.length === 0) return tab
        const [latest, ...restUndo] = tab.history.undo
        const newJson = applyOperation(tab.jsonData, latest.inverseOp)
        const redo = [latest, ...tab.history.redo].slice(0, MAX_HISTORY)
        return {
          ...tab,
          jsonData: newJson,
          history: { undo: restUndo, redo },
          isDirty: restUndo.length > 0
        }
      })
    )
  }, [activeTabId])

  const handleRedo = useCallback(() => {
    if (!activeTabId) return
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId || tab.history.redo.length === 0) return tab
        const [latest, ...restRedo] = tab.history.redo
        const newJson = applyOperation(tab.jsonData, latest.op)
        const undo = [latest, ...tab.history.undo].slice(0, MAX_HISTORY)
        return { ...tab, jsonData: newJson, history: { undo, redo: restRedo }, isDirty: true }
      })
    )
  }, [activeTabId])

  // --- データ変更ハンドラ ---
  const handleDataChange = useCallback(
    (path: string, newValue: any) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          const op: DataOperation = { type: 'set', path, value: newValue }
          const inverseOp = invertOperation(tab.jsonData, op)
          const newJson = applyOperation(tab.jsonData, op)
          const undo = [{ op, inverseOp }, ...tab.history.undo].slice(0, MAX_HISTORY)
          return { ...tab, jsonData: newJson, history: { undo, redo: [] }, isDirty: true }
        })
      )
    },
    [activeTabId]
  )

  const handleDelete = useCallback(
    (path: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          const op: DataOperation = { type: 'delete', path }
          const inverseOp = invertOperation(tab.jsonData, op)
          const newJson = applyOperation(tab.jsonData, op)
          const undo = [{ op, inverseOp }, ...tab.history.undo].slice(0, MAX_HISTORY)
          return { ...tab, jsonData: newJson, history: { undo, redo: [] }, isDirty: true }
        })
      )
    },
    [activeTabId]
  )

  const handleAddProperty = useCallback(
    (path: string, key: string, value: any) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          const target = path ? getValueByPath(tab.jsonData, path) : tab.jsonData
          if (!target || typeof target !== 'object' || Array.isArray(target)) return tab
          const newTarget = { ...target, [key]: value }
          const newJson = path ? setValueByPath(tab.jsonData, path, newTarget) : newTarget
          const op: DataOperation = { type: 'add', path, key, value }
          const inverseOp: DataOperation = {
            type: 'delete',
            path: path ? `${path}.${key}` : `.${key}`
          }
          const undo = [{ op, inverseOp }, ...tab.history.undo].slice(0, MAX_HISTORY)
          return { ...tab, jsonData: newJson, history: { undo, redo: [] }, isDirty: true }
        })
      )
    },
    [activeTabId]
  )

  const handleAddArrayItem = useCallback(
    (path: string, value: any) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          const newJson = addArrayItemByPath(tab.jsonData, path, value)
          const op: DataOperation = { type: 'add', path, value }
          const target = path ? getValueByPath(tab.jsonData, path) : tab.jsonData
          const idx = Array.isArray(target) ? target.length : 0
          const inverseOp: DataOperation = { type: 'delete', path: `${path}[${idx}]` }
          const undo = [{ op, inverseOp }, ...tab.history.undo].slice(0, MAX_HISTORY)
          return { ...tab, jsonData: newJson, history: { undo, redo: [] }, isDirty: true }
        })
      )
    },
    [activeTabId]
  )

  const handleRenameKey = useCallback(
    (path: string, oldKey: string, newKey: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          const newJson = renameKeyByPath(tab.jsonData, path, oldKey, newKey)
          const op: DataOperation = { type: 'rename', path, key: oldKey, newKey }
          const inverseOp: DataOperation = { type: 'rename', path, key: newKey, newKey: oldKey }
          const undo = [{ op, inverseOp }, ...tab.history.undo].slice(0, MAX_HISTORY)
          return { ...tab, jsonData: newJson, history: { undo, redo: [] }, isDirty: true }
        })
      )
    },
    [activeTabId]
  )

  const handleTextEditorChange = useCallback(
    (newText: string) => {
      if (!activeTabId) return
      try {
        const parsed = validateText(newText, activeTabData?.fileType || 'json')
        setTabs((prevTabs) =>
          prevTabs.map((tab) => {
            if (tab.id !== activeTabId) return tab
            return { ...tab, jsonData: parsed, isDirty: true }
          })
        )
      } catch {
        // invalid content
      }
    },
    [activeTabId, activeTabData]
  )

  // --- 検索関連処理 ---
  const handleSearch = useCallback(() => {
    if (!activeTabData) return
    const results = searchJson(activeTabData.jsonData, activeTabData.searchQuery)
    updateTabData(activeTabData.id, {
      searchResults: results,
      currentResultIndex: results.length > 0 ? 0 : -1
    })
  }, [activeTabData, updateTabData])

  const handleNextResult = useCallback(() => {
    if (!activeTabData || activeTabData.searchResults.length === 0) return
    const nextIndex = (activeTabData.currentResultIndex + 1) % activeTabData.searchResults.length
    updateTabData(activeTabData.id, { currentResultIndex: nextIndex })
  }, [activeTabData, updateTabData])

  const clearSearch = useCallback(() => {
    if (!activeTabData) return
    updateTabData(activeTabData.id, { searchQuery: '', searchResults: [], currentResultIndex: -1 })
  }, [activeTabData, updateTabData])

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeTabData) return
      const query = e.target.value
      updateTabData(activeTabData.id, {
        searchQuery: query,
        searchResults: [],
        currentResultIndex: -1
      })
    },
    [activeTabData, updateTabData]
  )

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing || e.key !== 'Enter') return
      if (!activeTabData || !activeTabData.searchQuery) return
      if (activeTabData.searchResults.length > 0) {
        handleNextResult()
      } else {
        handleSearch()
      }
    },
    [activeTabData, handleSearch, handleNextResult]
  )

  const [apiReady, setApiReady] = useState(() => getDesktopApi() !== null)

  useEffect(() => {
    if (!apiReady && '__TAURI_INTERNALS__' in window) {
      initTauriApi().then(() => setApiReady(true))
    }
  }, [apiReady])

  useEffect(() => {
    if (tabs.length === 0) {
      addTab(null, null, true)
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    let removeFilesOpenListener: (() => void) | undefined
    const api = getDesktopApi()
    if (api?.handleFilesOpen) {
      removeFilesOpenListener = api.handleFilesOpen((event, filePaths) => {
        console.log('Files opened via event:', filePaths)
        filePaths.forEach((filePath, index) => {
          const existingTab = tabs.find((tab) => tab.filePath === filePath)
          if (existingTab) {
            setActiveTabId(existingTab.id)
            if (index === 0) {
              console.log(`Tab for ${filePath} already exists.`)
            }
          } else {
            const isFirstFile = index === 0
            const emptyUntitled = tabs.find(
              (t) => t.filePath === null && t.jsonData === null && !t.isDirty
            )
            if (isFirstFile && emptyUntitled) {
              loadFileIntoTab(filePath, emptyUntitled.id)
              setActiveTabId(emptyUntitled.id)
            } else {
              const makeActive = index === 0
              const newTabId = addTab(filePath, null, makeActive)
              loadFileIntoTab(filePath, newTabId)
            }
          }
        })
      })
    }

    let removeShowSearchListener: (() => void) | undefined
    if (api?.onShowSearch) {
      removeShowSearchListener = api.onShowSearch(() => {
        setSearchVisible(true)
      })
    }

    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
      if (removeFilesOpenListener && typeof removeFilesOpenListener === 'function') {
        removeFilesOpenListener()
      }
      if (removeShowSearchListener) {
        removeShowSearchListener()
      }
    }
  }, [addTab, handleDrop, loadFileIntoTab, tabs, apiReady])

  // --- キーボードショートカット ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.nativeEvent.isComposing) return
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
      }
      if (mod && e.key === 'y') {
        e.preventDefault()
        handleRedo()
      }
      if (mod && e.key === 'f') {
        e.preventDefault()
        setSearchVisible(true)
      }
      if (e.key === 'Escape' && searchVisible) {
        setSearchVisible(false)
        clearSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleUndo, handleRedo, searchVisible, clearSearch])

  // --- ウィンドウタイトル更新 ---
  useEffect(() => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId)
    const api = getDesktopApi()
    if (api?.setWindowTitle) {
      api.setWindowTitle(activeTab?.filePath ?? null)
    } else {
      document.title = activeTab ? activeTab.fileName : 'JSON Grid Viewer'
    }
  }, [activeTabId, tabs])

  // --- レンダリング ---
  return (
    <div className="app-container vscode-dark">
      <TabsComponent
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTabWithCheck}
        onAddTab={() => addTab(null, null, true)}
        onToggleEditMode={toggleEditMode}
        onToggleViewMode={toggleViewMode}
        activeTabMode={activeTabData?.mode || 'view'}
        activeTabViewMode={activeTabData?.viewMode || 'grid'}
      />
      <div className="json-view-area">
        {activeTabData ? (
          <JsonViewComponent
            key={activeTabData.id}
            tabData={activeTabData}
            searchVisible={searchVisible}
            onSearchVisibleChange={setSearchVisible}
            onSearchInputChange={handleSearchInputChange}
            onSearchKeyDown={handleSearchKeyDown}
            onSearchExecute={handleSearch}
            onNextResult={handleNextResult}
            onClearSearch={clearSearch}
            onDataChange={handleDataChange}
            onDelete={handleDelete}
            onAddProperty={handleAddProperty}
            onAddArrayItem={handleAddArrayItem}
            onRenameKey={handleRenameKey}
            onSave={() => handleSave()}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onTextEditorChange={handleTextEditorChange}
          />
        ) : (
          <div className="center-panel">
            {tabs.length > 0 ? (
              <p>タブを選択してください。</p>
            ) : (
              <p>
                ファイルを開くか、ドラッグ＆ドロップ、または「+」ボタンで新しいタブを開始してください。
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function searchJson(json: any, query: string) {
  const results: { path: string; value: any }[] = []
  const searchQuery = query.toLowerCase()
  const search = (obj: any, path = '') => {
    if (typeof obj === 'object' && obj !== null) {
      const currentDepth = path.split('.').length + path.split('[').length - 1
      if (currentDepth > 50) {
        return
      }
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key]
          const currentPath = Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`
          if (key.toLowerCase().includes(searchQuery)) {
            results.push({ path: currentPath, value: key })
          }
          if (typeof value === 'object') {
            search(value, currentPath)
          } else if (String(value).toLowerCase().includes(searchQuery)) {
            results.push({ path: currentPath, value })
          }
        }
      }
    }
  }
  search(json)
  return results
}

export default App

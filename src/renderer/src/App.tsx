import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
  getFileNameFromPath,
  FileType,
  tryParseClipboard
} from './components/Cell/FileUtils'
import { collectExpandablePaths, updateExpandedPaths } from './components/Cell/expandedPaths'
import { updateTabScrollTop } from './components/JsonView/scrollPosition'
import { planOpenedFiles, isOptionFilePath } from './components/Tabs/openFiles'
import { getDesktopApi, initTauriApi } from './platform'
import { searchJson } from './components/JsonView/searchJson'
import {
  KeyFilterState,
  beginKeyFilterSelection,
  setDraftKeySelected,
  setDraftQuery,
  applyDraftKeyFilter,
  cancelKeyFilterSelection,
  clearAppliedKeyFilter,
  createEmptyKeyFilterState
} from './components/Cell/keyFilter'
import {
  ColumnProjectionState,
  beginColumnProjectionSelection,
  setDraftColumnSelected,
  setDraftColumnQuery,
  applyDraftColumnProjection,
  cancelColumnProjectionSelection,
  clearColumnProjection,
  createEmptyColumnProjectionState,
  ProjectionColumn
} from './components/Cell/columnProjection'
import {
  buildSelectionOptionsDto,
  serializeSelectionOptions,
  parseSelectionOptions,
  applySelectionOptionsToData,
  hasAnyActiveSelection
} from './components/Cell/selectionOptions'
import {
  Language,
  createTranslator,
  detectAppLanguage,
  setStoredLanguage
} from './i18n'

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
  expandedPaths: string[]
  scrollTop: number
  keyFilterMode: boolean
  keyFilters: KeyFilterState
  columnProjectionMode: boolean
  columnProjections: ColumnProjectionState
}

const MAX_HISTORY = 100

function App() {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)
  const [language, setLanguage] = useState<Language>(() => detectAppLanguage())
  const t = useMemo(() => createTranslator(language), [language])
  const tabsRef = useRef<TabState[]>([])

  const handleLanguageChange = useCallback((nextLanguage: Language) => {
    setLanguage(nextLanguage)
    setStoredLanguage(nextLanguage)
  }, [])

  const updateTabData = useCallback((tabId: string, updates: Partial<Omit<TabState, 'id'>>) => {
    setTabs((prevTabs) => {
      const nextTabs = prevTabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
      tabsRef.current = nextTabs
      return nextTabs
    })
  }, [])

  // --- アクティブなタブの取得 ---
  const activeTabData = tabs.find((tab) => tab.id === activeTabId)

  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  const createTabState = useCallback(
    (filePath: string | null = null, data: any = null, id = uuidv4()): TabState => {
      const fileType = filePath ? detectFileType(filePath) : 'json'
      return {
        id,
        filePath: filePath,
        fileName: getFileNameFromPath(filePath),
        jsonData: data,
        searchQuery: '',
        searchResults: [],
        currentResultIndex: -1,
        mode: 'view',
        isDirty: false,
        history: { undo: [], redo: [] },
        viewMode: 'grid',
        fileType,
        originalContent: data !== null ? serializeData(data, fileType) : '',
        expandedPaths: [],
        scrollTop: 0,
        keyFilterMode: false,
        keyFilters: createEmptyKeyFilterState(),
        columnProjectionMode: false,
        columnProjections: createEmptyColumnProjectionState()
      }
    },
    []
  )

  // --- タブ操作 ---
  const addTab = useCallback(
    (filePath: string | null = null, data: any = null, makeActive = true): string => {
      const newTab = createTabState(filePath, data)
      setTabs((prevTabs) => {
        const nextTabs = [...prevTabs, newTab]
        tabsRef.current = nextTabs
        return nextTabs
      })
      if (makeActive || tabs.length === 0) {
        setActiveTabId(newTab.id)
      }
      return newTab.id
    },
    [createTabState, tabs.length]
  )

  const handlePasteToNewTab = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) return
      const result = tryParseClipboard(text)
      if (result) {
        const activeTab = tabsRef.current.find((t) => t.id === activeTabId)
        const isEmptyTab =
          activeTab &&
          activeTab.filePath === null &&
          activeTab.jsonData === null &&
          !activeTab.isDirty
        if (isEmptyTab) {
          updateTabData(activeTab!.id, {
            jsonData: result.data,
            fileType: result.fileType,
            originalContent: text,
            fileName: t('file.pasted', { type: result.fileType.toUpperCase() })
          })
        } else {
          const newTabId = addTab(null, result.data, true)
          setTabs((prevTabs) =>
            prevTabs.map((tab) =>
              tab.id === newTabId
                ? {
                    ...tab,
                    fileType: result.fileType,
                    originalContent: text,
                    fileName: t('file.pasted', { type: result.fileType.toUpperCase() })
                  }
                : tab
            )
          )
        }
      } else {
        const activeTab = tabsRef.current.find((t) => t.id === activeTabId)
        const isEmptyTab =
          activeTab &&
          activeTab.filePath === null &&
          activeTab.jsonData === null &&
          !activeTab.isDirty
        if (isEmptyTab) {
          updateTabData(activeTab!.id, {
            jsonData: { error: t('file.clipboardInvalid') }
          })
        } else {
          addTab(null, { error: t('file.clipboardInvalid') }, true)
        }
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }, [activeTabId, addTab, updateTabData, t])

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

        const newFileName = getFileNameFromPath(result.filePath)
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
      const existingTab = tabsRef.current.find((t) => t.id === tabId)
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
            jsonData: { error: t('file.cannotRead') },
            filePath: filePath,
            fileName: t('file.errorPrefix', { name: getFileNameFromPath(filePath) })
          })
          return
        }
        const fileType = detectFileType(filePath)
        const parsed = parseContent(fileContent, fileType)
        const fileName = getFileNameFromPath(filePath)
        updateTabData(tabId, {
          jsonData: parsed,
          filePath: filePath,
          fileName: fileName,
          fileType: fileType,
          originalContent: serializeData(parsed, fileType),
          expandedPaths: [],
          scrollTop: 0,
          keyFilterMode: false,
          keyFilters: createEmptyKeyFilterState(),
          columnProjectionMode: false,
          columnProjections: createEmptyColumnProjectionState()
        })
      } catch (error: any) {
        console.error('Error loading file into tab:', filePath, error)
        const fileName = getFileNameFromPath(filePath)
        updateTabData(tabId, {
          jsonData: { error: t('file.loadFailed', { message: error.message || String(error) }) },
          filePath: filePath,
          fileName: t('file.errorPrefix', { name: fileName })
        })
      }
    },
    [updateTabData, t]
  )

  const prepareTabForFile = useCallback(
    (tab: TabState, filePath: string): TabState => ({
      ...createTabState(filePath, null, tab.id),
      mode: tab.mode,
      viewMode: tab.viewMode
    }),
    [createTabState]
  )

  const handleSaveSelectionOptions = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.id === activeTabId)
    if (!tab || !tab.jsonData) return
    if (!hasAnyActiveSelection(tab.keyFilters, tab.columnProjections)) return

    const fileName = tab.filePath ? getFileNameFromPath(tab.filePath) : 'untitled.json'
    const defaultPath = `${fileName}.option`
    const dto = buildSelectionOptionsDto(fileName, tab.keyFilters, tab.columnProjections)
    const content = serializeSelectionOptions(dto)

    try {
      const result = await getDesktopApi()?.saveTextFile({ defaultPath, content })
      if (!result || result.canceled) return
    } catch (error) {
      console.error('Error saving selection options:', error)
    }
  }, [activeTabId])

  const handleApplySelectionOptions = useCallback(
    async (filePath: string) => {
      if (!activeTabId) return
      const tab = tabsRef.current.find((t) => t.id === activeTabId)
      if (!tab || !tab.jsonData) return

      try {
        const api = getDesktopApi()
        if (!api?.readFile) return
        const text = await api.readFile(filePath)
        const options = parseSelectionOptions(text)
        if (!options) return

        const result = applySelectionOptionsToData(tab.jsonData, options)
        const hasAnyResult =
          Object.keys(result.keyFilters).length > 0 ||
          Object.keys(result.columnProjections).length > 0
        if (!hasAnyResult) return

        setTabs((prevTabs) =>
          prevTabs.map((t) => {
            if (t.id !== activeTabId) return t
            return {
              ...t,
              keyFilters: result.keyFilters,
              columnProjections: result.columnProjections,
              searchResults: [],
              currentResultIndex: -1
            }
          })
        )
      } catch (error) {
        console.error('Error applying selection options:', error)
      }
    },
    [activeTabId]
  )

  const handleFilesOpened = useCallback(
    (filePaths: string[]) => {
      const optionFile = filePaths.find((fp) => isOptionFilePath(fp))
      const nonOptionFiles = filePaths.filter((fp) => !isOptionFilePath(fp))

      if (optionFile && nonOptionFiles.length === 0 && filePaths.length > 0) {
        handleApplySelectionOptions(optionFile)
        return
      }

      const currentTabs = tabsRef.current
      const plan = planOpenedFiles({
        tabs: currentTabs,
        filePaths: nonOptionFiles,
        createTab: (filePath) => createTabState(filePath, null),
        prepareTabForFile
      })

      if (plan.tabs !== currentTabs) {
        tabsRef.current = plan.tabs
        setTabs(plan.tabs)
      }
      if (plan.activeTabId) {
        setActiveTabId(plan.activeTabId)
      }
      plan.filesToLoad.forEach(({ filePath, tabId }) => {
        loadFileIntoTab(filePath, tabId)
      })
    },
    [createTabState, loadFileIntoTab, prepareTabForFile, handleApplySelectionOptions]
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

  const toggleKeyFilterMode = useCallback(() => {
    if (!activeTabId) return
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab
        return { ...tab, keyFilterMode: !tab.keyFilterMode }
      })
    )
  }, [activeTabId])

  const handleBeginKeyFilterSelection = useCallback(
    (path: string, allKeys: string[]) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            keyFilters: beginKeyFilterSelection(tab.keyFilters, path, allKeys)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleDraftKeySelectedChange = useCallback(
    (path: string, key: string, selected: boolean) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            keyFilters: setDraftKeySelected(tab.keyFilters, path, key, selected)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleDraftKeyFilterQueryChange = useCallback(
    (path: string, query: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            keyFilters: setDraftQuery(tab.keyFilters, path, query)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleApplyKeyFilter = useCallback(
    (path: string, allKeys: string[]) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            keyFilters: applyDraftKeyFilter(tab.keyFilters, path, allKeys),
            searchResults: [],
            currentResultIndex: -1
          }
        })
      )
    },
    [activeTabId]
  )

  const handleCancelKeyFilterSelection = useCallback(
    (path: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            keyFilters: cancelKeyFilterSelection(tab.keyFilters, path)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleClearKeyFilter = useCallback(
    (path: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            keyFilters: clearAppliedKeyFilter(tab.keyFilters, path),
            searchResults: [],
            currentResultIndex: -1
          }
        })
      )
    },
    [activeTabId]
  )

  const toggleColumnProjectionMode = useCallback(() => {
    if (!activeTabId) return
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab
        return { ...tab, columnProjectionMode: !tab.columnProjectionMode }
      })
    )
  }, [activeTabId])

  const handleBeginColumnProjectionSelection = useCallback(
    (path: string, allColumns: ProjectionColumn[]) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            columnProjections: beginColumnProjectionSelection(tab.columnProjections, path, allColumns)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleDraftColumnSelectedChange = useCallback(
    (path: string, columnPath: string, selected: boolean) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            columnProjections: setDraftColumnSelected(
              tab.columnProjections,
              path,
              columnPath,
              selected
            )
          }
        })
      )
    },
    [activeTabId]
  )

  const handleDraftColumnProjectionQueryChange = useCallback(
    (path: string, query: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            columnProjections: setDraftColumnQuery(tab.columnProjections, path, query)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleApplyColumnProjection = useCallback(
    (path: string, allColumns: ProjectionColumn[]) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            columnProjections: applyDraftColumnProjection(tab.columnProjections, path, allColumns),
            searchResults: [],
            currentResultIndex: -1
          }
        })
      )
    },
    [activeTabId]
  )

  const handleCancelColumnProjectionSelection = useCallback(
    (path: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            columnProjections: cancelColumnProjectionSelection(tab.columnProjections, path)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleClearColumnProjection = useCallback(
    (path: string) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            columnProjections: clearColumnProjection(tab.columnProjections, path),
            searchResults: [],
            currentResultIndex: -1
          }
        })
      )
    },
    [activeTabId]
  )

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

  const handleExpandedChange = useCallback(
    (path: string, expanded: boolean) => {
      if (!activeTabId) return
      setTabs((prevTabs) =>
        prevTabs.map((tab) => {
          if (tab.id !== activeTabId) return tab
          return {
            ...tab,
            expandedPaths: updateExpandedPaths(tab.expandedPaths, path, expanded)
          }
        })
      )
    },
    [activeTabId]
  )

  const handleScrollPositionChange = useCallback(
    (scrollTop: number) => {
      if (!activeTabId) return
      setTabs((prevTabs) => updateTabScrollTop(prevTabs, activeTabId, scrollTop))
    },
    [activeTabId]
  )

  const handleExpandAll = useCallback(() => {
    if (!activeTabId) return
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTabId) return tab
        return { ...tab, expandedPaths: collectExpandablePaths(tab.jsonData) }
      })
    )
  }, [activeTabId])

  // --- 検索関連処理 ---
  const handleSearch = useCallback(() => {
    if (!activeTabData) return
    const results = searchJson(
      activeTabData.jsonData,
      activeTabData.searchQuery,
      activeTabData.keyFilters,
      activeTabData.columnProjections
    )
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
  }, [addTab, tabs.length])

  useEffect(() => {
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
        handleFilesOpened(filePaths)
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
  }, [apiReady, handleDrop, handleFilesOpened])

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
        onSave={() => handleSave()}
        activeTabMode={activeTabData?.mode || 'view'}
        activeTabViewMode={activeTabData?.viewMode || 'grid'}
        language={language}
        onLanguageChange={handleLanguageChange}
        t={t}
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
            onExpandedChange={handleExpandedChange}
            onScrollPositionChange={handleScrollPositionChange}
            onExpandAll={handleExpandAll}
            onToggleKeyFilterMode={toggleKeyFilterMode}
            onBeginKeyFilterSelection={handleBeginKeyFilterSelection}
            onDraftKeySelectedChange={handleDraftKeySelectedChange}
            onDraftKeyFilterQueryChange={handleDraftKeyFilterQueryChange}
            onApplyKeyFilter={handleApplyKeyFilter}
            onCancelKeyFilterSelection={handleCancelKeyFilterSelection}
            onClearKeyFilter={handleClearKeyFilter}
            onToggleColumnProjectionMode={toggleColumnProjectionMode}
            onBeginColumnProjectionSelection={handleBeginColumnProjectionSelection}
            onDraftColumnSelectedChange={handleDraftColumnSelectedChange}
            onDraftColumnProjectionQueryChange={handleDraftColumnProjectionQueryChange}
            onApplyColumnProjection={handleApplyColumnProjection}
            onCancelColumnProjectionSelection={handleCancelColumnProjectionSelection}
            onClearColumnProjection={handleClearColumnProjection}
            onPasteTab={handlePasteToNewTab}
            onSaveSelectionOptions={handleSaveSelectionOptions}
            hasActiveSelection={hasAnyActiveSelection(
              activeTabData?.keyFilters ?? createEmptyKeyFilterState(),
              activeTabData?.columnProjections ?? createEmptyColumnProjectionState()
            )}
            t={t}
          />
        ) : (
          <div className="center-panel">
            {tabs.length > 0 ? (
              <p>{t('app.selectTab')}</p>
            ) : (
              <p>{t('app.start')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App

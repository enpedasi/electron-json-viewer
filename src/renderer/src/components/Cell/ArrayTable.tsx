import React from 'react'
import ArrayRow from './ArrayRow'
import ResizableTable from './ResizableTable'
import {
  KeyFilterState,
  collectObjectArrayKeys,
  getVisibleObjectArrayKeys,
  hasActiveKeyFilter
} from './keyFilter'
import {
  ColumnProjectionState,
  ProjectionColumn,
  collectArrayLeafColumns,
  getValueByRelativePath,
  getAppliedProjectionColumns,
  hasActiveColumnProjection
} from './columnProjection'
import { buildTsvFromColumns, buildTsvFromResolvedRows } from './tableTsv'
import { highlightText, escapeRegExp } from './highlightText'
import { RowEntry, buildPlainRowEntries } from './rowEntries'
import {
  RowFilterCondition,
  RowFilterState,
  collectDistinctColumnValues,
  hasActiveRowFilter,
  isConditionActive,
  rowMatchesFilters
} from './rowFilter'
import RowFilterPopover from './RowFilterPopover'
import {
  UnwindState,
  buildUnwoundRowEntries,
  collectUnwindCandidates,
  collectUnwoundColumns,
  getChildRelativePath,
  getUnwindChildIndexForPath,
  resolveUnwoundValue
} from './unwind'
import { PrunePathSets, isPathVisibleInPrune } from '../JsonView/searchPrune'
import { Translator } from '../../i18n'

const ESTIMATED_ROW_HEIGHT = 28
const VIRTUAL_OVERSCAN_ROWS = 12
const VIRTUAL_VIEWPORT_FALLBACK_HEIGHT = 800
const MAX_MEASURED_ROWS = 2000
const EMPTY_PATH_SET: ReadonlySet<string> = new Set()
const MAX_VISIBLE_OPTIONS = 300

interface Props {
  array: Array<any>
  depth: number
  searchQuery?: string
  searchResults?: any[]
  currentResultIndex?: number
  searchInputRef?: any
  path: string
  isEditMode?: boolean
  onDataChange?: (path: string, newValue: any) => void
  onDelete?: (path: string) => void
  onAddProperty?: (path: string, key: string, value: any) => void
  onAddItem?: (path: string, value: any) => void
  onRenameKey?: (path: string, oldKey: string, newKey: string) => void
  onExpandedChange?: (path: string, expanded: boolean) => void
  expandedPaths?: ReadonlySet<string> | string[]
  autoExpandPaths?: ReadonlySet<string>
  prunePaths?: PrunePathSets | null
  keyFilterMode?: boolean
  keyFilters?: KeyFilterState
  onBeginKeyFilterSelection?: (path: string, allKeys: string[]) => void
  onDraftKeySelectedChange?: (path: string, key: string, selected: boolean) => void
  onDraftKeyFilterQueryChange?: (path: string, query: string) => void
  onApplyKeyFilter?: (path: string, allKeys: string[]) => void
  onCancelKeyFilterSelection?: (path: string) => void
  onClearKeyFilter?: (path: string) => void
  columnProjectionMode?: boolean
  columnProjections?: ColumnProjectionState
  onBeginColumnProjectionSelection?: (path: string, allColumns: ProjectionColumn[]) => void
  onDraftColumnSelectedChange?: (path: string, columnPath: string, selected: boolean) => void
  onDraftColumnProjectionQueryChange?: (path: string, query: string) => void
  onApplyColumnProjection?: (path: string, allColumns: ProjectionColumn[]) => void
  onCancelColumnProjectionSelection?: (path: string) => void
  onClearColumnProjection?: (path: string) => void
  rowFilters?: RowFilterState
  onSetRowFilter?: (path: string, columnId: string, condition: RowFilterCondition) => void
  onClearRowFilterColumn?: (path: string, columnId: string) => void
  onClearRowFilters?: (path: string) => void
  unwinds?: UnwindState
  onSetUnwind?: (path: string, relativePath: string | null) => void
  onSaveSelectionOptions?: () => void
  hasActiveSelection?: boolean
  t: Translator
}

const ArrayTable: React.FC<Props> = ({
  array,
  depth,
  searchQuery,
  searchResults,
  currentResultIndex,
  searchInputRef,
  path,
  isEditMode = false,
  onDataChange,
  onDelete,
  onAddProperty,
  onAddItem,
  onRenameKey,
  onExpandedChange,
  expandedPaths = EMPTY_PATH_SET,
  autoExpandPaths = EMPTY_PATH_SET,
  prunePaths = null,
  keyFilterMode = false,
  keyFilters = {},
  onBeginKeyFilterSelection,
  onDraftKeySelectedChange,
  onDraftKeyFilterQueryChange,
  onApplyKeyFilter,
  onCancelKeyFilterSelection,
  onClearKeyFilter,
  columnProjectionMode = false,
  columnProjections = {},
  onBeginColumnProjectionSelection,
  onDraftColumnSelectedChange,
  onDraftColumnProjectionQueryChange,
  onApplyColumnProjection,
  onCancelColumnProjectionSelection,
  onClearColumnProjection,
  rowFilters = {},
  onSetRowFilter,
  onClearRowFilterColumn,
  onClearRowFilters,
  unwinds = {},
  onSetUnwind,
  onSaveSelectionOptions,
  hasActiveSelection = false,
  t
}) => {
  const tableWrapperRef = React.useRef<HTMLDivElement>(null)
  const tbodyRef = React.useRef<HTMLTableSectionElement>(null)
  const rowHeightsRef = React.useRef(new Map<number, number>())
  const rowObserversRef = React.useRef(new Map<number, ResizeObserver>())
  const rowRefCallbacksRef = React.useRef(
    new Map<number, (row: HTMLTableRowElement | null) => void>()
  )
  const [measurementVersion, setMeasurementVersion] = React.useState(0)
  const [rowHeightEstimate, setRowHeightEstimate] = React.useState(ESTIMATED_ROW_HEIGHT)
  const [virtualViewport, setVirtualViewport] = React.useState({
    scrollOffset: 0,
    viewportHeight: VIRTUAL_VIEWPORT_FALLBACK_HEIGHT
  })
  const virtualRangeRef = React.useRef({ startIndex: 0, endIndex: 0 })
  const [openFilterColumnId, setOpenFilterColumnId] = React.useState<string | null>(null)
  const [rowFilterPopoverPosition, setRowFilterPopoverPosition] = React.useState<{
    left: number
    top: number
  } | null>(null)

  const allKeys = React.useMemo(() => collectObjectArrayKeys(array), [array])
  const unwindState = unwinds[path]
  const [unwindCandidates, setUnwindCandidates] = React.useState<string[] | null>(null)
  React.useEffect(() => setUnwindCandidates(null), [array])
  const ensureUnwindCandidates = React.useCallback(() => {
    if (unwindCandidates !== null || allKeys.length === 0) return
    setUnwindCandidates(collectUnwindCandidates(array))
  }, [allKeys.length, array, unwindCandidates])
  const showUnwindSelect =
    Boolean(unwindState) ||
    (unwindCandidates === null ? allKeys.length > 0 : unwindCandidates.length > 0)
  const rowEntries = React.useMemo(
    () =>
      unwindState
        ? buildUnwoundRowEntries(array, path, unwindState.relativePath)
        : buildPlainRowEntries(array, path),
    [array, path, unwindState]
  )
  const rowFilterConditions = rowFilters[path]
  const rowFilterActive = hasActiveRowFilter(rowFilters, path)
  const visibleEntries = React.useMemo(() => {
    let entries: RowEntry[] = rowEntries
    if (rowFilterActive) {
      entries = entries.filter((entry) =>
        rowMatchesFilters(entry.element, rowFilterConditions, (_element, columnId) =>
          unwindState
            ? resolveUnwoundValue(entry.element, entry.child, columnId, unwindState.relativePath)
            : getValueByRelativePath(entry.element, columnId)
        )
      )
    }
    if (prunePaths) {
      entries = entries.filter((entry) => isPathVisibleInPrune(prunePaths, entry.rowPath))
    }
    return entries
  }, [prunePaths, rowEntries, rowFilterActive, rowFilterConditions, unwindState])

  React.useEffect(() => {
    rowHeightsRef.current.clear()
    rowRefCallbacksRef.current.clear()
    setMeasurementVersion((version) => version + 1)
  }, [visibleEntries])

  React.useEffect(() => {
    return () => {
      rowObserversRef.current.forEach((observer) => observer.disconnect())
      rowObserversRef.current.clear()
    }
  }, [])

  const updateVirtualViewport = React.useCallback(() => {
    const scrollParent = getScrollParent(tableWrapperRef.current)
    const tbody = tbodyRef.current
    if (!scrollParent || !tbody) return

    const parentRect = scrollParent.getBoundingClientRect()
    const tbodyRect = tbody.getBoundingClientRect()
    const tbodyTop = tbodyRect.top - parentRect.top + scrollParent.scrollTop
    const scrollOffset = Math.max(0, scrollParent.scrollTop - tbodyTop)
    const viewportHeight = scrollParent.clientHeight || VIRTUAL_VIEWPORT_FALLBACK_HEIGHT

    setVirtualViewport((current) => {
      if (
        Math.abs(current.scrollOffset - scrollOffset) < 1 &&
        Math.abs(current.viewportHeight - viewportHeight) < 1
      ) {
        return current
      }
      return { scrollOffset, viewportHeight }
    })
  }, [])

  React.useLayoutEffect(() => {
    updateVirtualViewport()
  }, [visibleEntries.length, updateVirtualViewport])

  React.useEffect(() => {
    const scrollParent = getScrollParent(tableWrapperRef.current)
    if (!scrollParent) return

    let frameId = 0
    const scheduleUpdate = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        updateVirtualViewport()
      })
    }

    scrollParent.addEventListener('scroll', scheduleUpdate, { passive: true })
    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(scrollParent)
    if (tableWrapperRef.current) resizeObserver.observe(tableWrapperRef.current)
    scheduleUpdate()

    return () => {
      scrollParent.removeEventListener('scroll', scheduleUpdate)
      resizeObserver.disconnect()
      if (frameId) window.cancelAnimationFrame(frameId)
    }
  }, [visibleEntries.length, updateVirtualViewport])

  const updateRowMeasurement = React.useCallback(
    (index: number, height: number) => {
      if (!Number.isFinite(height) || height <= 0) return
      const measuredHeight = Math.ceil(height)
      const previousHeight = rowHeightsRef.current.get(index)
      if (previousHeight === measuredHeight) return

      rowHeightsRef.current.set(index, measuredHeight)
      if (rowHeightsRef.current.size > MAX_MEASURED_ROWS) {
        const { startIndex, endIndex } = virtualRangeRef.current
        const keepMin = Math.max(0, Math.min(startIndex, endIndex) - MAX_MEASURED_ROWS / 2)
        const keepMax = Math.max(startIndex, endIndex) + MAX_MEASURED_ROWS / 2
        for (const [rowIndex] of [...rowHeightsRef.current.entries()]) {
          if (rowIndex < keepMin || rowIndex > keepMax) {
            rowHeightsRef.current.delete(rowIndex)
          }
        }
      }
      if (rowRefCallbacksRef.current.size > MAX_MEASURED_ROWS) {
        const { startIndex, endIndex } = virtualRangeRef.current
        const keepMin = Math.max(0, Math.min(startIndex, endIndex) - MAX_MEASURED_ROWS / 2)
        const keepMax = Math.max(startIndex, endIndex) + MAX_MEASURED_ROWS / 2
        for (const [rowIndex] of [...rowRefCallbacksRef.current.keys()]) {
          if (rowIndex < keepMin || rowIndex > keepMax) {
            const observer = rowObserversRef.current.get(rowIndex)
            if (observer) {
              observer.disconnect()
              rowObserversRef.current.delete(rowIndex)
            }
            rowRefCallbacksRef.current.delete(rowIndex)
          }
        }
      }
      if (measuredHeight < 120) {
        setRowHeightEstimate((current) =>
          Math.abs(current - measuredHeight) < 1
            ? current
            : Math.round(current * 0.85 + measuredHeight * 0.15)
        )
      }
      setMeasurementVersion((version) => version + 1)
    },
    []
  )

  const getMeasuredRowRef = React.useCallback(
    (index: number) => {
      let callback = rowRefCallbacksRef.current.get(index)
      if (!callback) {
        callback = (row: HTMLTableRowElement | null) => {
          const previousObserver = rowObserversRef.current.get(index)
          if (previousObserver) {
            previousObserver.disconnect()
            rowObserversRef.current.delete(index)
          }
          if (!row) return

          const measure = () => updateRowMeasurement(index, row.getBoundingClientRect().height)
          measure()

          const observer = new ResizeObserver(measure)
          observer.observe(row)
          rowObserversRef.current.set(index, observer)
        }
        rowRefCallbacksRef.current.set(index, callback)
      }
      return callback
    },
    [updateRowMeasurement]
  )

  const filterState = keyFilters[path]
  const activeFilter = hasActiveKeyFilter(keyFilters, path)
  const visibleKeys = React.useMemo(
    () => getVisibleObjectArrayKeys(allKeys, filterState?.appliedKeys ?? []),
    [allKeys, filterState?.appliedKeys]
  )

  const projectionState = columnProjections[path]
  const activeProjection = hasActiveColumnProjection(columnProjections, path)
  const needsProjectionColumns =
    Boolean(unwindState) ||
    columnProjectionMode ||
    activeProjection ||
    (projectionState?.isSelecting ?? false)
  const projectionColumns = React.useMemo(
    () =>
      unwindState
        ? collectUnwoundColumns(array, unwindState.relativePath)
        : needsProjectionColumns
          ? collectArrayLeafColumns(array)
          : [],
    [array, needsProjectionColumns, unwindState]
  )
  const appliedProjectionColumns = getAppliedProjectionColumns(columnProjections, path)

  const dataColumns = React.useMemo(() => {
    if (unwindState) {
      const base = activeProjection ? appliedProjectionColumns : projectionColumns
      return base.map((column) => ({
        header: column.label,
        id: column.path,
        valuePath: column.path,
        resize: true,
        thClass: `array member unwound-column ${
          getChildRelativePath(column.path, unwindState.relativePath) !== null
            ? 'unwound-child-column'
            : ''
        }`
      }))
    }
    if (activeProjection) {
      return appliedProjectionColumns.map((column) => ({
        header: column.label,
        id: column.path,
        valuePath: column.path,
        resize: true,
        thClass: 'array member projected-column'
      }))
    }
    return visibleKeys.map((header) => ({
      header,
      id: header,
      resize: true,
      thClass: `array member ${activeFilter ? 'filtered-column' : ''}`
    }))
  }, [
    activeProjection,
    appliedProjectionColumns,
    visibleKeys,
    activeFilter,
    projectionColumns,
    unwindState
  ])

  const headers = React.useMemo(() => {
    const base = [{ header: '', id: '__index__', resize: false, thClass: 'index' }, ...dataColumns]
    if (isEditMode && !unwindState) {
      return [
        ...base,
        {
          header: '__edit_actions__',
          id: '__edit_actions__',
          resize: false,
          thClass: 'edit-actions'
        }
      ]
    }
    return base
  }, [dataColumns, isEditMode, unwindState])

  const didAutoBegin = React.useRef(false)
  React.useEffect(() => {
    if (!keyFilterMode || unwindState) {
      didAutoBegin.current = false
      return
    }
    if (allKeys.length === 0) return
    if (filterState?.isSelecting) return
    if (didAutoBegin.current) return
    didAutoBegin.current = true
    onBeginKeyFilterSelection?.(path, allKeys)
  }, [keyFilterMode, unwindState, allKeys, filterState?.isSelecting, onBeginKeyFilterSelection, path])

  const didAutoBeginProjection = React.useRef(false)
  const projectionFocusIndex = React.useRef(-1)
  const projectionListRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!columnProjectionMode) {
      didAutoBeginProjection.current = false
      projectionFocusIndex.current = -1
      return
    }
    if (projectionColumns.length === 0) return
    if (projectionState?.isSelecting) return
    if (didAutoBeginProjection.current) return
    didAutoBeginProjection.current = true
    onBeginColumnProjectionSelection?.(path, projectionColumns)
  }, [
    columnProjectionMode,
    projectionColumns,
    projectionState?.isSelecting,
    onBeginColumnProjectionSelection,
    path
  ])

  const filteredProjectionColumns = React.useMemo(() => {
    const query = (projectionState?.draftQuery ?? '').trim().toLowerCase()
    return projectionColumns.filter(
      (column) =>
        !query ||
        column.path.toLowerCase().includes(query) ||
        column.label.toLowerCase().includes(query)
    )
  }, [projectionColumns, projectionState?.draftQuery])

  const projectionDraftPaths =
    projectionState?.draftColumnPaths ?? projectionColumns.map((item) => item.path)
  const projectionDraftPathSet = React.useMemo(
    () => new Set(projectionDraftPaths),
    [projectionDraftPaths]
  )

  const handleProjectionSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const count = Math.min(filteredProjectionColumns.length, MAX_VISIBLE_OPTIONS)
      if (count === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        projectionFocusIndex.current = Math.min(projectionFocusIndex.current + 1, count - 1)
        const el = projectionListRef.current?.children[projectionFocusIndex.current] as
          | HTMLElement
          | undefined
        el?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (projectionFocusIndex.current <= 0) {
          projectionFocusIndex.current = -1
          ;(event.currentTarget as HTMLInputElement).focus()
        } else {
          projectionFocusIndex.current -= 1
          const el = projectionListRef.current?.children[projectionFocusIndex.current] as
            | HTMLElement
            | undefined
          el?.focus()
        }
      } else if (event.key === ' ' && projectionFocusIndex.current >= 0) {
        event.preventDefault()
        const column = filteredProjectionColumns[projectionFocusIndex.current]
        if (column) {
          const isChecked = projectionDraftPathSet.has(column.path)
          onDraftColumnSelectedChange?.(path, column.path, !isChecked)
        }
      }
    },
    [filteredProjectionColumns, projectionDraftPathSet, onDraftColumnSelectedChange, path]
  )

  const handleProjectionOptionKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>, index: number) => {
      const count = Math.min(filteredProjectionColumns.length, MAX_VISIBLE_OPTIONS)
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        projectionFocusIndex.current = Math.min(index + 1, count - 1)
        const el = projectionListRef.current?.children[projectionFocusIndex.current] as
          | HTMLElement
          | undefined
        el?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (index === 0) {
          projectionFocusIndex.current = -1
          const searchInput = projectionListRef.current?.parentElement?.querySelector(
            '.column-projection-search'
          ) as HTMLInputElement | undefined
          searchInput?.focus()
        } else {
          projectionFocusIndex.current = index - 1
          const el = projectionListRef.current?.children[projectionFocusIndex.current] as
            | HTMLElement
            | undefined
          el?.focus()
        }
      } else if (event.key === ' ') {
        event.preventDefault()
        const column = filteredProjectionColumns[index]
        if (column) {
          const isChecked = projectionDraftPathSet.has(column.path)
          onDraftColumnSelectedChange?.(path, column.path, !isChecked)
        }
      }
    },
    [filteredProjectionColumns, projectionDraftPathSet, onDraftColumnSelectedChange, path]
  )

  const getRowFilterPopoverPosition = React.useCallback((trigger: HTMLElement) => {
    const wrapper = tableWrapperRef.current
    if (!wrapper) return { left: 0, top: 0 }

    const wrapperRect = wrapper.getBoundingClientRect()
    const triggerRect = trigger.getBoundingClientRect()
    return {
      left: Math.max(0, triggerRect.left - wrapperRect.left - 8),
      top: Math.max(0, triggerRect.bottom - wrapperRect.top + 4)
    }
  }, [])

  const closeRowFilterPopover = React.useCallback(() => {
    setOpenFilterColumnId(null)
    setRowFilterPopoverPosition(null)
  }, [])

  const handleColumnFilterToggle = React.useCallback(
    (columnId: string, trigger: HTMLElement) => {
      if (openFilterColumnId === columnId) {
        closeRowFilterPopover()
        return
      }
      setRowFilterPopoverPosition(getRowFilterPopoverPosition(trigger))
      setOpenFilterColumnId(columnId)
    },
    [closeRowFilterPopover, getRowFilterPopoverPosition, openFilterColumnId]
  )

  const headerRenderer = (header: string, id?: string) => {
    if (id === '__edit_actions__') return null
    const isDataColumn = Boolean(id && id !== '__index__' && id !== '__edit_actions__')
    if (!isDataColumn) return <span>{highlightText(header, searchQuery || '')}</span>
    const columnActive = isConditionActive(rowFilterConditions?.[id!])
    return (
      <span className="array-col-header">
        <span>{highlightText(header, searchQuery || '')}</span>
        <button
          className={`col-filter-btn ${columnActive ? 'active' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            handleColumnFilterToggle(id!, event.currentTarget)
          }}
          title={t('table.rowFilter')}
          aria-label={t('table.rowFilter')}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 2h14L10 8.5V14l-4-2V8.5L1 2z" />
          </svg>
        </button>
      </span>
    )
  }

  const draftKeys = filterState?.draftKeys ?? allKeys
  const draftKeySet = React.useMemo(() => new Set(draftKeys), [draftKeys])
  const draftQuery = filterState?.draftQuery ?? ''
  const normalizedDraftQuery = draftQuery.trim().toLowerCase()
  const selectableKeys = normalizedDraftQuery
    ? allKeys.filter((key) => key.toLowerCase().includes(normalizedDraftQuery))
    : allKeys
  const canApplyFilter = draftKeys.length > 0
  const hiddenCount = allKeys.length - visibleKeys.length
  const openColumnDistinct = React.useMemo(() => {
    if (!openFilterColumnId) return null
    if (!unwindState) return collectDistinctColumnValues(array, openFilterColumnId)
    return collectDistinctColumnValues(rowEntries, openFilterColumnId, undefined, undefined, (rowEntry, columnId) => {
      const entry = rowEntry as RowEntry
      return resolveUnwoundValue(entry.element, entry.child, columnId, unwindState.relativePath)
    })
  }, [array, openFilterColumnId, rowEntries, unwindState])

  const handleTsvCopy = React.useCallback(() => {
    if (dataColumns.length === 0) return

    const tsvColumns = dataColumns.map((col) => ({
      header: col.header,
      valuePath: col.valuePath
    }))

    const tsv = unwindState
      ? buildTsvFromResolvedRows(
          dataColumns.map((column) => column.header),
          visibleEntries.map((entry) =>
            dataColumns.map((column) =>
              resolveUnwoundValue(
                entry.element,
                entry.child,
                column.valuePath ?? column.header,
                unwindState.relativePath
              )
            )
          )
        )
      : buildTsvFromColumns(
          visibleEntries.map((entry) => entry.element),
          tsvColumns
        )

    navigator.clipboard.writeText(tsv).catch((err) => {
      console.error('Failed to copy TSV:', err)
    })
  }, [dataColumns, unwindState, visibleEntries])

  const [tsvCopied, setTsvCopied] = React.useState(false)

  const handleTsvClick = React.useCallback(() => {
    handleTsvCopy()
    setTsvCopied(true)
    window.setTimeout(() => setTsvCopied(false), 1500)
  }, [handleTsvCopy])

  const sourceIndexToEntryIndex = React.useMemo(() => {
    const map = new Map<number, number>()
    visibleEntries.forEach((entry, entryIndex) => {
      if (!map.has(entry.sourceIndex)) map.set(entry.sourceIndex, entryIndex)
    })
    return map
  }, [visibleEntries])
  const entryKeyToEntryIndex = React.useMemo(() => {
    const map = new Map<string, number>()
    visibleEntries.forEach((entry, entryIndex) => {
      map.set(entry.key, entryIndex)
    })
    return map
  }, [visibleEntries])

  const focusedSearchRowIndex = React.useMemo(() => {
    const currentPath =
      currentResultIndex !== undefined && currentResultIndex >= 0
        ? searchResults?.[currentResultIndex]?.path
        : undefined
    const sourceIndex = getArrayItemIndexForPath(path, currentPath)
    if (sourceIndex === null) return null
    if (unwindState) {
      const childIndex = getUnwindChildIndexForPath(path, currentPath, unwindState.relativePath)
      if (childIndex !== null) {
        return entryKeyToEntryIndex.get(`${sourceIndex}:${childIndex}`) ?? null
      }
    }
    return sourceIndexToEntryIndex.get(sourceIndex) ?? null
  }, [
    currentResultIndex,
    entryKeyToEntryIndex,
    path,
    searchResults,
    sourceIndexToEntryIndex,
    unwindState
  ])

  const measurementIndex = React.useMemo(() => {
    const entries = [...rowHeightsRef.current.entries()].sort((a, b) => a[0] - b[0])
    const indices = entries.map(([i]) => i)
    const cumulativeDeltas: number[] = []
    let sum = 0
    for (const [, height] of entries) {
      sum += height - rowHeightEstimate
      cumulativeDeltas.push(sum)
    }
    return { indices, cumulativeDeltas }
  }, [measurementVersion, rowHeightEstimate])

  const getOffsetForIndex = React.useCallback(
    (index: number) => {
      const { indices, cumulativeDeltas } = measurementIndex
      let searchLow = 0
      let searchHigh = indices.length - 1
      let resultIdx = -1
      while (searchLow <= searchHigh) {
        const mid = (searchLow + searchHigh) >>> 1
        if (indices[mid] < index) {
          resultIdx = mid
          searchLow = mid + 1
        } else {
          searchHigh = mid - 1
        }
      }
      const delta = resultIdx >= 0 ? cumulativeDeltas[resultIdx] : 0
      return Math.max(0, index * rowHeightEstimate + delta)
    },
    [measurementIndex, rowHeightEstimate]
  )

  const findIndexForOffset = React.useCallback(
    (offset: number) => {
      if (visibleEntries.length === 0) return 0

      let low = 0
      let high = visibleEntries.length - 1
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        if (getOffsetForIndex(mid + 1) < offset) {
          low = mid + 1
        } else {
          high = mid
        }
      }
      return low
    },
    [getOffsetForIndex, visibleEntries.length]
  )

  const virtualRange = React.useMemo(() => {
    if (visibleEntries.length === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        topSpacer: 0,
        bottomSpacer: 0
      }
    }

    const viewportHeight = virtualViewport.viewportHeight || VIRTUAL_VIEWPORT_FALLBACK_HEIGHT
    let startIndex = Math.max(
      0,
      findIndexForOffset(virtualViewport.scrollOffset) - VIRTUAL_OVERSCAN_ROWS
    )
    let endIndex = Math.min(
      visibleEntries.length,
      findIndexForOffset(virtualViewport.scrollOffset + viewportHeight) + VIRTUAL_OVERSCAN_ROWS + 1
    )

    if (
      focusedSearchRowIndex !== null &&
      (focusedSearchRowIndex < startIndex || focusedSearchRowIndex >= endIndex)
    ) {
      startIndex = Math.max(0, focusedSearchRowIndex - VIRTUAL_OVERSCAN_ROWS)
      endIndex = Math.min(visibleEntries.length, focusedSearchRowIndex + VIRTUAL_OVERSCAN_ROWS + 1)
    }

    const topSpacer = getOffsetForIndex(startIndex)
    const visibleHeight = getOffsetForIndex(endIndex) - topSpacer
    const bottomSpacer = Math.max(
      0,
      getOffsetForIndex(visibleEntries.length) - topSpacer - visibleHeight
    )

    return {
      startIndex,
      endIndex,
      topSpacer,
      bottomSpacer
    }
  }, [
    focusedSearchRowIndex,
    findIndexForOffset,
    getOffsetForIndex,
    virtualViewport,
    visibleEntries.length
  ])

  virtualRangeRef.current = { startIndex: virtualRange.startIndex, endIndex: virtualRange.endIndex }

  const visibleWindow = React.useMemo(
    () => visibleEntries.slice(virtualRange.startIndex, virtualRange.endIndex),
    [visibleEntries, virtualRange.endIndex, virtualRange.startIndex]
  )

  return (
    <>
      <div className="array-table-header-row">
        <button
          className={`panel-header-icon-btn tsv-copy-btn ${tsvCopied ? 'copied' : ''}`}
          onClick={handleTsvClick}
          disabled={dataColumns.length === 0}
          title={tsvCopied ? t('json.copied') : t('table.copyTsv')}
          aria-label={tsvCopied ? t('json.copied') : t('table.copyTsv')}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V2zm2-1a1 1 0 0 0-1 1v1h6V2a1 1 0 0 0-1-1H6zM3 4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3z" />
          </svg>
        </button>
        {showUnwindSelect && (
          <label className="unwind-select-label">
            {t('table.unwind')}
            <select
              className="unwind-select"
              value={unwindState?.relativePath ?? ''}
              onFocus={ensureUnwindCandidates}
              onMouseDown={ensureUnwindCandidates}
              onChange={(event) => onSetUnwind?.(path, event.target.value || null)}
            >
              <option value="">{t('table.unwindNone')}</option>
              {(unwindCandidates ?? []).map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}[]
                </option>
              ))}
              {unwindState && !(unwindCandidates ?? []).includes(unwindState.relativePath) && (
                <option value={unwindState.relativePath}>{unwindState.relativePath}[]</option>
              )}
            </select>
          </label>
        )}
      </div>
      {rowFilterActive && (
        <div className="row-filter-summary">
          {t('table.rowFilterSummary', { visible: visibleEntries.length, total: rowEntries.length })}
          <button className="key-filter-inline-clear" onClick={() => onClearRowFilters?.(path)}>
            {t('table.rowFilterClearAll')}
          </button>
        </div>
      )}
      {keyFilterMode && allKeys.length > 0 && !unwindState && (
        <div className="key-filter-panel">
          <div className="key-filter-panel-header">
            <span className="key-filter-title">{t('json.keyFilter')}</span>
            <div className="panel-header-actions">
              <button
                className="panel-header-icon-btn"
                onClick={onSaveSelectionOptions}
                disabled={!hasActiveSelection}
                title={t('table.saveSelection')}
                aria-label={t('table.saveSelection')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.5 1h-12A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h12a1.5 1.5 0 0 0 1.5-1.5V5l-4-4zM5 2h4v3H5V2zm6 12H5v-4h6v4zm2-.5a.5.5 0 0 1-.5.5H12V9H4v5H2.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H4v4h6V2.5l3 3V13.5z" />
                </svg>
              </button>
              {activeFilter && (
                <span className="key-filter-badge">
                  {t('table.hiddenCount', { count: hiddenCount })}
                </span>
              )}
            </div>
          </div>
          <input
            className="key-filter-search"
            type="text"
            value={draftQuery}
            onChange={(event) => onDraftKeyFilterQueryChange?.(path, event.target.value)}
            placeholder={t('table.searchKeys')}
          />
          <div className="key-filter-options">
            {selectableKeys.slice(0, MAX_VISIBLE_OPTIONS).map((key) => (
              <label key={key} className="key-filter-option">
                <input
                  type="checkbox"
                  checked={draftKeySet.has(key)}
                  onChange={(event) =>
                    onDraftKeySelectedChange?.(path, key, event.currentTarget.checked)
                  }
                />
                <span>{key}</span>
              </label>
            ))}
            {selectableKeys.length > MAX_VISIBLE_OPTIONS && (
              <div className="key-filter-option too-many-hint">
                {t('table.tooManyOptions', { count: selectableKeys.length - MAX_VISIBLE_OPTIONS })}
              </div>
            )}
          </div>
          <div className="key-filter-actions">
            <button
              className="key-filter-action primary"
              onClick={() => onApplyKeyFilter?.(path, allKeys)}
              disabled={!canApplyFilter}
            >
              {t('table.apply')}
            </button>
            <button className="key-filter-action" onClick={() => onClearKeyFilter?.(path)}>
              {t('table.clear')}
            </button>
            <button
              className="key-filter-action"
              onClick={() => onCancelKeyFilterSelection?.(path)}
            >
              {t('table.cancel')}
            </button>
          </div>
        </div>
      )}
      {activeFilter && !keyFilterMode && !unwindState && (
        <div className="key-filter-summary">
          {t('table.visibleKeys', { keys: visibleKeys.join(', ') })}
          <button className="key-filter-inline-clear" onClick={() => onClearKeyFilter?.(path)}>
            {t('table.clear')}
          </button>
        </div>
      )}
      {columnProjectionMode && projectionColumns.length > 0 && (
        <div className="column-projection-panel">
          <div className="column-projection-panel-header">
            <span className="column-projection-title">{t('json.columnProjection')}</span>
            <div className="panel-header-actions">
              <button
                className="panel-header-icon-btn"
                onClick={onSaveSelectionOptions}
                disabled={!hasActiveSelection}
                title={t('table.saveSelection')}
                aria-label={t('table.saveSelection')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.5 1h-12A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h12a1.5 1.5 0 0 0 1.5-1.5V5l-4-4zM5 2h4v3H5V2zm6 12H5v-4h6v4zm2-.5a.5.5 0 0 1-.5.5H12V9H4v5H2.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H4v4h6V2.5l3 3V13.5z" />
                </svg>
              </button>
              {activeProjection && (
                <span className="column-projection-badge">
                  {appliedProjectionColumns.length}/{projectionColumns.length}
                </span>
              )}
            </div>
          </div>
          <input
            className="column-projection-search"
            type="text"
            value={projectionState?.draftQuery ?? ''}
            onChange={(event) => onDraftColumnProjectionQueryChange?.(path, event.target.value)}
            onKeyDown={handleProjectionSearchKeyDown}
            placeholder={t('table.searchColumnPaths')}
          />
          <div className="column-projection-options" ref={projectionListRef}>
            {filteredProjectionColumns.slice(0, MAX_VISIBLE_OPTIONS).map((column, index) => (
              <label
                key={column.path}
                className="column-projection-option"
                tabIndex={0}
                onKeyDown={(event) => handleProjectionOptionKeyDown(event, index)}
                onFocus={() => {
                  projectionFocusIndex.current = index
                }}
              >
                <input
                  type="checkbox"
                  checked={projectionDraftPathSet.has(column.path)}
                  onChange={(event) =>
                    onDraftColumnSelectedChange?.(path, column.path, event.currentTarget.checked)
                  }
                />
                <span className="column-projection-path">{column.path}</span>
              </label>
            ))}
            {filteredProjectionColumns.length > MAX_VISIBLE_OPTIONS && (
              <div className="column-projection-option too-many-hint">
                {t('table.tooManyOptions', { count: filteredProjectionColumns.length - MAX_VISIBLE_OPTIONS })}
              </div>
            )}
          </div>
          <div className="column-projection-actions">
            <button
              className="column-projection-action primary"
              onClick={() => onApplyColumnProjection?.(path, projectionColumns)}
              disabled={
                (projectionState?.draftColumnPaths.length ?? projectionColumns.length) === 0
              }
            >
              {t('table.apply')}
            </button>
            <button
              className="column-projection-action"
              onClick={() => onClearColumnProjection?.(path)}
            >
              {t('table.clear')}
            </button>
            <button
              className="column-projection-action"
              onClick={() => onCancelColumnProjectionSelection?.(path)}
            >
              {t('table.cancel')}
            </button>
          </div>
        </div>
      )}
      {activeProjection && !columnProjectionMode && (
        <div className="column-projection-summary">
          {t('table.visibleColumns', {
            columns: appliedProjectionColumns.map((column) => column.path).join(', ')
          })}
          <button
            className="column-projection-inline-clear"
            onClick={() => onClearColumnProjection?.(path)}
          >
            {t('table.clear')}
          </button>
        </div>
      )}
      <div ref={tableWrapperRef} className="array-table-scroll-content">
        {openFilterColumnId && openColumnDistinct && rowFilterPopoverPosition && (
          <div
            className="row-filter-popover-anchor"
            style={{
              left: `${rowFilterPopoverPosition.left}px`,
              top: `${rowFilterPopoverPosition.top}px`
            }}
          >
            <RowFilterPopover
              key={openFilterColumnId}
              columnLabel={
                dataColumns.find((column) => (column.valuePath ?? column.header) === openFilterColumnId)
                  ?.header ?? openFilterColumnId
              }
              distinctValues={openColumnDistinct.values}
              distinctTruncated={openColumnDistinct.truncated}
              condition={rowFilterConditions?.[openFilterColumnId]}
              onApply={(condition) => {
                onSetRowFilter?.(path, openFilterColumnId, condition)
                closeRowFilterPopover()
              }}
              onClearColumn={() => {
                onClearRowFilterColumn?.(path, openFilterColumnId)
                closeRowFilterPopover()
              }}
              onClose={closeRowFilterPopover}
              t={t}
            />
          </div>
        )}
        <ResizableTable
          headers={headers}
          tblClass="array expanded"
          trClass="array-hdr"
          headerRenderer={headerRenderer}
          tbodyRef={tbodyRef}
        >
          <VirtualSpacerRow height={virtualRange.topSpacer} colSpan={headers.length} />
          {visibleWindow.map((entry, offset) => {
            const entryIndex = virtualRange.startIndex + offset
            return (
              <ArrayRow
                key={entry.key}
                ref={getMeasuredRowRef(entryIndex)}
                element={entry.element}
                indexLabel={entry.indexLabel}
                entryChild={entry.child}
                unwindRelativePath={unwindState?.relativePath}
                dataColumns={dataColumns}
                valueColSpan={Math.max(dataColumns.length, 1)}
                depth={depth}
                searchQuery={searchQuery}
                searchResults={searchResults}
                currentResultIndex={currentResultIndex}
                searchInputRef={searchInputRef}
                path={entry.rowPath}
                isEditMode={isEditMode}
                onDataChange={onDataChange}
                onDelete={onDelete}
                onAddProperty={onAddProperty}
                onAddItem={onAddItem}
                onRenameKey={onRenameKey}
                onExpandedChange={onExpandedChange}
                expandedPaths={expandedPaths}
                autoExpandPaths={autoExpandPaths}
                prunePaths={prunePaths}
                keyFilterMode={keyFilterMode}
                keyFilters={keyFilters}
                onBeginKeyFilterSelection={onBeginKeyFilterSelection}
                onDraftKeySelectedChange={onDraftKeySelectedChange}
                onDraftKeyFilterQueryChange={onDraftKeyFilterQueryChange}
                onApplyKeyFilter={onApplyKeyFilter}
                onCancelKeyFilterSelection={onCancelKeyFilterSelection}
                onClearKeyFilter={onClearKeyFilter}
                columnProjectionMode={columnProjectionMode}
                columnProjections={columnProjections}
                onBeginColumnProjectionSelection={onBeginColumnProjectionSelection}
                onDraftColumnSelectedChange={onDraftColumnSelectedChange}
                onDraftColumnProjectionQueryChange={onDraftColumnProjectionQueryChange}
                onApplyColumnProjection={onApplyColumnProjection}
                onCancelColumnProjectionSelection={onCancelColumnProjectionSelection}
                onClearColumnProjection={onClearColumnProjection}
                rowFilters={rowFilters}
                onSetRowFilter={onSetRowFilter}
                onClearRowFilterColumn={onClearRowFilterColumn}
                onClearRowFilters={onClearRowFilters}
                unwinds={unwinds}
                onSetUnwind={onSetUnwind}
                onSaveSelectionOptions={onSaveSelectionOptions}
                hasActiveSelection={hasActiveSelection}
                t={t}
              />
            )
          })}
          <VirtualSpacerRow height={virtualRange.bottomSpacer} colSpan={headers.length} />
          {isEditMode && !unwindState && (
            <tr className="array-el add-row">
              <td className="index add-cell" colSpan={headers.length}>
                <button className="add-row-btn" onClick={() => onAddItem?.(path, null)}>
                  {t('table.addElement')}
                </button>
              </td>
            </tr>
          )}
        </ResizableTable>
      </div>
    </>
  )
}

function VirtualSpacerRow({ height, colSpan }: { height: number; colSpan: number }) {
  if (height <= 0) return null
  return (
    <tr aria-hidden="true" className="array-virtual-spacer">
      <td
        colSpan={colSpan}
        style={{
          border: 0,
          height: `${height}px`,
          padding: 0
        }}
      />
    </tr>
  )
}

function getScrollParent(element: HTMLElement | null): HTMLElement | null {
  const knownContainer = element?.closest('.json-viewer-container')
  if (knownContainer instanceof HTMLElement) return knownContainer

  let current = element?.parentElement ?? null
  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return current
    current = current.parentElement
  }
  return null
}

function getArrayItemIndexForPath(arrayPath: string, resultPath?: string): number | null {
  if (!resultPath) return null
  const escapedPath = escapeRegExp(arrayPath)
  const pattern =
    arrayPath === '' ? /^\[(\d+)\](?:\.|$)/ : new RegExp(`^${escapedPath}\\[(\\d+)\\](?:\\.|$)`)
  const match = resultPath.match(pattern)
  return match ? Number(match[1]) : null
}

export default ArrayTable

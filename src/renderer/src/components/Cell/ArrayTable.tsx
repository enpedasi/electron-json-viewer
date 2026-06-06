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
  getAppliedProjectionColumns,
  hasActiveColumnProjection
} from './columnProjection'
import { buildTsvFromColumns } from './tableTsv'
import { Translator } from '../../i18n'

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
  onAddItem?: (path: string, value: any) => void
  onExpandedChange?: (path: string, expanded: boolean) => void
  expandedPaths?: string[]
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
  onAddItem,
  onExpandedChange,
  expandedPaths = [],
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
  onSaveSelectionOptions,
  hasActiveSelection = false,
  t
}) => {
  const allKeys = React.useMemo(() => collectObjectArrayKeys(array), [array])
  const filterState = keyFilters[path]
  const activeFilter = hasActiveKeyFilter(keyFilters, path)
  const visibleKeys = React.useMemo(
    () => getVisibleObjectArrayKeys(allKeys, filterState?.appliedKeys ?? []),
    [allKeys, filterState?.appliedKeys]
  )

  const projectionColumns = React.useMemo(() => collectArrayLeafColumns(array), [array])
  const projectionState = columnProjections[path]
  const activeProjection = hasActiveColumnProjection(columnProjections, path)
  const appliedProjectionColumns = getAppliedProjectionColumns(columnProjections, path)

  const dataColumns = React.useMemo(() => {
    if (activeProjection) {
      return appliedProjectionColumns.map((column) => ({
        header: column.label,
        valuePath: column.path,
        resize: true,
        thClass: 'array member projected-column'
      }))
    }
    return visibleKeys.map((header) => ({
      header,
      resize: true,
      thClass: `array member ${activeFilter ? 'filtered-column' : ''}`
    }))
  }, [activeProjection, appliedProjectionColumns, visibleKeys, activeFilter])

  const headers = React.useMemo(() => {
    const base = [{ header: '', resize: false, thClass: 'index' }, ...dataColumns]
    if (isEditMode) {
      return [...base, { header: '__edit_actions__', resize: false, thClass: 'edit-actions' }]
    }
    return base
  }, [dataColumns, isEditMode])

  const didAutoBegin = React.useRef(false)
  React.useEffect(() => {
    if (!keyFilterMode) {
      didAutoBegin.current = false
      return
    }
    if (allKeys.length === 0) return
    if (filterState?.isSelecting) return
    if (didAutoBegin.current) return
    didAutoBegin.current = true
    onBeginKeyFilterSelection?.(path, allKeys)
  }, [keyFilterMode, allKeys, filterState?.isSelecting, onBeginKeyFilterSelection, path])

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

  const projectionDraftPaths = projectionState?.draftColumnPaths ?? projectionColumns.map((item) => item.path)

  const handleProjectionSearchKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const count = filteredProjectionColumns.length
      if (count === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        projectionFocusIndex.current = Math.min(projectionFocusIndex.current + 1, count - 1)
        const el = projectionListRef.current?.children[projectionFocusIndex.current] as HTMLElement | undefined
        el?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (projectionFocusIndex.current <= 0) {
          projectionFocusIndex.current = -1
          ;(event.currentTarget as HTMLInputElement).focus()
        } else {
          projectionFocusIndex.current -= 1
          const el = projectionListRef.current?.children[projectionFocusIndex.current] as HTMLElement | undefined
          el?.focus()
        }
      } else if (event.key === ' ' && projectionFocusIndex.current >= 0) {
        event.preventDefault()
        const column = filteredProjectionColumns[projectionFocusIndex.current]
        if (column) {
          const isChecked = projectionDraftPaths.includes(column.path)
          onDraftColumnSelectedChange?.(path, column.path, !isChecked)
        }
      }
    },
    [filteredProjectionColumns, projectionDraftPaths, onDraftColumnSelectedChange, path]
  )

  const handleProjectionOptionKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>, index: number) => {
      const count = filteredProjectionColumns.length
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        projectionFocusIndex.current = Math.min(index + 1, count - 1)
        const el = projectionListRef.current?.children[projectionFocusIndex.current] as HTMLElement | undefined
        el?.focus()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (index === 0) {
          projectionFocusIndex.current = -1
          const searchInput = projectionListRef.current?.parentElement?.querySelector('.column-projection-search') as HTMLInputElement | undefined
          searchInput?.focus()
        } else {
          projectionFocusIndex.current = index - 1
          const el = projectionListRef.current?.children[projectionFocusIndex.current] as HTMLElement | undefined
          el?.focus()
        }
      } else if (event.key === ' ') {
        event.preventDefault()
        const column = filteredProjectionColumns[index]
        if (column) {
          const isChecked = projectionDraftPaths.includes(column.path)
          onDraftColumnSelectedChange?.(path, column.path, !isChecked)
        }
      }
    },
    [filteredProjectionColumns, projectionDraftPaths, onDraftColumnSelectedChange, path]
  )

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="current-highlight">
          {part}
        </span>
      ) : (
        part
      )
    )
  }

  const headerRenderer = (header: string) => {
    if (header === '__edit_actions__') return null
    return <span>{highlightText(header, searchQuery || '')}</span>
  }

  const draftKeys = filterState?.draftKeys ?? allKeys
  const draftQuery = filterState?.draftQuery ?? ''
  const normalizedDraftQuery = draftQuery.trim().toLowerCase()
  const selectableKeys = normalizedDraftQuery
    ? allKeys.filter((key) => key.toLowerCase().includes(normalizedDraftQuery))
    : allKeys
  const canApplyFilter = draftKeys.length > 0
  const hiddenCount = allKeys.length - visibleKeys.length

  const handleTsvCopy = React.useCallback(() => {
    if (dataColumns.length === 0) return

    const tsvColumns = dataColumns.map((col) => ({
      header: col.header,
      valuePath: col.valuePath
    }))

    const tsv = buildTsvFromColumns(array, tsvColumns)

    navigator.clipboard.writeText(tsv).catch((err) => {
      console.error('Failed to copy TSV:', err)
    })
  }, [dataColumns, array, activeProjection, appliedProjectionColumns])

  const [tsvCopied, setTsvCopied] = React.useState(false)

  const handleTsvClick = React.useCallback(() => {
    handleTsvCopy()
    setTsvCopied(true)
    window.setTimeout(() => setTsvCopied(false), 1500)
  }, [handleTsvCopy])

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
      </div>
      {keyFilterMode && allKeys.length > 0 && (
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
            {selectableKeys.map((key) => (
              <label key={key} className="key-filter-option">
                <input
                  type="checkbox"
                  checked={draftKeys.includes(key)}
                  onChange={(event) =>
                    onDraftKeySelectedChange?.(path, key, event.currentTarget.checked)
                  }
                />
                <span>{key}</span>
              </label>
            ))}
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
      {activeFilter && !keyFilterMode && (
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
            onChange={(event) =>
              onDraftColumnProjectionQueryChange?.(path, event.target.value)
            }
            onKeyDown={handleProjectionSearchKeyDown}
            placeholder={t('table.searchColumnPaths')}
          />
          <div className="column-projection-options" ref={projectionListRef}>
            {filteredProjectionColumns
              .map((column, index) => (
                <label
                  key={column.path}
                  className="column-projection-option"
                  tabIndex={0}
                  onKeyDown={(event) => handleProjectionOptionKeyDown(event, index)}
                  onFocus={() => { projectionFocusIndex.current = index }}
                >
                  <input
                    type="checkbox"
                    checked={projectionDraftPaths.includes(column.path)}
                    onChange={(event) =>
                      onDraftColumnSelectedChange?.(
                        path,
                        column.path,
                        event.currentTarget.checked
                      )
                    }
                  />
                  <span className="column-projection-path">{column.path}</span>
                </label>
              ))}
          </div>
          <div className="column-projection-actions">
            <button
              className="column-projection-action primary"
              onClick={() => onApplyColumnProjection?.(path, projectionColumns)}
              disabled={(projectionState?.draftColumnPaths.length ?? projectionColumns.length) === 0}
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
      <ResizableTable
        headers={headers}
        tblClass="array expanded"
        trClass="array-hdr"
        headerRenderer={headerRenderer}
      >
        {array.map((item, index) => (
          <ArrayRow
            key={`${index}-${array.length}`}
            element={item}
            index={index}
            dataColumns={dataColumns}
            valueColSpan={Math.max(dataColumns.length, 1)}
            depth={depth}
            searchQuery={searchQuery}
            searchResults={searchResults}
            currentResultIndex={currentResultIndex}
            searchInputRef={searchInputRef}
            path={`${path}[${index}]`}
            isEditMode={isEditMode}
            onDataChange={onDataChange}
            onDelete={onDelete}
            onExpandedChange={onExpandedChange}
            expandedPaths={expandedPaths}
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
            onSaveSelectionOptions={onSaveSelectionOptions}
            hasActiveSelection={hasActiveSelection}
            t={t}
          />
        ))}
        {isEditMode && (
          <tr className="array-el add-row">
            <td className="index add-cell" colSpan={headers.length}>
              <button className="add-row-btn" onClick={() => onAddItem?.(path, null)}>
                {t('table.addElement')}
              </button>
            </td>
          </tr>
        )}
      </ResizableTable>
    </>
  )
}

export default ArrayTable

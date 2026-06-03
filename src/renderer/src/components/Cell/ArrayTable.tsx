import React from 'react'
import ArrayRow from './ArrayRow'
import ResizableTable from './ResizableTable'
import {
  KeyFilterState,
  collectObjectArrayKeys,
  getVisibleObjectArrayKeys,
  hasActiveKeyFilter
} from './keyFilter'

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
  onClearKeyFilter
}) => {
  const allKeys = React.useMemo(() => collectObjectArrayKeys(array), [array])
  const filterState = keyFilters[path]
  const activeFilter = hasActiveKeyFilter(keyFilters, path)
  const visibleKeys = React.useMemo(
    () => getVisibleObjectArrayKeys(allKeys, filterState?.appliedKeys ?? []),
    [allKeys, filterState?.appliedKeys]
  )

  const dataColumns = React.useMemo(
    () =>
      visibleKeys.map((header) => ({
        header,
        resize: true,
        thClass: `array member ${activeFilter ? 'filtered-column' : ''}`
      })),
    [visibleKeys, activeFilter]
  )

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

  return (
    <>
      {keyFilterMode && allKeys.length > 0 && (
        <div className="key-filter-panel">
          <div className="key-filter-panel-header">
            <span className="key-filter-title">キー絞込</span>
            {activeFilter && <span className="key-filter-badge">{hiddenCount} hidden</span>}
          </div>
          <input
            className="key-filter-search"
            type="text"
            value={draftQuery}
            onChange={(event) => onDraftKeyFilterQueryChange?.(path, event.target.value)}
            placeholder="キーを検索"
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
              確定
            </button>
            <button className="key-filter-action" onClick={() => onClearKeyFilter?.(path)}>
              解除
            </button>
            <button
              className="key-filter-action"
              onClick={() => onCancelKeyFilterSelection?.(path)}
            >
              取消
            </button>
          </div>
        </div>
      )}
      {activeFilter && !keyFilterMode && (
        <div className="key-filter-summary">
          表示キー: {visibleKeys.join(', ')}
          <button className="key-filter-inline-clear" onClick={() => onClearKeyFilter?.(path)}>
            解除
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
          />
        ))}
        {isEditMode && (
          <tr className="array-el add-row">
            <td className="index add-cell" colSpan={headers.length}>
              <button className="add-row-btn" onClick={() => onAddItem?.(path, null)}>
                + 要素を追加
              </button>
            </td>
          </tr>
        )}
      </ResizableTable>
    </>
  )
}

export default ArrayTable

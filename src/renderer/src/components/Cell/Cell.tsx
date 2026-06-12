import React, { useLayoutEffect, memo, useRef, useCallback } from 'react'
import ArrayTable from './ArrayTable'
import ObjectTable from './ObjectTable'
import EditableCell from './EditableCell'
import { isPathExpanded } from './expandedPaths'
import { highlightText } from './highlightText'
import { KeyFilterState } from './keyFilter'
import { ColumnProjectionState, ProjectionColumn } from './columnProjection'
import { RowFilterCondition, RowFilterState } from './rowFilter'
import { UnwindState } from './unwind'
import { PrunePathSets } from '../JsonView/searchPrune'
import { Translator } from '../../i18n'

interface CellProps {
  element: any
  depth?: number
  searchQuery?: string
  searchResults?: any[]
  currentResultIndex?: number
  searchInputRef?: any
  path?: string
  isRoot?: boolean
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

const EMPTY_PATH_SET: ReadonlySet<string> = new Set()
const LONG_INLINE_VALUE_LENGTH = 24

const shouldCompactStringValue = (value: string, query = '') => {
  if (value.length < LONG_INLINE_VALUE_LENGTH) return false
  if (/\s/.test(value)) return false
  if (query && value.toLowerCase().includes(query.toLowerCase())) return false
  return true
}

const Cell: React.FC<CellProps> = ({
  element,
  depth = 0,
  searchQuery,
  searchResults,
  currentResultIndex,
  searchInputRef,
  path = '',
  isRoot = false,
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
  hasActiveSelection,
  t
}) => {
  const cellRef = useRef<HTMLDivElement>(null)
  const shouldAutoExpand = autoExpandPaths.has(path)
  const expanded = isPathExpanded(path, expandedPaths, isRoot || shouldAutoExpand)

  const toggleExpanded = useCallback(() => {
    onExpandedChange?.(path, !expanded)
  }, [expanded, onExpandedChange, path])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === '+' || event.key === 'ArrowRight') {
        onExpandedChange?.(path, true)
      } else if (event.key === '-') {
        onExpandedChange?.(path, false)
      }
    },
    [onExpandedChange, path]
  )

  useLayoutEffect(() => {
    if (
      searchResults &&
      currentResultIndex !== undefined &&
      searchResults[currentResultIndex]?.path === path &&
      cellRef.current
    ) {
      cellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      onExpandedChange?.(path, true)
    }
  }, [searchResults, currentResultIndex, path, onExpandedChange])

  if (depth >= 100) {
    return <span className="value">{t('cell.maxDepth')}</span>
  }

  if (Array.isArray(element)) {
    return (
      <div ref={cellRef} data-path={path} className="cell-container array-cell">
        <span className="array badge">Array[{element.length}]</span>
        <span className="expand" tabIndex={0} onClick={toggleExpanded} onKeyDown={handleKeyDown}>
          {expanded ? '-' : '+'}
        </span>
        {expanded && (
          <ArrayTable
            array={element}
            depth={depth + 1}
            searchQuery={searchQuery}
            searchResults={searchResults}
            currentResultIndex={currentResultIndex}
            searchInputRef={searchInputRef}
            path={path}
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
        )}
      </div>
    )
  } else if (typeof element === 'object' && element !== null) {
    return (
      <div ref={cellRef} data-path={path} className="cell-container object-cell">
        <span className="object badge">Object[{Object.keys(element).length}]</span>
        <span className="expand" tabIndex={0} onClick={toggleExpanded} onKeyDown={handleKeyDown}>
          {expanded ? '-' : '+'}
        </span>
        {expanded && (
          <ObjectTable
            member={element}
            depth={depth + 1}
            searchQuery={searchQuery}
            searchResults={searchResults}
            currentResultIndex={currentResultIndex}
            searchInputRef={searchInputRef}
            path={path}
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
        )}
      </div>
    )
  } else {
    if (isEditMode && onDataChange) {
      return <EditableCell value={element} path={path} onCommit={onDataChange} t={t} />
    }
    const isCurrentValueResult =
      searchResults &&
      currentResultIndex !== undefined &&
      searchResults[currentResultIndex]?.path === path
    const valueString = String(element)
    const compactLongValue =
      typeof element === 'string' && shouldCompactStringValue(valueString, searchQuery)
    return (
      <span
        ref={cellRef}
        className={`value ${typeof element} ${compactLongValue ? 'compact-long-value' : ''} ${
          isCurrentValueResult ? 'current-highlight' : ''
        }`}
        data-path={path}
        title={compactLongValue ? valueString : undefined}
      >
        {highlightText(valueString, searchQuery || '')}
      </span>
    )
  }
}

export default memo(Cell)

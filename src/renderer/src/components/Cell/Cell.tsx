import React, { useLayoutEffect, memo, useRef, useCallback } from 'react'
import ArrayTable from './ArrayTable'
import ObjectTable from './ObjectTable'
import EditableCell from './EditableCell'
import { isPathExpanded } from './expandedPaths'
import { KeyFilterState } from './keyFilter'
import { ColumnProjectionState, ProjectionColumn } from './columnProjection'

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
  hasActiveSelection
}) => {
  const cellRef = useRef<HTMLDivElement>(null)
  const shouldAutoExpand =
    searchResults?.some((result) => result.path !== path && result.path.startsWith(path)) || false
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

  if (depth >= 100) {
    return <span className="value">Max depth reached</span>
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
          />
        )}
      </div>
    )
  } else {
    if (isEditMode && onDataChange) {
      return <EditableCell value={element} path={path} onCommit={onDataChange} />
    }
    const isCurrentValueResult =
      searchResults &&
      currentResultIndex !== undefined &&
      searchResults[currentResultIndex]?.path === path
    const valueString = String(element)
    return (
      <span
        ref={cellRef}
        className={`value ${typeof element} ${isCurrentValueResult ? 'current-highlight' : ''}`}
        data-path={path}
      >
        {highlightText(valueString, searchQuery || '')}
      </span>
    )
  }
}

export default memo(Cell)

import React from 'react'
import Cell from './Cell'
import { KeyFilterState } from './keyFilter'

interface DataColumn {
  header: string
}

interface ArrayRowProps {
  element: any
  index: number
  dataColumns?: DataColumn[]
  valueColSpan?: number
  depth: number
  searchQuery?: string
  searchResults?: any[]
  currentResultIndex?: number
  searchInputRef?: any
  path: string
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
}

const ArrayRow: React.FC<ArrayRowProps> = ({
  element,
  index,
  dataColumns = [],
  valueColSpan = 1,
  depth,
  searchQuery,
  searchResults,
  currentResultIndex,
  searchInputRef,
  path,
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
  onClearKeyFilter
}) => {
  const typeOfEl = Array.isArray(element) ? 'array' : element === null ? 'null' : typeof element

  return (
    <tr className={`array-el ${typeOfEl}`}>
      <td className={`index ${typeOfEl}`}>{index}</td>
      {typeOfEl === 'object' ? (
        dataColumns.map(({ header }) => (
          <td key={header} className="member">
            <Cell
              element={element[header]}
              depth={depth + 1}
              searchQuery={searchQuery}
              searchResults={searchResults}
              currentResultIndex={currentResultIndex}
              searchInputRef={searchInputRef}
              path={`${path}.${header}`}
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
          </td>
        ))
      ) : (
        <td className="value" colSpan={valueColSpan}>
          <Cell
            element={element}
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
          />
        </td>
      )}
      {isEditMode && (
        <td className="row-actions">
          <button
            className="delete-row-btn"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(path)
            }}
            title="削除"
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  )
}

export default ArrayRow

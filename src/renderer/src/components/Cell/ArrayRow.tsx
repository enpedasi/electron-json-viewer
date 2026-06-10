import React from 'react'
import Cell from './Cell'
import { KeyFilterState } from './keyFilter'
import { ColumnProjectionState, ProjectionColumn, getValueByRelativePath } from './columnProjection'
import { Translator } from '../../i18n'

const EMPTY_PATH_SET: ReadonlySet<string> = new Set()

interface DataColumn {
  header: string
  valuePath?: string
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
  expandedPaths?: ReadonlySet<string> | string[]
  autoExpandPaths?: ReadonlySet<string>
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

const ArrayRow = React.forwardRef<HTMLTableRowElement, ArrayRowProps>(
  (
    {
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
      expandedPaths = EMPTY_PATH_SET,
      autoExpandPaths = EMPTY_PATH_SET,
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
    },
    ref
  ) => {
    const typeOfEl = Array.isArray(element) ? 'array' : element === null ? 'null' : typeof element

    return (
      <tr ref={ref} className={`array-el ${typeOfEl}`}>
        <td className={`index ${typeOfEl}`}>{index}</td>
        {typeOfEl === 'object' ? (
          dataColumns.map(({ header, valuePath }) => {
            const relativePath = valuePath ?? header
            return (
              <td key={relativePath} className="member">
                <Cell
                  element={getValueByRelativePath(element, relativePath)}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  searchResults={searchResults}
                  currentResultIndex={currentResultIndex}
                  searchInputRef={searchInputRef}
                  path={`${path}.${relativePath}`}
                  isEditMode={isEditMode}
                  onDataChange={onDataChange}
                  onDelete={onDelete}
                  onExpandedChange={onExpandedChange}
                  expandedPaths={expandedPaths}
                  autoExpandPaths={autoExpandPaths}
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
              </td>
            )
          })
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
              autoExpandPaths={autoExpandPaths}
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
              title={t('table.delete')}
            >
              ✕
            </button>
          </td>
        )}
      </tr>
    )
  }
)

ArrayRow.displayName = 'ArrayRow'

export default React.memo(ArrayRow)

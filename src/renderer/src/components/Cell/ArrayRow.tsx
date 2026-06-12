import React from 'react'
import Cell from './Cell'
import { KeyFilterState } from './keyFilter'
import { ColumnProjectionState, ProjectionColumn, getValueByRelativePath } from './columnProjection'
import { RowFilterCondition, RowFilterState } from './rowFilter'
import { RowEntryChild } from './rowEntries'
import { UnwindState, getUnwoundCellPath, resolveUnwoundValue } from './unwind'
import { PrunePathSets } from '../JsonView/searchPrune'
import { Translator } from '../../i18n'

const EMPTY_PATH_SET: ReadonlySet<string> = new Set()

interface DataColumn {
  header: string
  id?: string
  valuePath?: string
}

interface ArrayRowProps {
  element: any
  indexLabel: string
  entryChild?: RowEntryChild
  unwindRelativePath?: string
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

const ArrayRow = React.forwardRef<HTMLTableRowElement, ArrayRowProps>(
  (
    {
      element,
      indexLabel,
      entryChild,
      unwindRelativePath,
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
    },
    ref
  ) => {
    const typeOfEl = Array.isArray(element) ? 'array' : element === null ? 'null' : typeof element

    return (
      <tr ref={ref} className={`array-el ${typeOfEl}`}>
        <td className={`index ${typeOfEl}`}>{indexLabel}</td>
        {typeOfEl === 'object' ? (
          dataColumns.map(({ header, valuePath }) => {
            const columnId = valuePath ?? header
            const cellElement = unwindRelativePath
              ? resolveUnwoundValue(element, entryChild, columnId, unwindRelativePath)
              : getValueByRelativePath(element, columnId)
            const cellPath = unwindRelativePath
              ? getUnwoundCellPath(path, entryChild, columnId, unwindRelativePath)
              : `${path}.${columnId}`
            return (
              <td key={columnId} className="member">
                <Cell
                  element={cellElement}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  searchResults={searchResults}
                  currentResultIndex={currentResultIndex}
                  searchInputRef={searchInputRef}
                  path={cellPath}
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
          </td>
        )}
        {isEditMode && !unwindRelativePath && (
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

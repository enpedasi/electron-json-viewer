import React, { memo, useMemo, useState, useCallback } from 'react'
import ResizableTable from './ResizableTable'
import Cell from './Cell'
import { KeyFilterState } from './keyFilter'
import { highlightText } from './highlightText'
import { ColumnProjectionState, ProjectionColumn } from './columnProjection'
import { RowFilterCondition, RowFilterState } from './rowFilter'
import { UnwindState } from './unwind'
import { PrunePathSets, isPathVisibleInPrune } from '../JsonView/searchPrune'
import { Translator } from '../../i18n'

const EMPTY_PATH_SET: ReadonlySet<string> = new Set()

interface ObjectTableProps {
  member: Record<string, any>
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

interface Header {
  header: string
  thClass: string
}

const ObjectTable: React.FC<ObjectTableProps> = ({
  member,
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
  const headers: Header[] = useMemo(() => {
    const base = [
      { header: t('object.key'), thClass: 'object key' },
      { header: t('object.val'), thClass: 'object value' }
    ]
    if (isEditMode) {
      return [...base, { header: '', thClass: 'edit-actions' }]
    }
    return base
  }, [isEditMode, t])

  const [newKeyName, setNewKeyName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingKeyValue, setEditingKeyValue] = useState('')
  const visibleMemberEntries = useMemo(() => {
    const entries = Object.entries(member)
    if (!prunePaths) return entries
    return entries.filter(([key]) => isPathVisibleInPrune(prunePaths, `${path}.${key}`))
  }, [member, path, prunePaths])

  const handleAddProperty = useCallback(() => {
    if (!newKeyName.trim()) return
    onAddProperty?.(path, newKeyName.trim(), '')
    setNewKeyName('')
    setAddingNew(false)
  }, [newKeyName, path, onAddProperty])

  const handleStartRename = useCallback((key: string) => {
    setEditingKey(key)
    setEditingKeyValue(key)
  }, [])

  const handleCommitRename = useCallback(
    (oldKey: string) => {
      if (editingKeyValue.trim() && editingKeyValue !== oldKey) {
        onRenameKey?.(path, oldKey, editingKeyValue.trim())
      }
      setEditingKey(null)
      setEditingKeyValue('')
    },
    [editingKeyValue, path, onRenameKey]
  )

  return (
    <ResizableTable
      headers={headers}
      tblClass="object expanded"
      trClass="object-hdr"
      headerRenderer={() => null}
    >
      {visibleMemberEntries.map(([key, val]) => (
        <tr key={key} className="object member">
          <th
            className={`object key ${
              searchResults?.some(
                (r, idx) =>
                  idx === currentResultIndex && r.path === `${path}.${key}` && r.value === key
              )
                ? 'current-highlight'
                : ''
            }`}
            onDoubleClick={() => isEditMode && handleStartRename(key)}
          >
            {editingKey === key ? (
              <input
                className="key-edit-input"
                value={editingKeyValue}
                onChange={(e) => setEditingKeyValue(e.target.value)}
                onBlur={() => handleCommitRename(key)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return
                  if (e.key === 'Enter') handleCommitRename(key)
                  if (e.key === 'Escape') setEditingKey(null)
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : isEditMode ? (
              highlightText(key, searchQuery || '')
            ) : (
              highlightText(key, searchQuery || '')
            )}
          </th>
          <td className="object element">
            <Cell
              element={val}
              depth={depth + 1}
              searchQuery={searchQuery}
              searchResults={searchResults}
              currentResultIndex={currentResultIndex}
              searchInputRef={searchInputRef}
              path={`${path}.${key}`}
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
          {isEditMode && (
            <td className="row-actions">
              <button
                className="delete-row-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(`${path}.${key}`)
                }}
                title={t('table.delete')}
              >
                ✕
              </button>
            </td>
          )}
        </tr>
      ))}
      {isEditMode && (
        <tr className="object member add-row">
          <td className="object element add-cell" colSpan={isEditMode ? 3 : 2}>
            {addingNew ? (
              <div className="add-property-form">
                <input
                  className="add-key-input"
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t('object.newKey')}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return
                    if (e.key === 'Enter') handleAddProperty()
                    if (e.key === 'Escape') setAddingNew(false)
                  }}
                  autoFocus
                />
                <button className="add-confirm-btn" onClick={handleAddProperty}>
                  {t('object.add')}
                </button>
                <button className="add-cancel-btn" onClick={() => setAddingNew(false)}>
                  {t('table.cancel')}
                </button>
              </div>
            ) : (
              <button className="add-row-btn" onClick={() => setAddingNew(true)}>
                {t('object.addProperty')}
              </button>
            )}
          </td>
        </tr>
      )}
    </ResizableTable>
  )
}

export default memo(ObjectTable)

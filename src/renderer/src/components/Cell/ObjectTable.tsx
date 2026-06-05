import React, { memo, useMemo, useState, useCallback } from 'react'
import ResizableTable from './ResizableTable'
import Cell from './Cell'
import { KeyFilterState } from './keyFilter'
import { ColumnProjectionState, ProjectionColumn } from './columnProjection'

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
  onRenameKey?: (path: string, oldKey: string, newKey: string) => void
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
  onRenameKey,
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
  hasActiveSelection = false
}) => {
  const headers: Header[] = useMemo(() => {
    const base = [
      { header: 'key', thClass: 'object key' },
      { header: 'val', thClass: 'object value' }
    ]
    if (isEditMode) {
      return [...base, { header: '', thClass: 'edit-actions' }]
    }
    return base
  }, [isEditMode])

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

  const [newKeyName, setNewKeyName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingKeyValue, setEditingKeyValue] = useState('')

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
      {Object.entries(member).map(([key, val]) => (
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
          </td>
          {isEditMode && (
            <td className="row-actions">
              <button
                className="delete-row-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(`${path}.${key}`)
                }}
                title="削除"
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
                  placeholder="新しいキー名"
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return
                    if (e.key === 'Enter') handleAddProperty()
                    if (e.key === 'Escape') setAddingNew(false)
                  }}
                  autoFocus
                />
                <button className="add-confirm-btn" onClick={handleAddProperty}>
                  追加
                </button>
                <button className="add-cancel-btn" onClick={() => setAddingNew(false)}>
                  取消
                </button>
              </div>
            ) : (
              <button className="add-row-btn" onClick={() => setAddingNew(true)}>
                + プロパティを追加
              </button>
            )}
          </td>
        </tr>
      )}
    </ResizableTable>
  )
}

export default memo(ObjectTable)

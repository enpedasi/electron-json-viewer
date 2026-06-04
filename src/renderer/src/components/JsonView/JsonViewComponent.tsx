import React, { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react'
import Cell from '../Cell/Cell'
import TextEditor from './TextEditor'
import { TabState } from '../../App'
import '../../App.css'
import { hasAnyActiveKeyFilter, applyKeyFiltersToData } from '../Cell/keyFilter'
import {
  ColumnProjectionState,
  ProjectionColumn,
  hasAnyActiveColumnProjection,
  collectArrayLeafColumns,
  applyColumnProjectionsToData
} from '../Cell/columnProjection'

interface JsonViewProps {
  tabData: TabState
  searchVisible: boolean
  onSearchVisibleChange: (visible: boolean) => void
  onSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSearchExecute: () => void
  onNextResult: () => void
  onClearSearch: () => void
  onDataChange?: (path: string, newValue: any) => void
  onDelete?: (path: string) => void
  onAddProperty?: (path: string, key: string, value: any) => void
  onAddArrayItem?: (path: string, value: any) => void
  onRenameKey?: (path: string, oldKey: string, newKey: string) => void
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onTextEditorChange?: (newText: string) => void
  onExpandedChange?: (path: string, expanded: boolean) => void
  onScrollPositionChange?: (scrollTop: number) => void
  onExpandAll?: () => void
  onToggleKeyFilterMode?: () => void
  onBeginKeyFilterSelection?: (path: string, allKeys: string[]) => void
  onDraftKeySelectedChange?: (path: string, key: string, selected: boolean) => void
  onDraftKeyFilterQueryChange?: (path: string, query: string) => void
  onApplyKeyFilter?: (path: string, allKeys: string[]) => void
  onCancelKeyFilterSelection?: (path: string) => void
  onClearKeyFilter?: (path: string) => void
  onToggleColumnProjectionMode?: () => void
  onBeginColumnProjectionSelection?: (path: string, allColumns: ProjectionColumn[]) => void
  onDraftColumnSelectedChange?: (path: string, columnPath: string, selected: boolean) => void
  onDraftColumnProjectionQueryChange?: (path: string, query: string) => void
  onApplyColumnProjection?: (path: string, allColumns: ProjectionColumn[]) => void
  onCancelColumnProjectionSelection?: (path: string) => void
  onClearColumnProjection?: (path: string) => void
  onPasteTab?: () => void
}

const JsonViewComponent: React.FC<JsonViewProps> = ({
  tabData,
  searchVisible,
  onSearchVisibleChange,
  onSearchInputChange,
  onSearchKeyDown,
  onSearchExecute,
  onNextResult,
  onClearSearch,
  onDataChange,
  onDelete,
  onAddProperty,
  onAddArrayItem,
  onRenameKey,
  onSave,
  onUndo,
  onRedo,
  onTextEditorChange,
  onExpandedChange,
  onScrollPositionChange,
  onExpandAll,
  onToggleKeyFilterMode,
  onBeginKeyFilterSelection,
  onDraftKeySelectedChange,
  onDraftKeyFilterQueryChange,
  onApplyKeyFilter,
  onCancelKeyFilterSelection,
  onClearKeyFilter,
  onToggleColumnProjectionMode,
  onBeginColumnProjectionSelection,
  onDraftColumnSelectedChange,
  onDraftColumnProjectionQueryChange,
  onApplyColumnProjection,
  onCancelColumnProjectionSelection,
  onClearColumnProjection,
  onPasteTab
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const jsonViewerContainerRef = useRef<HTMLDivElement>(null)

  const manageHighlightAndScroll = useCallback(() => {
    const container = jsonViewerContainerRef.current
    if (!container) return

    container.querySelectorAll('.highlight, .current-highlight').forEach((el) => {
      el.classList.remove('highlight', 'current-highlight')
    })

    if (tabData.searchResults.length > 0 && tabData.currentResultIndex >= 0) {
      const currentResult = tabData.searchResults[tabData.currentResultIndex]
      if (currentResult) {
        const timeoutId = setTimeout(() => {
          try {
            const escapedPath = CSS.escape(currentResult.path)
            const element = container.querySelector(
              `[data-path="${escapedPath}"], th.key[data-path="${escapedPath}"]`
            )
            if (element) {
              element.classList.add('current-highlight')
              const elementRect = element.getBoundingClientRect()
              const containerRect = container.getBoundingClientRect()
              const isPartiallyVisible =
                elementRect.top < containerRect.bottom && elementRect.bottom > containerRect.top
              if (!isPartiallyVisible) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
              }
            }
          } catch (e) {
            console.error('Error during highlight/scroll:', e)
          }
        }, 100)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [tabData.searchResults, tabData.currentResultIndex])

  useEffect(() => {
    manageHighlightAndScroll()
  }, [manageHighlightAndScroll])

  useEffect(() => {
    if (tabData.searchQuery === '' && jsonViewerContainerRef.current) {
      jsonViewerContainerRef.current
        .querySelectorAll('.highlight, .current-highlight')
        .forEach((el) => {
          el.classList.remove('highlight', 'current-highlight')
        })
    }
  }, [tabData.searchQuery])

  useEffect(() => {
    if (searchVisible && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchVisible])

  useLayoutEffect(() => {
    const container = jsonViewerContainerRef.current
    if (container) {
      container.scrollTop = tabData.scrollTop
    }
  }, [tabData.id, tabData.scrollTop])

  const handleViewerScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      onScrollPositionChange?.(event.currentTarget.scrollTop)
    },
    [onScrollPositionChange]
  )

  const handleCloseSearch = useCallback(() => {
    onSearchVisibleChange(false)
    onClearSearch()
  }, [onSearchVisibleChange, onClearSearch])

  const isEditMode = tabData.mode === 'edit'
  const hasGridData =
    tabData.viewMode === 'grid' &&
    tabData.jsonData &&
    !(
      typeof tabData.jsonData === 'object' &&
      tabData.jsonData !== null &&
      'error' in tabData.jsonData
    )

  return (
    <div className="json-view-content">
      <div
        className="json-viewer-container"
        ref={jsonViewerContainerRef}
        onScroll={handleViewerScroll}
      >
        {searchVisible && (
          <div className="search-overlay">
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={tabData.searchQuery}
                  onChange={onSearchInputChange}
                  onKeyDown={(e) => {
                    onSearchKeyDown(e)
                    if (e.key === 'Escape') handleCloseSearch()
                  }}
                  placeholder="検索 (Enterで実行/次へ)"
                  disabled={!tabData.jsonData || tabData.jsonData.error}
                />
                {tabData.searchQuery && (
                  <button
                    className="clear-search"
                    onClick={onClearSearch}
                    aria-label="Clear search"
                  ></button>
                )}
              </div>
              <button
                className="search-nav-btn"
                onClick={onSearchExecute}
                disabled={!tabData.searchQuery || !tabData.jsonData || tabData.jsonData.error}
              >
                検索
              </button>
              <button
                className="search-nav-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onNextResult()
                  searchInputRef.current?.focus()
                }}
                disabled={tabData.searchResults.length === 0}
              >
                ▼{' '}
                {tabData.searchResults.length > 0
                  ? `${tabData.currentResultIndex + 1}/${tabData.searchResults.length}`
                  : ''}
              </button>
              <button className="search-close-btn" onClick={handleCloseSearch} title="閉じる (Esc)">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 4.6L1.7.3.3 1.7 4.6 6 .3 10.3l1.4 1.4L6 7.4l4.3 4.3 1.4-1.4L7.4 6l4.3-4.3L10.3.3z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {hasGridData && (
          <div className="edit-actions-overlay">
            <button className="floating-btn" onClick={onExpandAll} title="全て展開">
              全て展開
            </button>
            <button
              className={`floating-btn ${tabData.keyFilterMode ? 'active' : ''}`}
              onClick={onToggleKeyFilterMode}
              title="キー絞込モード"
            >
              キー絞込{hasAnyActiveKeyFilter(tabData.keyFilters) ? ' *' : ''}
            </button>
            <button
              className={`floating-btn ${tabData.columnProjectionMode ? 'active' : ''}`}
              onClick={onToggleColumnProjectionMode}
              title="配列のネストした値を列として選択"
            >
              列選択{hasAnyActiveColumnProjection(tabData.columnProjections) ? ' *' : ''}
            </button>
            <span className="floating-separator" />
            <CopyFilterButton jsonData={tabData.jsonData} keyFilters={tabData.keyFilters} columnProjections={tabData.columnProjections} />
            {isEditMode && <span className="floating-separator" />}
            {isEditMode && (
              <>
                <button
                  className="floating-btn"
                  onClick={onUndo}
                  disabled={tabData.history.undo.length === 0}
                  title="元に戻す (Ctrl+Z)"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.5 2v4.5H8l-1.6-1.6A3.5 3.5 0 0 1 12 8.5 3.5 3.5 0 0 1 6.4 10l-1.1 1.1A5 5 0 1 0 7.6 4.1L10 2H3.5z" />
                  </svg>
                </button>
                <button
                  className="floating-btn"
                  onClick={onRedo}
                  disabled={tabData.history.redo.length === 0}
                  title="やり直し (Ctrl+Shift+Z)"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.5 2v4.5H8l1.6-1.6A3.5 3.5 0 0 0 4 8.5a3.5 3.5 0 0 0 5.6 1.5l1.1 1.1A5 5 0 1 1 8.4 4.1L6 2h6.5z" />
                  </svg>
                </button>
                <span className="floating-separator" />
                <button
                  className="floating-btn save-btn"
                  onClick={onSave}
                  disabled={!tabData.isDirty}
                  title="保存 (Ctrl+S)"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.5 1h-12A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h12a1.5 1.5 0 0 0 1.5-1.5V5l-4-4zM5 2h4v3H5V2zm6 12H5v-4h6v4zm2-.5a.5.5 0 0 1-.5.5H12V9H4v5H2.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H4v4h6V2.5l3 3V13.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}

        {tabData.viewMode === 'text' ? (
          tabData.jsonData ? (
            typeof tabData.jsonData === 'object' &&
            tabData.jsonData !== null &&
            'error' in tabData.jsonData ? (
              <div className="center-panel error-panel">
                <p>エラー:</p>
                <pre>
                  {typeof tabData.jsonData.error === 'string'
                    ? tabData.jsonData.error
                    : JSON.stringify(tabData.jsonData.error)}
                </pre>
              </div>
            ) : (
              <TextEditor tabData={tabData} onChange={onTextEditorChange || (() => {})} />
            )
          ) : (
            <div className="center-panel">
              <p>JSON/YAMLファイルをドラッグ&ドロップしてください</p>
              <p className="center-panel-sub">
                <span>または、クリップボードからペースト</span>
                <button
                  className="paste-zone-btn"
                  onClick={onPasteTab}
                  title="クリップボードからペースト (Ctrl+V)"
                  aria-label="クリップボードからペースト"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V2zm2-1a1 1 0 0 0-1 1v1h6V2a1 1 0 0 0-1-1H6zM3 4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3z" />
                  </svg>
                </button>
              </p>
            </div>
          )
        ) : tabData.jsonData ? (
          typeof tabData.jsonData === 'object' &&
          tabData.jsonData !== null &&
          'error' in tabData.jsonData ? (
            <div className="center-panel error-panel">
              <p>エラー:</p>
              <pre>
                {typeof tabData.jsonData.error === 'string'
                  ? tabData.jsonData.error
                  : JSON.stringify(tabData.jsonData.error)}
              </pre>
            </div>
          ) : (
            <div className="json-viewer">
              <Cell
                element={tabData.jsonData}
                searchQuery={tabData.searchQuery}
                searchResults={tabData.searchResults}
                currentResultIndex={tabData.currentResultIndex}
                path=""
                isRoot={true}
                isEditMode={isEditMode}
                onDataChange={onDataChange}
                onDelete={onDelete}
                onExpandedChange={onExpandedChange}
                expandedPaths={tabData.expandedPaths}
                keyFilterMode={tabData.keyFilterMode}
                keyFilters={tabData.keyFilters}
                onBeginKeyFilterSelection={onBeginKeyFilterSelection}
                onDraftKeySelectedChange={onDraftKeySelectedChange}
                onDraftKeyFilterQueryChange={onDraftKeyFilterQueryChange}
                onApplyKeyFilter={onApplyKeyFilter}
                onCancelKeyFilterSelection={onCancelKeyFilterSelection}
                onClearKeyFilter={onClearKeyFilter}
                columnProjectionMode={tabData.columnProjectionMode}
                columnProjections={tabData.columnProjections}
                onBeginColumnProjectionSelection={onBeginColumnProjectionSelection}
                onDraftColumnSelectedChange={onDraftColumnSelectedChange}
                onDraftColumnProjectionQueryChange={onDraftColumnProjectionQueryChange}
                onApplyColumnProjection={onApplyColumnProjection}
                onCancelColumnProjectionSelection={onCancelColumnProjectionSelection}
                onClearColumnProjection={onClearColumnProjection}
              />
            </div>
          )
        ) : tabData.filePath ? (
          <div className="center-panel">
            <p>{tabData.fileName} を読み込み中...</p>
          </div>
        ) : (
          <div className="center-panel">
            <p>JSON/YAMLファイルをドラッグ&ドロップしてください</p>
            <p className="center-panel-sub">
              <span>または、クリップボードからペースト</span>
              <button
                className="paste-zone-btn"
                onClick={onPasteTab}
                title="クリップボードからペースト (Ctrl+V)"
                aria-label="クリップボードからペースト"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V2zm2-1a1 1 0 0 0-1 1v1h6V2a1 1 0 0 0-1-1H6zM3 4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3z" />
                </svg>
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function CopyFilterButton({
  jsonData,
  keyFilters,
  columnProjections
}: {
  jsonData: unknown
  keyFilters: import('../Cell/keyFilter').KeyFilterState
  columnProjections: ColumnProjectionState
}) {
  const [copied, setCopied] = useState(false)
  const hasFilters = hasAnyActiveKeyFilter(keyFilters)
  const hasProjections = hasAnyActiveColumnProjection(columnProjections)
  const hasAny = hasFilters || hasProjections

  const handleClick = useCallback(() => {
    let data = applyKeyFiltersToData(jsonData, keyFilters)
    data = applyColumnProjectionsToData(data, columnProjections)
    const text = JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }, [jsonData, keyFilters, columnProjections])

  return (
    <button
      className={`floating-btn ${copied ? 'active' : ''}`}
      onClick={handleClick}
      disabled={!hasAny}
      title={copied ? 'コピーしました' : 'フィルター/列選択適用後のデータをコピー'}
      aria-label="フィルター/列選択適用後のデータをコピー"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4 2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h1V2zm2-1a1 1 0 0 0-1 1v1h6V2a1 1 0 0 0-1-1H6zM3 4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H3z" />
      </svg>
    </button>
  )
}

export default JsonViewComponent

import React, { useRef, useEffect, useCallback } from 'react';
import Cell from '../Cell/Cell';
import TextEditor from './TextEditor';
import { TabState } from '../../App';
import '../../App.css';

interface JsonViewProps {
  tabData: TabState;
  searchVisible: boolean;
  onSearchVisibleChange: (visible: boolean) => void;
  onSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchExecute: () => void;
  onNextResult: () => void;
  onClearSearch: () => void;
  onDataChange?: (path: string, newValue: any) => void;
  onDelete?: (path: string) => void;
  onAddProperty?: (path: string, key: string, value: any) => void;
  onAddArrayItem?: (path: string, value: any) => void;
  onRenameKey?: (path: string, oldKey: string, newKey: string) => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onTextEditorChange?: (newText: string) => void;
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
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const jsonViewerContainerRef = useRef<HTMLDivElement>(null);

  const manageHighlightAndScroll = useCallback(() => {
    const container = jsonViewerContainerRef.current;
    if (!container) return;

    container.querySelectorAll('.highlight, .current-highlight').forEach(el => {
      el.classList.remove('highlight', 'current-highlight');
    });

    if (tabData.searchResults.length > 0 && tabData.currentResultIndex >= 0) {
      const currentResult = tabData.searchResults[tabData.currentResultIndex];
      if (currentResult) {
        const timeoutId = setTimeout(() => {
          try {
            const escapedPath = CSS.escape(currentResult.path);
            const element = container.querySelector(`[data-path="${escapedPath}"], th.key[data-path="${escapedPath}"]`);
            if (element) {
              element.classList.add('current-highlight');
              const elementRect = element.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              const isPartiallyVisible =
                elementRect.top < containerRect.bottom &&
                elementRect.bottom > containerRect.top;
              if (!isPartiallyVisible) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
              }
            }
          } catch (e) {
            console.error("Error during highlight/scroll:", e);
          }
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [tabData.searchResults, tabData.currentResultIndex]);

  useEffect(() => {
    manageHighlightAndScroll();
  }, [manageHighlightAndScroll]);

  useEffect(() => {
    if (tabData.searchQuery === '' && jsonViewerContainerRef.current) {
      jsonViewerContainerRef.current.querySelectorAll('.highlight, .current-highlight').forEach(el => {
        el.classList.remove('highlight', 'current-highlight');
      });
    }
  }, [tabData.searchQuery]);

  useEffect(() => {
    if (searchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchVisible]);

  const handleCloseSearch = useCallback(() => {
    onSearchVisibleChange(false);
    onClearSearch();
  }, [onSearchVisibleChange, onClearSearch]);

  const isEditMode = tabData.mode === 'edit';

  return (
    <div className="json-view-content">
      <div className="json-viewer-container" ref={jsonViewerContainerRef}>

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
                    onSearchKeyDown(e);
                    if (e.key === 'Escape') handleCloseSearch();
                  }}
                  placeholder="検索 (Enterで実行/次へ)"
                  disabled={!tabData.jsonData || tabData.jsonData.error}
                />
                {tabData.searchQuery && (
                  <button className="clear-search" onClick={onClearSearch} aria-label="Clear search"></button>
                )}
              </div>
              <button className="search-nav-btn" onClick={onSearchExecute} disabled={!tabData.searchQuery || !tabData.jsonData || tabData.jsonData.error}>
                検索
              </button>
              <button
                className="search-nav-btn"
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                  onNextResult();
                  searchInputRef.current?.focus();
                }}
                disabled={tabData.searchResults.length === 0}
              >
                ▼ {tabData.searchResults.length > 0 ? `${tabData.currentResultIndex + 1}/${tabData.searchResults.length}` : ''}
              </button>
              <button className="search-close-btn" onClick={handleCloseSearch} title="閉じる (Esc)">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 4.6L1.7.3.3 1.7 4.6 6 .3 10.3l1.4 1.4L6 7.4l4.3 4.3 1.4-1.4L7.4 6l4.3-4.3L10.3.3z"/></svg>
              </button>
            </div>
          </div>
        )}

        {isEditMode && (
          <div className="edit-actions-overlay">
            <button className="floating-btn" onClick={onUndo} disabled={tabData.history.undo.length === 0} title="元に戻す (Ctrl+Z)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 2v4.5H8l-1.6-1.6A3.5 3.5 0 0 1 12 8.5 3.5 3.5 0 0 1 6.4 10l-1.1 1.1A5 5 0 1 0 7.6 4.1L10 2H3.5z"/></svg>
            </button>
            <button className="floating-btn" onClick={onRedo} disabled={tabData.history.redo.length === 0} title="やり直し (Ctrl+Shift+Z)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M12.5 2v4.5H8l1.6-1.6A3.5 3.5 0 0 0 4 8.5a3.5 3.5 0 0 0 5.6 1.5l1.1 1.1A5 5 0 1 1 8.4 4.1L6 2h6.5z"/></svg>
            </button>
            <span className="floating-separator" />
            <button className="floating-btn save-btn" onClick={onSave} disabled={!tabData.isDirty} title="保存 (Ctrl+S)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1h-12A1.5 1.5 0 0 0 0 2.5v11A1.5 1.5 0 0 0 1.5 15h12a1.5 1.5 0 0 0 1.5-1.5V5l-4-4zM5 2h4v3H5V2zm6 12H5v-4h6v4zm2-.5a.5.5 0 0 1-.5.5H12V9H4v5H2.5a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H4v4h6V2.5l3 3V13.5z"/></svg>
            </button>
          </div>
        )}

        {tabData.viewMode === 'text' ? (
          tabData.jsonData ? (
            typeof tabData.jsonData === 'object' && tabData.jsonData !== null && 'error' in tabData.jsonData ? (
              <div className="center-panel error-panel">
                <p>エラー:</p>
                <pre>{typeof tabData.jsonData.error === 'string' ? tabData.jsonData.error : JSON.stringify(tabData.jsonData.error)}</pre>
              </div>
            ) : (
              <TextEditor tabData={tabData} onChange={onTextEditorChange || (() => {})} />
            )
          ) : (
            <div className="center-panel">
              <p>JSON/YAMLファイルをドラッグ&ドロップしてください</p>
            </div>
          )
        ) : (
          tabData.jsonData ? (
            typeof tabData.jsonData === 'object' && tabData.jsonData !== null && 'error' in tabData.jsonData ? (
              <div className="center-panel error-panel">
                <p>エラー:</p>
                <pre>{typeof tabData.jsonData.error === 'string' ? tabData.jsonData.error : JSON.stringify(tabData.jsonData.error)}</pre>
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
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default JsonViewComponent;

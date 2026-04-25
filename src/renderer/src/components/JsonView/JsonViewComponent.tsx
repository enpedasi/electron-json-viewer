import React, { useRef, useEffect, useCallback } from 'react';
import Cell from '../Cell/Cell';
import TextEditor from './TextEditor';
import { TabState } from '../../App';
import '../../App.css';

interface JsonViewProps {
  tabData: TabState;
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
  onToggleEditMode?: () => void;
  onToggleViewMode?: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onTextEditorChange?: (newText: string) => void;
}

const JsonViewComponent: React.FC<JsonViewProps> = ({
  tabData,
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
  onToggleEditMode,
  onToggleViewMode,
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

  const isEditMode = tabData.mode === 'edit';

  return (
    <div className="json-view-content">
      {/* ツールバー */}
      <div className="edit-toolbar">
        <div className="toolbar-left">
          <button
            className={`toolbar-btn mode-btn ${isEditMode ? 'active' : ''}`}
            onClick={onToggleEditMode}
            title={isEditMode ? '閲覧モードに切替' : '編集モードに切替'}
          >
            {isEditMode ? '✏️ 編集中' : '👁 閲覧中'}
          </button>
          <button
            className={`toolbar-btn view-btn ${tabData.viewMode === 'text' ? 'active' : ''}`}
            onClick={onToggleViewMode}
            title={tabData.viewMode === 'grid' ? 'テキスト表示' : 'グリッド表示'}
          >
            {tabData.viewMode === 'grid' ? '{ } テキスト' : '⚏ グリッド'}
          </button>
          {isEditMode && (
            <>
              <button className="toolbar-btn" onClick={onUndo} disabled={tabData.history.undo.length === 0} title="元に戻す (Ctrl+Z)">
                ↶ 取消
              </button>
              <button className="toolbar-btn" onClick={onRedo} disabled={tabData.history.redo.length === 0} title="やり直し (Ctrl+Shift+Z)">
                ↷ 再実行
              </button>
              <button className="toolbar-btn save-btn" onClick={onSave} disabled={!tabData.isDirty} title="保存 (Ctrl+S)">
                💾 保存
              </button>
            </>
          )}
        </div>
        {/* 検索バー */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              value={tabData.searchQuery}
              onChange={onSearchInputChange}
              onKeyDown={onSearchKeyDown}
              placeholder="検索 (Enterで実行/次へ)"
              disabled={!tabData.jsonData || tabData.jsonData.error}
            />
            {tabData.searchQuery && (
              <button className="clear-search" onClick={onClearSearch} aria-label="Clear search"></button>
            )}
          </div>
          <button onClick={onSearchExecute} disabled={!tabData.searchQuery || !tabData.jsonData || tabData.jsonData.error}>
            検索
          </button>
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              onNextResult();
              searchInputRef.current?.focus();
            }}
            disabled={tabData.searchResults.length === 0}
          >
            次へ {tabData.searchResults.length > 0 ? `(${tabData.currentResultIndex + 1}/${tabData.searchResults.length})` : ''}
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="json-viewer-container" ref={jsonViewerContainerRef}>
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
              <p>JSONファイルをドラッグ&ドロップしてください</p>
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
              <p>JSONファイルをドラッグ&ドロップしてください</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default JsonViewComponent;

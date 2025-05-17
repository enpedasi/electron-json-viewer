// src/renderer/src/components/JsonView/JsonViewComponent.tsx
// 新規作成
import React, { useRef, useEffect, useCallback } from 'react';
import Cell from '../Cell/Cell'; // Cellコンポーネントをインポート
import { TabState } from '../../App'; // App.tsx から TabState をインポート
import '../../App.css'; // App.css または専用のCSS

interface JsonViewProps {
  tabData: TabState;
  // onDataChange: (updates: Partial<Omit<TabState, 'id'>>) => void; // 状態更新用コールバックはApp側で行うので削除
  onSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchExecute: () => void;
  onNextResult: () => void;
  onClearSearch: () => void;
}

const JsonViewComponent: React.FC<JsonViewProps> = ({
  tabData,
  onSearchInputChange,
  onSearchKeyDown,
  onSearchExecute,
  onNextResult,
  onClearSearch,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const jsonViewerContainerRef = useRef<HTMLDivElement>(null); // コンテナのref

  // ハイライトとスクロールを管理する関数
  const manageHighlightAndScroll = useCallback(() => {
    const container = jsonViewerContainerRef.current;
    if (!container) return;

    // 既存のハイライトをすべてクリア
    container.querySelectorAll('.highlight, .current-highlight').forEach(el => {
        el.classList.remove('highlight', 'current-highlight');
    });

    if (tabData.searchResults.length > 0 && tabData.currentResultIndex >= 0) {
      const currentResult = tabData.searchResults[tabData.currentResultIndex];
      if (currentResult) {
        // 少し待ってから要素を探してスクロール
        const timeoutId = setTimeout(() => {
          try {
            // CSSセレクター用にパスをエスケープ
            const escapedPath = CSS.escape(currentResult.path);
            // data-path属性を持つ要素を探す (Cell または th.key)
            const element = container.querySelector(`[data-path="${escapedPath}"], th.key[data-path="${escapedPath}"]`);

            if (element) {
               // 現在の結果にハイライトクラスを追加
              element.classList.add('current-highlight');

              // 要素がビューポート内に表示されているか確認
              const elementRect = element.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();

              // 要素がコンテナの表示領域内に完全に見えているか、または一部見えているか
              const isVisible =
                elementRect.top >= containerRect.top &&
                elementRect.left >= containerRect.left &&
                elementRect.bottom <= containerRect.bottom &&
                elementRect.right <= containerRect.right;

              const isPartiallyVisible =
                elementRect.top < containerRect.bottom &&
                elementRect.bottom > containerRect.top; // 縦方向のみチェック（横スクロールは未考慮）

              // 要素が見えていない場合のみスクロール
              if (!isPartiallyVisible) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
              }
            } else {
              console.warn(`Element with data-path="${currentResult.path}" not found for highlighting/scrolling.`);
            }
          } catch (e) {
              console.error("Error during highlight/scroll:", e);
          }
        }, 100); // DOM更新後のタイミングで実行するための遅延
        return () => clearTimeout(timeoutId); // クリーンアップ
      }
    }
  }, [tabData.searchResults, tabData.currentResultIndex]); // 依存関係

  // 検索結果またはインデックスが変わったらハイライトとスクロールを実行
  useEffect(() => {
    manageHighlightAndScroll();
  }, [manageHighlightAndScroll]); // manageHighlightAndScroll 関数自体を依存関係にする


  // searchQuery が空になったらハイライトをクリア（既に manageHighlightAndScroll で処理されているかも）
  useEffect(() => {
      if (tabData.searchQuery === '' && jsonViewerContainerRef.current) {
           jsonViewerContainerRef.current.querySelectorAll('.highlight, .current-highlight').forEach(el => {
             el.classList.remove('highlight', 'current-highlight');
         });
      }
  }, [tabData.searchQuery]);


  return (
    // このコンポーネント用のラッパー div
    <div className="json-view-content">
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
            disabled={!tabData.jsonData || tabData.jsonData.error} // データがないかエラーの場合は無効化
          />
          {tabData.searchQuery && (
            <button className="clear-search" onClick={onClearSearch} aria-label="Clear search"></button>
          )}
        </div>
        <button onClick={onSearchExecute} disabled={!tabData.searchQuery || !tabData.jsonData || tabData.jsonData.error}>
          検索
        </button>
        <button
           onMouseDown={e => e.preventDefault()} // フォーカス移動阻止
           onClick={() => {
             onNextResult();
             searchInputRef.current?.focus(); // 再フォーカス
           }}
           disabled={tabData.searchResults.length === 0} // 結果がないときは無効化
        >
          次へ {tabData.searchResults.length > 0 ? `(${tabData.currentResultIndex + 1}/${tabData.searchResults.length})` : ''}
        </button>
      </div>

      {/* JSON表示エリア (スクロール可能) */}
      <div className="json-viewer-container" ref={jsonViewerContainerRef}>
        {tabData.jsonData ? (
           // エラーオブジェクトかどうかの判定を改善
           typeof tabData.jsonData === 'object' && tabData.jsonData !== null && 'error' in tabData.jsonData ? (
                 <div className="center-panel error-panel">
                    <p>エラー:</p>
                    {/* エラー内容を安全に表示 */}
                    <pre>{typeof tabData.jsonData.error === 'string' ? tabData.jsonData.error : JSON.stringify(tabData.jsonData.error)}</pre>
                 </div>
           ) : (
                <div className="json-viewer">
                    <Cell
                        element={tabData.jsonData}
                        searchQuery={tabData.searchQuery}
                        searchResults={tabData.searchResults}
                        currentResultIndex={tabData.currentResultIndex}
                        path="" // Root path
                        isRoot={true} // ルート要素はデフォルトで展開
                        // searchInputRef は不要になった
                    />
                </div>
           )
        ) : tabData.filePath ? (
            // filePathはあるがjsonDataがない場合（読み込み中など）
            <div className="center-panel">
                <p>{tabData.fileName} を読み込み中...</p>
            </div>
        ): (
          // jsonDataもfilePathもない場合（例: 新規タブ）
          <div className="center-panel">
             <p>JSONファイルをドラッグ&ドロップしてください</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonViewComponent;

import React, { useState, useEffect, useCallback } from 'react';
// import Cell from './components/Cell/Cell'; // JsonViewComponent に移動
import './App.css';
import TabsComponent from './components/Tabs/TabsComponent'; // 新規
import JsonViewComponent from './components/JsonView/JsonViewComponent'; // 新規
import { v4 as uuidv4 } from 'uuid'; // ID生成用

declare global {
  interface Window {
    electron: {
      handleFilesOpen: (callback: (event: any, filePaths: string[]) => void) => (() => void) | undefined; // 修正：複数ファイル対応、戻り値の型
      readFile: (filePath: string) => Promise<string>;
      setWindowTitle: (filePath: string | null) => void; // タイトル設定用の型を追加
      handleFileDrop: (filePath: string) => Promise<string>; // 新しいメソッドの型を追加
      platform?: string; // platformプロパティを追加（オプション）
      // 必要ならリスナー削除用の関数も追加
    }
  }
}

// TabState インターフェースの定義
export interface TabState { // export して JsonViewComponent でも使えるようにする
  id: string;
  filePath: string | null;
  fileName: string; // 表示用
  jsonData: any;
  searchQuery: string;
  searchResults: Array<{ path: string; value: any }>;
  currentResultIndex: number;
  // 必要ならスクロール位置なども保存
}

function App() {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // --- タブ操作 ---
  const addTab = useCallback((filePath: string | null = null, data: any = null, makeActive = true): string => {
    const newTabId = uuidv4();
    // ファイル名取得ロジックを安全に
    const getFileName = (path: string | null): string => {
      if (!path) return 'Untitled';
      try {
        // Electron環境かどうか、プラットフォームは何かを考慮
        if (window.electron?.platform) {
          const separator = window.electron.platform === 'win32' ? '\\' : '/';
          return path.substring(path.lastIndexOf(separator) + 1);
        }
        // ブラウザなどElectron環境外の場合（フォールバック）
        return path.substring(path.lastIndexOf('/') + 1);
      } catch (e) {
        console.error("Error getting file name:", e);
        return 'Untitled';
      }
    };
    const fileName = getFileName(filePath);

    const newTab: TabState = {
      id: newTabId,
      filePath: filePath,
      fileName: fileName,
      jsonData: data,
      searchQuery: '',
      searchResults: [],
      currentResultIndex: -1, // 初期値は -1 が適切
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    if (makeActive || tabs.length === 0) { // 最初のタブもアクティブにする
      setActiveTabId(newTabId);
    }
    return newTabId;
  }, [tabs.length]); // tabs.length を依存配列に追加

  const closeTab = useCallback((tabIdToClose: string) => {
    setTabs(prevTabs => {
      const indexToClose = prevTabs.findIndex(tab => tab.id === tabIdToClose);
      if (indexToClose === -1) return prevTabs;

      const newTabs = prevTabs.filter(tab => tab.id !== tabIdToClose);

      if (activeTabId === tabIdToClose) {
        if (newTabs.length === 0) {
          setActiveTabId(null);
          // オプション：最後のタブを閉じたら新しい空タブを追加する
          // addTab(null, null, true);
        } else {
          // 隣接するタブ（優先的に前、なければ後ろ）をアクティブにする
          const newActiveIndex = Math.max(0, indexToClose -1); // 前のタブ
          const nextActiveIndex = indexToClose < newTabs.length ? indexToClose : newTabs.length - 1; // 閉じた位置 or 最後のタブ
          setActiveTabId(newTabs[newActiveIndex < newTabs.length ? newActiveIndex : nextActiveIndex]?.id || null);
        }
      }
      return newTabs;
    });
  }, [activeTabId]); // addTab は依存関係から削除

  const updateTabData = useCallback((tabId: string, updates: Partial<Omit<TabState, 'id'>>) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  }, []);


  // --- ファイル処理 ---
  const loadFileIntoTab = useCallback(async (filePath: string, tabId: string) => {
     // 既に読み込み済み、または読み込み中の場合はスキップ（オプション）
     const existingTab = tabs.find(t => t.id === tabId);
     if (existingTab && existingTab.jsonData) {
         console.log(`Tab ${tabId} already has data for ${filePath}`);
         return;
     }

    try {
      let fileContent;
      if (window.electron && window.electron.readFile) {
        fileContent = await window.electron.readFile(filePath);
      } else {
        console.warn("readFile not available and not in Electron context.");
        updateTabData(tabId, { jsonData: { error: `Cannot read file outside Electron environment.` }, filePath: filePath, fileName: `Error - ${getFileName(filePath)}` });
        return;
      }

      const json = JSON.parse(fileContent);
      const fileName = getFileName(filePath); // ファイル名を再取得（念のため）
      updateTabData(tabId, { jsonData: json, filePath: filePath, fileName: fileName });

    } catch (error: any) {
      console.error('Error loading file into tab:', filePath, error);
      const fileName = getFileName(filePath);
      updateTabData(tabId, { jsonData: { error: `Failed to load or parse: ${error.message || error}` }, filePath: filePath, fileName: `Error - ${fileName}` });
    }
  }, [updateTabData, tabs]); // tabs を依存関係に追加

   // ファイル名取得ヘルパー（useCallbackの外で定義しても良い）
   const getFileName = (path: string | null): string => {
     if (!path) return 'Untitled';
     try {
       if (window.electron?.platform) {
         const separator = window.electron.platform === 'win32' ? '\\' : '/';
         return path.substring(path.lastIndexOf(separator) + 1);
       }
       return path.substring(path.lastIndexOf('/') + 1);
     } catch (e) {
       console.error("Error getting file name:", e);
       return 'Untitled';
     }
   };

  const handleDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 1 && activeTabId) {
        // 1ファイルのみ & アクティブタブあり → 既存タブに上書き
        const file = files[0];
        if ((file as any).path && window.electron) {
          const filePath = (file as any).path;
          await loadFileIntoTab(filePath, activeTabId);
        } else {
          console.warn(`Cannot get file path for dropped file: ${file.name}. Dropping files might only work reliably within Electron.`);
        }
      } else {
        // 複数ファイル or アクティブタブなし → 新規タブ
        for (const file of files) {
          if ((file as any).path && window.electron) {
            const filePath = (file as any).path;
            const newTabId = addTab(filePath, null, true);
            await loadFileIntoTab(filePath, newTabId);
          } else {
            console.warn(`Cannot get file path for dropped file: ${file.name}. Dropping files might only work reliably within Electron.`);
          }
        }
      }
    }
  }, [addTab, loadFileIntoTab, activeTabId]);


  // --- 初期化とイベントリスナー ---
   useEffect(() => {
    // 初期タブ（空のタブ）
    if (tabs.length === 0) {
       addTab(null, null, true);
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

     // document 全体で drag/drop を受け付ける
     document.addEventListener('dragover', handleDragOver);
     document.addEventListener('drop', handleDrop);

     // file-opened イベント（アプリ起動時やDockからのファイルオープン）
     let removeFilesOpenListener: (() => void) | undefined;
     if (window.electron?.handleFilesOpen) {
         removeFilesOpenListener = window.electron.handleFilesOpen((event, filePaths) => {
             console.log('Files opened via event:', filePaths);
             filePaths.forEach((filePath, index) => {
                 // 既に開いているタブがないか確認（オプション）
                 const existingTab = tabs.find(tab => tab.filePath === filePath);
                 if (existingTab) {
                     setActiveTabId(existingTab.id); // 既存タブをアクティブにする
                     if (index === 0) { /* only log once */ console.log(`Tab for ${filePath} already exists.`); }
                 } else {
                     const makeActive = index === 0; // 最初のファイルだけアクティブにする
                     const newTabId = addTab(filePath, null, makeActive);
                     loadFileIntoTab(filePath, newTabId);
                 }
             });
         });
     }

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
      // クリーンアップ関数を呼ぶ
      if (removeFilesOpenListener && typeof removeFilesOpenListener === 'function') {
        removeFilesOpenListener();
      }
    };
   }, [addTab, handleDrop, loadFileIntoTab, tabs]); // tabs を依存配列に追加（既存タブチェックのため）

  // --- ウィンドウタイトル更新 ---
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    // main プロセスに filePath を渡してタイトルを設定してもらう
    if (window.electron?.setWindowTitle) {
      window.electron.setWindowTitle(activeTab?.filePath ?? null);
    } else {
        // Electron外の場合のフォールバック
        document.title = activeTab ? activeTab.fileName : 'JSON Grid Viewer';
    }
  }, [activeTabId, tabs]);

  // --- アクティブなタブの取得 ---
  const activeTabData = tabs.find(tab => tab.id === activeTabId);

  // --- 検索関連処理（アクティブタブに対して行う） ---
   const handleSearch = useCallback(() => {
    if (!activeTabData) return;
    const results = searchJson(activeTabData.jsonData, activeTabData.searchQuery);
    updateTabData(activeTabData.id, { searchResults: results, currentResultIndex: results.length > 0 ? 0 : -1 });
  }, [activeTabData, updateTabData]);

  const handleNextResult = useCallback(() => {
    if (!activeTabData || activeTabData.searchResults.length === 0) return;
    const nextIndex = (activeTabData.currentResultIndex + 1) % activeTabData.searchResults.length;
    updateTabData(activeTabData.id, { currentResultIndex: nextIndex });
  }, [activeTabData, updateTabData]);

  const clearSearch = useCallback(() => {
    if (!activeTabData) return;
    // 検索クエリ、結果、インデックスをリセット
    updateTabData(activeTabData.id, { searchQuery: '', searchResults: [], currentResultIndex: -1 });
  }, [activeTabData, updateTabData]);

   const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
     if (!activeTabData) return;
     const query = e.target.value;
     // 検索クエリのみ更新し、結果はEnterかボタンで実行
     updateTabData(activeTabData.id, { searchQuery: query, searchResults: [], currentResultIndex: -1 }); // 入力変更で結果はクリア
   }, [activeTabData, updateTabData]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.key !== 'Enter') return;
    if (!activeTabData || !activeTabData.searchQuery) return; // クエリがない場合は何もしない

    // Enterキーで検索実行または次の結果へ
    if (activeTabData.searchResults.length > 0) {
        handleNextResult(); // 既に結果がある場合は次へ
    } else {
        handleSearch(); // 結果がない場合は検索実行
    }
  }, [activeTabData, handleSearch, handleNextResult]);

  // --- レンダリング ---
  return (
    <div className="app-container vscode-dark">
      <TabsComponent
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTab}
        onAddTab={() => addTab(null, null, true)} // 「+」ボタンで空タブ追加
      />
      <div className="json-view-area"> {/* タブ下のコンテンツエリア */}
        {activeTabData ? (
          <JsonViewComponent
            key={activeTabData.id} // タブ切り替え時にコンポーネントを再生成して状態をリセット
            tabData={activeTabData}
            // onDataChange={(updates) => updateTabData(activeTabData.id, updates)} // JsonViewComponent が直接状態を変える必要はない
            onSearchInputChange={handleSearchInputChange}
            onSearchKeyDown={handleSearchKeyDown}
            onSearchExecute={handleSearch}
            onNextResult={handleNextResult}
            onClearSearch={clearSearch}
          />
        ) : (
          <div className="center-panel">
            {tabs.length > 0 ? (
                <p>タブを選択してください。</p>
            ) : (
                <p>ファイルを開くか、ドラッグ＆ドロップ、または「+」ボタンで新しいタブを開始してください。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function searchJson(json: any, query: string) {
  const results: { path: string; value: any; }[] = [];
  const searchQuery = query.toLowerCase(); // クエリを小文字に変換
  const search = (obj: any, path = '') => {
    if (typeof obj === 'object' && obj !== null) {
      // Note: A more robust solution might handle circular references.
      // Limit recursion depth to prevent stack overflow with large/deep objects
      const currentDepth = path.split('.').length + path.split('[').length -1;
      if (currentDepth > 50) { // Adjust depth limit as needed
        // console.warn(`Search depth limit reached at path: ${path}`);
        return;
      }

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const currentPath = Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`;
          if (key.toLowerCase().includes(searchQuery)) {
            results.push({ path: currentPath, value: key });
          }
          if (typeof value === 'object') {
            search(value, currentPath);
          } else if (String(value).toLowerCase().includes(searchQuery)) {
            results.push({ path: currentPath, value });
          }
        }
      }
    }
  };
  search(json);
  return results;
}

export default App;

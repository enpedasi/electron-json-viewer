import React, { useState, useEffect, useRef } from 'react';
import Cell from './components/Cell/Cell';
import './App.css';

declare global {
  interface Window {
    electron: {
      handleFileOpen: (callback: (event: any, filePath: string) => void) => void;
      readFile: (filePath: string) => Promise<string>;
      setWindowTitle: (filePath: string | null) => void; // タイトル設定用の型を追加
      handleFileDrop: (filePath: string) => Promise<string>; // 新しいメソッドの型を追加
      platform?: string; // platformプロパティを追加（オプション）
    }
  }
}

function App() {
  const [jsonData, setJsonData] = useState<any>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null); // 現在のファイルパスを保存
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{path:string;value:any}>>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  // ← ここで検索入力欄への ref を用意
  const searchInputRef = useRef<HTMLInputElement>(null);
  const jsonViewerContainerRef = useRef(null);

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];

      try {
        let fileContent;
        let filePath;

        // ファイルパスの取得方法
        if ((file as any).path) {
          filePath = (file as any).path;
        } else if ((file as any).webkitRelativePath) {
          filePath = (file as any).webkitRelativePath;
        } else {
          filePath = file.name;
        }

        if (window.electron) {

          try {
            // 新しい専用関数を使用
            if (window.electron.handleFileDrop) {
              fileContent = await window.electron.handleFileDrop(filePath);
            } else {
              // フォールバック: 以前の実装
              fileContent = await window.electron.readFile(filePath);

              // 明示的にタイトルを設定
              if (window.electron.setWindowTitle) {
                window.electron.setWindowTitle(filePath);
              }
            }

            setCurrentFilePath(filePath);
          } catch (readError) {
            console.error('Error reading file with path:', filePath, readError);
            // ファイル読み込みエラー時にも、タイトル設定を試みる
            if (window.electron.setWindowTitle) {
              window.electron.setWindowTitle(filePath);
            }
          }
        } else {
          // ウェブブラウザの場合
          fileContent = await file.text();
          setCurrentFilePath(file.name);
        }

        // ファイルの内容をJSONとしてパース
        const json = JSON.parse(fileContent);
        setJsonData(json);

        // 成功後にも、タイトル設定を確実に行う
        if (window.electron && window.electron.setWindowTitle) {
          window.electron.setWindowTitle(filePath);
        }
      } catch (error) {
        console.error('Error during file processing:', error);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSearch = () => {
    const results = searchJson(jsonData, searchQuery);
    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    resetSearch();
  };

  const handleNextResult = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex((prevIndex) => (prevIndex + 1) % searchResults.length);
    }
  };

  const handleSearchOrNext = () => {
    if (searchResults.length > 0) {
      handleNextResult();
    } else {
      handleSearch();
    }
  };

  const resetSearch = () => {
    setSearchResults([]);
    setCurrentResultIndex(0);

    // 既存のハイライトを削除
    const highlights = document.querySelectorAll('.highlight');
    highlights.forEach(el => {
      el.classList.remove('highlight', 'current-highlight');
    });
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value === '') {
      resetSearch();
    } else {
      handleSearch();
    }
  };

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    if (searchResults.length > 0) {
      const currentResult = searchResults[currentResultIndex];
      if (jsonViewerContainerRef.current) {
        setTimeout(() => {
          const element = document.querySelector(`[data-path="${currentResult.path}"]`);
          if (element) {
            document.body.style.overflow = 'visible';
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.body.style.overflow = 'hidden';
          }
        }, 200);
      }
    }
  }, [searchResults, currentResultIndex]);

  return (
    <div className="app-container vscode-dark">
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            // ← ref を入力欄にセット
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.key !== 'Enter') return;
              handleSearchOrNext();
            }}
            placeholder="検索"
          />
          {searchQuery && (
            <button className="clear-search" onClick={clearSearch} aria-label="Clear search"></button>
          )}
        </div>
        <button onClick={handleSearch}>検索</button>
        {/* ボタン押下後に入力欄を再度フォーカスさせる */}
        <button
          onMouseDown={e => e.preventDefault()}  // ← フォーカス移動を阻止
          onClick={() => {
            handleNextResult();
            searchInputRef.current?.focus();      // ← 再フォーカス
          }}
        >
          次へ
        </button>
      </div>
      <div className="json-viewer-container" ref={jsonViewerContainerRef} onDragOver={handleDragOver} onDrop={handleDrop}>
        {jsonData ? (
          <div className="json-viewer">
            <Cell
              element={jsonData}
              searchQuery={searchQuery}
              searchResults={searchResults}
              currentResultIndex={currentResultIndex}
              searchInputRef={searchInputRef}
              path=""
              isRoot={true}
            />
          </div>
        ) : (
          <div className="center-panel">
            <p>JSONファイルをドラッグ&ドロップしてください</p>
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

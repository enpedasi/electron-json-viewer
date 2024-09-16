import React, { useState, useEffect, useRef } from 'react';
import Cell from './components/Cell/Cell';
import './App.css';

declare global {
  interface Window {
    electron: {
      handleFileOpen: (callback: (event: any, filePath: string) => void) => void;
      readFile: (filePath: string) => Promise<string>;
    }
  }
}

function App() {
  const [jsonData, setJsonData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const searchInputRef = useRef(null);
  const jsonViewerContainerRef = useRef(null);

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      try {
        let fileContent;
        if (window.electron && window.electron.readFile) {
          // Electronアプリケーションの場合
          fileContent = await window.electron.readFile(file.path);
        } else {
          // ウェブブラウザの場合
          fileContent = await file.text();
        }
        const json = JSON.parse(fileContent);
        setJsonData(json);
      } catch (error) {
        console.error('Error reading or parsing file:', error);
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
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchInputChange(e)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <button onClick={handleNextResult}>次へ</button>
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

import React, { useState, useEffect, useRef } from 'react';
import Cell from './components/Cell/Cell';
import './App.css';

function App() {
  const [jsonData, setJsonData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const searchInputRef = useRef(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    const fileContent = await file.text();
    const json = JSON.parse(fileContent);
    setJsonData(json);
  };

  const handleSearch = () => {
    if (!jsonData || !searchQuery) return;
    const results = searchJson(jsonData, searchQuery);
    setSearchResults(results);

    // 検索結果に基づいて展開状態を更新
    /*
    const newExpandedItems = {};
    results.forEach(result => {
      result.path.forEach((_, index) => {
        const partialPath = result.path.slice(0, index + 1).join('.');
        newExpandedItems[partialPath] = true;
      });
    });
    setExpandedItems(newExpandedItems);
    */
  };

  const handleNextResult = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex((prevIndex) => (prevIndex + 1) % searchResults.length);
    }
  };

  useEffect(() => {
    if (searchResults.length > 0) {
      const currentResult = searchResults[currentResultIndex];
      if (searchInputRef.current) {
        searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchResults, currentResultIndex]);

  return (
    <div className="app-container vscode-dark" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="検索クエリを入力"
        />
        <button onClick={handleSearch}>検索</button>
        <button onClick={handleNextResult}>次へ</button>
      </div>
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
            // onToggleExpand={toggleExpanded}
          />
        </div>
      ) : (
        <p>JSONファイルをドラッグ&ドロップしてください</p>
      )}
    </div>
  );
}

function searchJson(json, query) {
  const results = [];
  const search = (obj, path = '') => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const currentPath = Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`;
          if (typeof value === 'object') {
            search(value, currentPath);
          } else if (String(value).includes(query)) {
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

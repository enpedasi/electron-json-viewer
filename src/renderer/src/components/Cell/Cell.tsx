import React, { useState, useLayoutEffect, memo, useRef, useEffect, useCallback } from 'react';
import ArrayTable from './ArrayTable';
import ObjectTable from './ObjectTable';

interface CellProps {
  element: any;
  depth?: number;
  searchQuery?: string;
  searchResults?: any[];
  currentResultIndex?: number;
  searchInputRef?: any;
  path?: string;
  isRoot?: boolean;
}

const Cell: React.FC<CellProps> = ({ element, depth = 0, searchQuery, searchResults, currentResultIndex, searchInputRef, path = '', isRoot = false }) => {
  // isRoot または検索結果に含まれる/始まる場合はデフォルトで展開
  const isInitiallyExpanded = isRoot || searchResults?.some(result => result.path.startsWith(path));
  const [expanded, setExpanded] = useState(isInitiallyExpanded);
  const cellRef = useRef<HTMLDivElement>(null); // 型を指定

  // searchQuery が変更されたら isInitiallyExpanded に基づいて展開状態をリセット
  useEffect(() => {
    setExpanded(isRoot || searchResults?.some(result => result.path.startsWith(path)) || false);
  }, [searchQuery, searchResults, path, isRoot]); // searchQuery と searchResults を依存関係に追加

  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === '+' || event.key === 'ArrowRight') {
      setExpanded(true);
    } else if (event.key === '-') {
      setExpanded(false);
    }
  }, []);

  useEffect(() => {
    // 検索結果が更新され、このCellが親である場合に展開する
    const shouldExpand = searchResults?.some(result => result.path !== path && result.path.startsWith(path));
    if (shouldExpand && !expanded) {
      setExpanded(true);
    }
  }, [searchResults, currentResultIndex, path, expanded]); // expanded を依存関係に追加

  useLayoutEffect(() => {
    // このCell自体が現在の検索結果である場合にスクロールして表示（親コンポーネントで管理されるべき）
    if (searchResults && currentResultIndex !== undefined && searchResults[currentResultIndex]?.path === path && cellRef.current) {
      cellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setExpanded(true);
    }
  }, [searchResults, currentResultIndex, path]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="current-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  if (depth >= 100) {
    return <span className="value">Max depth reached</span>;
  }

  if (Array.isArray(element)) {
    return (
      <div ref={cellRef} data-path={path} className="cell-container array-cell">
        <span className="array badge">Array[{element.length}]</span>
        <span className="expand" tabIndex={0}
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
        >{expanded ? '-' : '+'}
        </span>
        {expanded && <ArrayTable array={element} depth={depth + 1} searchQuery={searchQuery} searchResults={searchResults} currentResultIndex={currentResultIndex} searchInputRef={searchInputRef} path={path} />}
      </div>
    );
  } else if (typeof element === 'object' && element !== null) {
    return (
      <div ref={cellRef} data-path={path} className="cell-container object-cell">
        <span className="object badge">Object[{Object.keys(element).length}]</span>
        <span className="expand" tabIndex={0}
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
        >{expanded ? '-' : '+'}</span>
        {expanded &&
          <ObjectTable member={element} depth={depth + 1} searchQuery={searchQuery} searchResults={searchResults} currentResultIndex={currentResultIndex} searchInputRef={searchInputRef} path={path} />}
      </div>
    );
  } else {
    // この値自体が現在の検索結果か？
    const isCurrentValueResult = searchResults && currentResultIndex !== undefined && searchResults[currentResultIndex]?.path === path;
    const valueString = String(element);
    return (
      <span ref={cellRef} className={`value ${typeof element} ${isCurrentValueResult ? 'current-highlight' : ''}`} data-path={path}>
        {highlightText(valueString, searchQuery || '')}
      </span>
    );
  }
};

export default memo(Cell);

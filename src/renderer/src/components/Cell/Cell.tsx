import React, { useState, useLayoutEffect, memo, useRef, useEffect } from 'react';
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
  const [expanded, setExpanded] = useState(isRoot);
  const cellRef = useRef(null);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleKeyDown = (event) => {
    if (event.key === '+') {
      setExpanded(true);
    } else if (event.key === '-') {
      setExpanded(false);
    }
  };

  useEffect(() => {
    if (searchResults && searchResults[currentResultIndex]?.path.startsWith(path)) {
      setExpanded(true);
    }
  }, [searchResults, currentResultIndex, path]);

  useLayoutEffect(() => {
    if (searchResults && searchResults[currentResultIndex]?.path === path) {
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
      <div ref={cellRef} data-path={path}>
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
      <div ref={cellRef} data-path={path}>
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
    const isHighlighted = searchResults?.some(result => result.path === path && result.value === element);
    const isCurrentResult = searchResults?.[currentResultIndex]?.path === path;
    return (
      <span className={`value ${isHighlighted ? 'highlight' : ''} }`} ref={isHighlighted ? searchInputRef : null} data-path={path}>
        {highlightText(String(element), isCurrentResult ? searchQuery: '')}
      </span>
    );
  }
};

export default memo(Cell);

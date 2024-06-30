import React, { useState, useEffect, memo, useRef } from 'react';
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
      setExpanded(!expanded);
    } else if (event.key === '-') {
      setExpanded(!expanded);
    }
  };

  useEffect(() => {
    if (searchResults && searchResults[currentResultIndex]?.path === path) {
      cellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setExpanded(true);
    }
  }, [searchResults, currentResultIndex, path]);

  if (depth >= 100) {
    return <span className="value">Max depth reached</span>;
  }

  if (Array.isArray(element)) {
    return (
      <div ref={cellRef}>
        <span className="array badge">Array[{element.length}]</span>
        <span className="expand" tabindex={0}
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
        >{expanded ? '-' : '+'}
        </span>
        {expanded && <ArrayTable array={element} depth={depth + 1} searchQuery={searchQuery} searchResults={searchResults} currentResultIndex={currentResultIndex} searchInputRef={searchInputRef} path={path} />}
      </div>
    );
  } else if (typeof element === 'object' && element !== null) {
    return (
      <div ref={cellRef}>
        <span className="object badge">Object[{Object.keys(element).length}]</span>
        <span className="expand" tabindex={0}
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
        >{expanded ? '-' : '+'}</span>
        {expanded && <ObjectTable member={element} depth={depth + 1} searchQuery={searchQuery} searchResults={searchResults} currentResultIndex={currentResultIndex} searchInputRef={searchInputRef} path={path} />}
      </div>
    );
  } else {
    const isHighlighted = searchResults?.some(result => result.path === path && result.value === element);
    return (
      <span className={`value ${isHighlighted ? 'highlight' : ''}`} ref={isHighlighted ? searchInputRef : null}>{String(element)}</span>
    );
  }
};

export default memo(Cell);

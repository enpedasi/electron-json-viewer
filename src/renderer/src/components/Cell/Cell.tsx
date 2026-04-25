import React, { useState, useLayoutEffect, memo, useRef, useEffect, useCallback } from 'react';
import ArrayTable from './ArrayTable';
import ObjectTable from './ObjectTable';
import EditableCell from './EditableCell';

interface CellProps {
  element: any;
  depth?: number;
  searchQuery?: string;
  searchResults?: any[];
  currentResultIndex?: number;
  searchInputRef?: any;
  path?: string;
  isRoot?: boolean;
  isEditMode?: boolean;
  onDataChange?: (path: string, newValue: any) => void;
  onDelete?: (path: string) => void;
}

const Cell: React.FC<CellProps> = ({ element, depth = 0, searchQuery, searchResults, currentResultIndex, searchInputRef, path = '', isRoot = false, isEditMode = false, onDataChange, onDelete }) => {
  const isInitiallyExpanded = isRoot || searchResults?.some(result => result.path.startsWith(path));
  const [expanded, setExpanded] = useState(isInitiallyExpanded);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpanded(isRoot || searchResults?.some(result => result.path.startsWith(path)) || false);
  }, [searchQuery, searchResults, path, isRoot]);

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
    const shouldExpand = searchResults?.some(result => result.path !== path && result.path.startsWith(path));
    if (shouldExpand && !expanded) {
      setExpanded(true);
    }
  }, [searchResults, currentResultIndex, path, expanded]);

  useLayoutEffect(() => {
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
        {expanded && <ArrayTable array={element} depth={depth + 1} searchQuery={searchQuery} searchResults={searchResults} currentResultIndex={currentResultIndex} searchInputRef={searchInputRef} path={path} isEditMode={isEditMode} onDataChange={onDataChange} onDelete={onDelete} />}
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
          <ObjectTable member={element} depth={depth + 1} searchQuery={searchQuery} searchResults={searchResults} currentResultIndex={currentResultIndex} searchInputRef={searchInputRef} path={path} isEditMode={isEditMode} onDataChange={onDataChange} onDelete={onDelete} />}
      </div>
    );
  } else {
    if (isEditMode && onDataChange) {
      return (
        <EditableCell
          value={element}
          path={path}
          onCommit={onDataChange}
        />
      );
    }
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

import React from 'react';
import Cell from './Cell';

interface Column {
  header: string;
}

interface ArrayRowProps {
  element: any;
  index: number;
  columns?: Column[];
  depth: number;
  searchQuery?: string;
  searchResults?: any[];
  currentResultIndex?: number;
  searchInputRef?: any;
  path: string;
  isEditMode?: boolean;
  onDataChange?: (path: string, newValue: any) => void;
  onDelete?: (path: string) => void;
}

const ArrayRow: React.FC<ArrayRowProps> = ({ element, index, columns = [], depth, searchQuery, searchResults, currentResultIndex, searchInputRef, path, isEditMode = false, onDataChange, onDelete }) => {
  const typeOfEl = Array.isArray(element) ? 'array' :
    element === null ? 'null' :
    typeof element;

  return (
    <tr className={`array-el ${typeOfEl}`}>
      <td className={`index ${typeOfEl}`}>{index}</td>
      {typeOfEl === 'object' ? (
        columns.slice(1).map(({ header }) => (
          <td key={header} className="member">
            <Cell
              element={element[header]}
              depth={depth + 1}
              searchQuery={searchQuery}
              searchResults={searchResults}
              currentResultIndex={currentResultIndex}
              searchInputRef={searchInputRef}
              path={`${path}.${header}`}
              isEditMode={isEditMode}
              onDataChange={onDataChange}
              onDelete={onDelete}
            />
          </td>
        ))
      ) : (
        <td className="value" colSpan={columns.length}>
          <Cell
            element={element}
            depth={depth + 1}
            searchQuery={searchQuery}
            searchResults={searchResults}
            currentResultIndex={currentResultIndex}
            searchInputRef={searchInputRef}
            path={path}
            isEditMode={isEditMode}
            onDataChange={onDataChange}
            onDelete={onDelete}
          />
        </td>
      )}
      {isEditMode && (
        <td className="row-actions">
          <button
            className="delete-row-btn"
            onClick={(e) => { e.stopPropagation(); onDelete?.(path); }}
            title="削除"
          >✕</button>
        </td>
      )}
    </tr>
  );
};

export default ArrayRow;

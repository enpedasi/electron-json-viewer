import React from 'react';
import ArrayRow from './ArrayRow';
import ResizableTable from './ResizableTable';

interface Props {
  array: Array<any>;
  depth: number;
  searchQuery?: string;
  searchResults?: any[];
  currentResultIndex?: number;
  searchInputRef?: any;
  path: string;
  isEditMode?: boolean;
  onDataChange?: (path: string, newValue: any) => void;
  onDelete?: (path: string) => void;
  onAddItem?: (path: string, value: any) => void;
}

const ArrayTable: React.FC<Props> = ({ array, depth, searchQuery, searchResults, currentResultIndex, searchInputRef, path, isEditMode = false, onDataChange, onDelete, onAddItem }) => {
  const headers = React.useMemo(() => {
    const hdrCells = array.reduce<Array<string>>((hdrs, el) => {
      if (typeof el === 'object' && el !== null) {
        return [...new Set([...hdrs, ...Object.keys(el)])];
      }
      return hdrs;
    }, []).map(header => ({
      header,
      resize: true,
      thClass: "array member"
    }));

    const base = [{ header: '', resize: false, thClass: 'index' }, ...hdrCells];
    if (isEditMode) {
      return [...base, { header: '', resize: false, thClass: 'edit-actions' }];
    }
    return base;
  }, [array, isEditMode]);

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

  const headerRenderer = (header: string) => {
    return <span>{highlightText(header, searchQuery)}</span>;
  };

  return (
    <ResizableTable
      headers={headers}
      tblClass="array expanded"
      trClass="array-hdr"
      headerRenderer={headerRenderer}
    >
      {array.map((item, index) => (
        <ArrayRow
          key={`${index}-${array.length}`}
          element={item}
          index={index}
          columns={headers}
          depth={depth}
          searchQuery={searchQuery}
          searchResults={searchResults}
          currentResultIndex={currentResultIndex}
          searchInputRef={searchInputRef}
          path={`${path}[${index}]`}
          isEditMode={isEditMode}
          onDataChange={onDataChange}
          onDelete={onDelete}
        />
      ))}
      {isEditMode && (
        <tr className="array-el add-row">
          <td className="index add-cell" colSpan={headers.length}>
            <button
              className="add-row-btn"
              onClick={() => onAddItem?.(path, null)}
            >+ 要素を追加</button>
          </td>
        </tr>
      )}
    </ResizableTable>
  );
};

export default ArrayTable;

import React, { memo, useMemo } from 'react';
import ResizableTable from './ResizableTable';
import Cell from './Cell';

interface ObjectTableProps {
  member: Record<string, any>;
  depth: number;
  searchQuery?: string;
  searchResults?: any[];
  currentResultIndex?: number;
  searchInputRef?: any;
  path: string;
}

interface Header {
  header: string;
  thClass: string;
}

const ObjectTable: React.FC<ObjectTableProps> = ({ member, depth, searchQuery, searchResults, currentResultIndex, searchInputRef, path }) => {
  const headers: Header[] = useMemo(() => [
    { header: 'key', thClass: 'object key' },
    { header: 'val', thClass: 'object value' }
  ], []);

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

  return (
    <ResizableTable
      headers={headers}
      tblClass="object expanded"
      trClass="object-hdr"
      headerRenderer={() => null}
    >
      {Object.entries(member).map(([key, val]) => (
        <tr key={key} className="object member">
          <th className="object key">{highlightText(key, searchQuery)}</th>
          <td className="object element">
            <Cell
              element={val}
              depth={depth + 1}
              searchQuery={searchQuery}
              searchResults={searchResults}
              currentResultIndex={currentResultIndex}
              searchInputRef={searchInputRef}
              path={`${path}.${key}`}
            />
          </td>
        </tr>
      ))}
    </ResizableTable>
  );
};

export default memo(ObjectTable);

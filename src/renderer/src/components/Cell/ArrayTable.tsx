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
}

const ArrayTable: React.FC<Props> = ({ array, depth, searchQuery, searchResults, currentResultIndex, searchInputRef, path }) => {
  const headers = React.useMemo(() => {
    const hdrCells = array.reduce<Array<string>>((hdrs, el) => {
      if (typeof el === 'object') {
        return [...new Set([...hdrs, ...Object.keys(el)])];
      }
      return hdrs;
    }, []).map(header => ({
      header,
      resize: true,
      thClass: "array member"
    }));

    return [{ header: '', resize: false, thClass: 'index' }, ...hdrCells];
  }, [array]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="current-highlight">[ac]{part}[ac]</span>
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
          key={index}
          element={item}
          index={index}
          columns={headers}
          depth={depth}
          searchQuery={searchQuery}
          searchResults={searchResults}
          currentResultIndex={currentResultIndex}
          searchInputRef={searchInputRef}
          path={`${path}[${index}]`}
        />
      ))}
    </ResizableTable>
  );
};

export default ArrayTable;

import React from 'react';
import ArrayRow from './ArrayRow';
import ResizableTable from './ResizableTable';

interface ResizableTableProps {
  headers: Array<{ header: string; resize: boolean; thClass: string }>;
  tblClass: string;
  trClass: string;
  children: React.ReactNode;
}

interface Props {
  array: Array<any>;
}

const ArrayTable: React.FC<Props> = ({ array }) => {
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

  return (
    <ResizableTable headers={headers} tblClass="array expanded" trClass="array-hdr">
      {array.map((item, index) => (
        <ArrayRow key={index} element={item} index={index} columns={headers} />
      ))}
    </ResizableTable>
  );
};

export default ArrayTable;

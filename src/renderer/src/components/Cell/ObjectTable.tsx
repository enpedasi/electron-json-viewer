import React, { memo, useMemo } from 'react';
import ResizableTable from './ResizableTable';
import Cell from './Cell';

interface ObjectTableProps {
  member: Record<string, any>;
  depth: number;
}

interface Header {
  header: string;
  thClass: string;
}

const ObjectTable: React.FC<ObjectTableProps> = ({ member, depth }) => {
  const headers: Header[] = useMemo(() => [
    { header: 'key', thClass: 'object key' },
    { header: 'val', thClass: 'object value' }
  ], []);

  // console.log(`Rendering ObjectTable: depth=${depth}, member=${JSON.stringify(member)}`);

  return (
    <ResizableTable
      headers={headers}
      tblClass="object expanded"
      trClass="object-hdr"
      headerRenderer={() => null}  // ヘッダーを表示しないようにする
    >
      {Object.entries(member).map(([key, val]) => (
        <tr key={key} className="object member">
          <th className="object key">{key}</th>
          <td className="object element">
            <Cell element={val} depth={depth + 1} />
          </td>
        </tr>
      ))}
    </ResizableTable>
  );
};

export default memo(ObjectTable);

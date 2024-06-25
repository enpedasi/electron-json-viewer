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
}

const ArrayRow: React.FC<ArrayRowProps> = ({ element, index, columns = [], depth }) => {
  const typeOfEl = Array.isArray(element) ? 'array' :
    element === null ? 'null' :
    typeof element;

  // console.log(`Rendering ArrayRow: depth=${depth}, index=${index}, type=${typeOfEl}`);

  return (
    <tr className={`array-el ${typeOfEl}`}>
      <td className={`index ${typeOfEl}`}>{index}</td>
      {typeOfEl === 'object' ? (
        columns.slice(1).map(({ header }) => (
          <td key={header} className="member">
            <Cell element={element[header]} depth={depth + 1} />
          </td>
        ))
      ) : (
        <td className="value" colSpan={columns.length}>
          <Cell element={element} depth={depth + 1} />
        </td>
      )}
    </tr>
  );
};

export default ArrayRow;

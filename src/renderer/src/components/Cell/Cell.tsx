import React, { useState, memo } from 'react';
import ArrayTable from './ArrayTable';
import ObjectTable from './ObjectTable';

interface CellProps {
  element: any;
  depth?: number;
}

const Cell: React.FC<CellProps> = ({ element, depth = 0 }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  //   console.log(`Rendering Cell: depth=${depth}, expanded=${expanded}, element=${JSON.stringify(element)}`);

  if (depth >= 100) {
    return <span className="value">Max depth reached</span>;
  }

  if (Array.isArray(element)) {
    return (
      <>
        <span className="array badge">Array[{element.length}]</span>
        <span className="expand" onClick={toggleExpanded}>{expanded ? '-' : '+'}</span>
        {expanded && <ArrayTable array={element} depth={depth + 1} />}
      </>
    );
  } else if (typeof element === 'object' && element !== null) {
    return (
      <>
        <span className="object badge">Object[{Object.keys(element).length}]</span>
        <span className="expand" onClick={toggleExpanded}>{expanded ? '-' : '+'}</span>
        {expanded && <ObjectTable member={element} depth={depth + 1} />}
      </>
    );
  } else {
    return <span className="value">{String(element)}</span>;
  }
};

export default memo(Cell);

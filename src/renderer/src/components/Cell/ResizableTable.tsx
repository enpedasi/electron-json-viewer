import React, { useState, useRef, useEffect } from 'react';

interface Header {
  header: string;
  resize: boolean;
  thClass: string;
}

interface ResizableTableProps {
  headers: Header[];
  tblClass: string;
  theadClass?: string;
  trClass: string;
  headerRenderer?: (header: string) => React.ReactNode;
  children: React.ReactNode;
}

const ResizableTable: React.FC<ResizableTableProps> = ({ headers, tblClass, theadClass, trClass, headerRenderer, children }) => {
  const [tableHeight, setTableHeight] = useState('0px');
  const [colWidth, setColWidth] = useState<Record<string, string | null>>({});
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver(
      entries => setTableHeight(entries[0].contentRect.height + 'px')
    );
    if (tableRef.current) observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, []);

  const resizeCol = (hdr: string, e: React.MouseEvent) => {
    const startX = e.pageX;
    const colStartWidth = parseInt(window.getComputedStyle(document.querySelector(`[data-header="${hdr}"]`) as HTMLElement).width, 10);

    const setSize = (e: MouseEvent) => {
      const movedX = e.pageX - startX;
      setColWidth(prev => ({ ...prev, [hdr]: colStartWidth + movedX + 'px' }));
    };

    document.addEventListener('mousemove', setSize);
    document.addEventListener('mouseup', cleanup);

    function cleanup() {
      document.removeEventListener('mousemove', setSize);
      document.removeEventListener('mouseup', cleanup);
    }
  };

  const resetColSize = (hdr: string) => {
    setColWidth(prev => ({ ...prev, [hdr]: null }));
  };

  return (
    <table className={tblClass} ref={tableRef}>
      {headers.length > 0 && (
        <thead className={theadClass}>
          <tr className={trClass}>
            {headers.map(({ header, resize, thClass }) => (
              <th
                key={header}
                className={thClass}
                style={{ minWidth: colWidth[header] || undefined, width: colWidth[header] || undefined }}
                data-header={header}
              >
                {headerRenderer ? headerRenderer(header) : header}
                {resize !== false && (
                  <div
                    className="resizer"
                    style={{ height: tableHeight}}
                    onMouseDown={(e) => resizeCol(header, e)}
                    onDoubleClick={() => resetColSize(header)}
                  >
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {children}
      </tbody>
    </table>
  );
};

export default ResizableTable;

import React, { useState } from 'react'

interface Header {
  header: string
  id?: string
  resize: boolean
  thClass: string
}

interface ResizableTableProps {
  headers: Header[]
  tblClass: string
  theadClass?: string
  trClass: string
  headerRenderer?: (header: string, id?: string) => React.ReactNode
  tbodyRef?: React.Ref<HTMLTableSectionElement>
  children: React.ReactNode
}

const ResizableTable: React.FC<ResizableTableProps> = ({
  headers,
  tblClass,
  theadClass,
  trClass,
  headerRenderer,
  tbodyRef,
  children
}) => {
  const [colWidth, setColWidth] = useState<Record<string, string | null>>({})

  const resizeCol = (hdr: string, e: React.MouseEvent) => {
    const startX = e.pageX
    const colStartWidth = parseInt(
      window.getComputedStyle(document.querySelector(`[data-header="${hdr}"]`) as HTMLElement)
        .width,
      10
    )

    const setSize = (e: MouseEvent) => {
      const movedX = e.pageX - startX
      setColWidth((prev) => ({ ...prev, [hdr]: colStartWidth + movedX + 'px' }))
    }

    document.addEventListener('mousemove', setSize)
    document.addEventListener('mouseup', cleanup)

    function cleanup() {
      document.removeEventListener('mousemove', setSize)
      document.removeEventListener('mouseup', cleanup)
    }
  }

  const resetColSize = (hdr: string) => {
    setColWidth((prev) => ({ ...prev, [hdr]: null }))
  }

  return (
    <table className={tblClass}>
      {headers.length > 0 && (
        <thead className={theadClass}>
          <tr className={trClass}>
            {headers.map(({ header, id, resize, thClass }) => {
              const headerId = id ?? header
              return (
              <th
                key={headerId}
                className={thClass}
                style={{
                  minWidth: colWidth[headerId] || undefined,
                  width: colWidth[headerId] || undefined
                }}
                data-header={headerId}
              >
                {headerRenderer ? headerRenderer(header, headerId) : header}
                {resize !== false && (
                  <div
                    className="resizer"
                    style={{ height: '100%' }}
                    onMouseDown={(e) => resizeCol(headerId, e)}
                    onDoubleClick={() => resetColSize(headerId)}
                  ></div>
                )}
              </th>
              )
            })}
          </tr>
        </thead>
      )}
      <tbody ref={tbodyRef}>{children}</tbody>
    </table>
  )
}

export default ResizableTable

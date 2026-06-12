import { getValueByRelativePath } from './columnProjection'

export interface DataColumn {
  header: string
  valuePath?: string
}

function normalizeTsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return sanitizeTsvString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    return sanitizeTsvString(JSON.stringify(value))
  }
  return sanitizeTsvString(String(value))
}

function sanitizeTsvString(value: string): string {
  return value.replace(/[\t\n\r]/g, ' ')
}

export function buildTsvFromColumns(
  array: unknown[],
  columns: DataColumn[]
): string {
  const headers = columns.map((col) => col.header)
  const rows: string[] = [headers.join('\t')]

  for (const row of array) {
    const cells = columns.map((col) => {
      if (col.valuePath) {
        const value = getValueByRelativePath(row, col.valuePath)
        return normalizeTsvCell(value)
      }
      if (isObjectRecord(row)) {
        const value = (row as Record<string, unknown>)[col.header]
        return normalizeTsvCell(value)
      }
      return ''
    })
    rows.push(cells.join('\t'))
  }

  return rows.join('\n')
}

export function buildTsvFromResolvedRows(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [headers.join('\t')]
  for (const row of rows) {
    lines.push(row.map(normalizeTsvCell).join('\t'))
  }
  return lines.join('\n')
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

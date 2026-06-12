export interface RowEntryChild {
  index: number
  element: any
  path: string
}

export interface RowEntry {
  key: string
  indexLabel: string
  sourceIndex: number
  element: any
  rowPath: string
  child?: RowEntryChild
}

export function buildPlainRowEntries(array: any[], arrayPath: string): RowEntry[] {
  return array.map((element, index) => ({
    key: String(index),
    indexLabel: String(index),
    sourceIndex: index,
    element,
    rowPath: `${arrayPath}[${index}]`
  }))
}

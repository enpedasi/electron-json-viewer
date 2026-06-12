import {
  ColumnProjectionState,
  ProjectionColumn,
  collectArrayLeafColumns,
  getValueByRelativePath,
  isObjectRecord
} from './columnProjection'
import { escapeRegExp } from './highlightText'
import { RowEntry, RowEntryChild } from './rowEntries'

export interface UnwindPathState {
  relativePath: string
}

export type UnwindState = Record<string, UnwindPathState>

export const UNWIND_CANDIDATE_MAX_DEPTH = 4
export const UNWIND_SCAN_LIMIT = 1000

export function createEmptyUnwindState(): UnwindState {
  return {}
}

export function collectUnwindCandidates(
  array: unknown[],
  maxDepth = UNWIND_CANDIDATE_MAX_DEPTH,
  maxItems = UNWIND_SCAN_LIMIT
): string[] {
  const candidates: string[] = []
  const seen = new Set<string>()
  const limit = Math.min(array.length, maxItems)
  for (let index = 0; index < limit; index++) {
    const item = array[index]
    if (isObjectRecord(item)) collectCandidatesFromValue(item, [], candidates, seen, maxDepth)
  }
  return candidates
}

function collectCandidatesFromValue(
  value: Record<string, unknown>,
  segments: string[],
  candidates: string[],
  seen: Set<string>,
  maxDepth: number
) {
  if (segments.length >= maxDepth) return
  for (const [key, child] of Object.entries(value)) {
    const path = [...segments, key]
    if (Array.isArray(child)) {
      const joined = path.join('.')
      if (child.length > 0 && !seen.has(joined)) {
        seen.add(joined)
        candidates.push(joined)
      }
    } else if (isObjectRecord(child)) {
      collectCandidatesFromValue(child, path, candidates, seen, maxDepth)
    }
  }
}

export function buildUnwoundRowEntries(
  array: any[],
  arrayPath: string,
  relativePath: string
): RowEntry[] {
  const entries: RowEntry[] = []
  array.forEach((element, index) => {
    const rowPath = `${arrayPath}[${index}]`
    const childArray = getValueByRelativePath(element, relativePath)
    if (Array.isArray(childArray) && childArray.length > 0) {
      childArray.forEach((childElement, childIndex) => {
        entries.push({
          key: `${index}:${childIndex}`,
          indexLabel: `${index}.${childIndex}`,
          sourceIndex: index,
          element,
          rowPath,
          child: {
            index: childIndex,
            element: childElement,
            path: `${rowPath}.${relativePath}[${childIndex}]`
          }
        })
      })
    } else {
      entries.push({
        key: String(index),
        indexLabel: String(index),
        sourceIndex: index,
        element,
        rowPath
      })
    }
  })
  return entries
}

export function getChildColumnPrefix(relativePath: string): string {
  return `${relativePath}[].`
}

export function collectUnwoundColumns(
  array: unknown[],
  relativePath: string,
  maxDepth = 6
): ProjectionColumn[] {
  const parentColumns = collectArrayLeafColumns(array, maxDepth).filter(
    (column) => column.path !== relativePath && !column.path.startsWith(`${relativePath}.`)
  )
  const children: unknown[] = []
  let hasScalarChild = false
  const limit = Math.min(array.length, UNWIND_SCAN_LIMIT)

  for (let index = 0; index < limit; index++) {
    const item = array[index]
    if (!isObjectRecord(item)) continue
    const childArray = getValueByRelativePath(item, relativePath)
    if (!Array.isArray(childArray)) continue
    for (const childElement of childArray) {
      if (isObjectRecord(childElement)) children.push(childElement)
      else hasScalarChild = true
    }
  }

  const prefix = getChildColumnPrefix(relativePath)
  const lastSegment = relativePath.split('.').pop() ?? relativePath
  const childColumns = collectArrayLeafColumns(children, maxDepth).map((column) => ({
    path: `${prefix}${column.path}`,
    label: column.label,
    groupPath: column.groupPath ? `${relativePath}[].${column.groupPath}` : `${relativePath}[]`
  }))
  if (hasScalarChild) childColumns.unshift({ path: `${relativePath}[]`, label: lastSegment, groupPath: '' })

  return [...parentColumns, ...childColumns]
}

export function getChildRelativePath(columnId: string, relativePath: string): string | null {
  if (columnId === `${relativePath}[]`) return ''
  const prefix = getChildColumnPrefix(relativePath)
  return columnId.startsWith(prefix) ? columnId.slice(prefix.length) : null
}

export function resolveUnwoundValue(
  parentElement: unknown,
  child: RowEntryChild | undefined,
  columnId: string,
  relativePath: string
): unknown {
  const childRelative = getChildRelativePath(columnId, relativePath)
  if (childRelative === null) return getValueByRelativePath(parentElement, columnId)
  if (!child) return undefined
  return childRelative === '' ? child.element : getValueByRelativePath(child.element, childRelative)
}

export function getUnwoundCellPath(
  rowPath: string,
  child: RowEntryChild | undefined,
  columnId: string,
  relativePath: string
): string {
  const childRelative = getChildRelativePath(columnId, relativePath)
  if (childRelative === null) return `${rowPath}.${columnId}`
  if (!child) return `${rowPath}.${relativePath}`
  return childRelative === '' ? child.path : `${child.path}.${childRelative}`
}

export function getUnwindChildIndexForPath(
  arrayPath: string,
  fullPath: string | undefined,
  relativePath: string
): number | null {
  if (!fullPath) return null
  const pattern = new RegExp(
    `^${escapeRegExp(arrayPath)}\\[\\d+\\]\\.${escapeRegExp(relativePath)}\\[(\\d+)\\](?:\\.|$)`
  )
  const match = fullPath.match(pattern)
  return match ? Number(match[1]) : null
}

export function hasUnwind(unwinds: UnwindState, arrayPath: string): boolean {
  return Boolean(unwinds[arrayPath])
}

export function isPathVisibleUnderUnwind(
  unwinds: UnwindState,
  columnProjections: ColumnProjectionState,
  fullPath: string
): boolean {
  for (const [arrayPath, unwind] of Object.entries(unwinds)) {
    const applied = columnProjections[arrayPath]?.appliedColumns ?? []
    if (applied.length === 0) continue
    const childPattern = new RegExp(
      `^${escapeRegExp(arrayPath)}\\[\\d+\\]\\.${escapeRegExp(unwind.relativePath)}\\[\\d+\\](?:\\.(.*))?$`
    )
    const match = fullPath.match(childPattern)
    if (!match) continue
    const rest = match[1]
    const columnId =
      rest === undefined ? `${unwind.relativePath}[]` : `${getChildColumnPrefix(unwind.relativePath)}${rest}`
    const visible = applied.some(
      (column) =>
        column.path === columnId ||
        column.path.startsWith(`${columnId}.`) ||
        columnId.startsWith(`${column.path}.`)
    )
    if (!visible) return false
  }
  return true
}

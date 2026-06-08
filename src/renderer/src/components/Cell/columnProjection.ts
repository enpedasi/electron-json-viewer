export interface ProjectionColumn {
  path: string
  label: string
  groupPath: string
}

export interface ColumnProjectionPathState {
  isSelecting: boolean
  appliedColumns: ProjectionColumn[]
  draftColumnPaths: string[]
  draftQuery: string
}

export type ColumnProjectionState = Record<string, ColumnProjectionPathState>

export function createEmptyColumnProjectionState(): ColumnProjectionState {
  return {}
}

export function collectArrayLeafColumns(array: unknown[], maxDepth = 6): ProjectionColumn[] {
  const columns: ProjectionColumn[] = []
  const seenPaths = new Set<string>()
  for (const item of array) {
    if (!isObjectRecord(item)) continue
    collectLeafColumnsFromValue(item, [], columns, seenPaths, maxDepth)
  }
  return columns
}

function collectLeafColumnsFromValue(
  value: unknown,
  segments: string[],
  columns: ProjectionColumn[],
  seenPaths: Set<string>,
  maxDepth: number
) {
  if (segments.length > maxDepth) return
  if (isLeafValue(value)) {
    const path = segments.join('.')
    if (!path || seenPaths.has(path)) return
    seenPaths.add(path)
    columns.push({
      path,
      label: segments[segments.length - 1],
      groupPath: segments.slice(0, -1).join('.')
    })
    return
  }
  if (!isObjectRecord(value)) return
  for (const [key, child] of Object.entries(value)) {
    segments.push(key)
    collectLeafColumnsFromValue(child, segments, columns, seenPaths, maxDepth)
    segments.pop()
  }
}

export function getValueByRelativePath(row: unknown, relativePath: string): unknown {
  if (!relativePath) return row
  const segments = relativePath.split('.')
  let current: unknown = row
  for (const segment of segments) {
    if (!isObjectRecord(current) && !Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function beginColumnProjectionSelection(
  state: ColumnProjectionState,
  path: string,
  allColumns: ProjectionColumn[]
): ColumnProjectionState {
  const current = state[path]
  const appliedPaths = current?.appliedColumns.map((column) => column.path) ?? []
  const draftColumnPaths = appliedPaths.length > 0 ? normalizeColumnPaths(allColumns, appliedPaths) : allColumns.map((column) => column.path)
  return {
    ...state,
    [path]: {
      isSelecting: true,
      appliedColumns: normalizeColumns(allColumns, appliedPaths),
      draftColumnPaths,
      draftQuery: current?.draftQuery ?? ''
    }
  }
}

export function setDraftColumnSelected(
  state: ColumnProjectionState,
  path: string,
  columnPath: string,
  selected: boolean
): ColumnProjectionState {
  const current = state[path] ?? {
    isSelecting: true,
    appliedColumns: [],
    draftColumnPaths: [],
    draftQuery: ''
  }
  const draftColumnPaths = selected
    ? Array.from(new Set([...current.draftColumnPaths, columnPath]))
    : current.draftColumnPaths.filter((p) => p !== columnPath)
  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: true,
      draftColumnPaths
    }
  }
}

export function setDraftColumnQuery(
  state: ColumnProjectionState,
  path: string,
  query: string
): ColumnProjectionState {
  const current = state[path] ?? {
    isSelecting: true,
    appliedColumns: [],
    draftColumnPaths: [],
    draftQuery: ''
  }
  return {
    ...state,
    [path]: {
      ...current,
      draftQuery: query
    }
  }
}

export function applyDraftColumnProjection(
  state: ColumnProjectionState,
  path: string,
  allColumns: ProjectionColumn[]
): ColumnProjectionState {
  const current = state[path]
  if (!current) return state
  const appliedColumns = normalizeColumns(allColumns, current.draftColumnPaths)
  if (appliedColumns.length === 0) return state
  const nextAppliedColumns = appliedColumns.length === allColumns.length ? [] : appliedColumns
  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: false,
      appliedColumns: nextAppliedColumns,
      draftColumnPaths: nextAppliedColumns.length > 0 ? nextAppliedColumns.map((column) => column.path) : allColumns.map((column) => column.path)
    }
  }
}

export function cancelColumnProjectionSelection(
  state: ColumnProjectionState,
  path: string
): ColumnProjectionState {
  const current = state[path]
  if (!current) return state
  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: false,
      draftColumnPaths: current.appliedColumns.map((column) => column.path)
    }
  }
}

export function clearColumnProjection(
  state: ColumnProjectionState,
  path: string
): ColumnProjectionState {
  const current = state[path]
  if (!current) return state
  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: false,
      appliedColumns: [],
      draftColumnPaths: []
    }
  }
}

export function getAppliedProjectionColumns(
  state: ColumnProjectionState,
  path: string
): ProjectionColumn[] {
  return state[path]?.appliedColumns ?? []
}

export function hasActiveColumnProjection(state: ColumnProjectionState, path: string): boolean {
  return (state[path]?.appliedColumns.length ?? 0) > 0
}

export function hasAnyActiveColumnProjection(state: ColumnProjectionState): boolean {
  return Object.values(state).some((entry) => entry.appliedColumns.length > 0)
}

export function applyColumnProjectionsToData(data: unknown, state: ColumnProjectionState): unknown {
  if (!hasAnyActiveColumnProjection(state)) return data
  return walkAndProject(data, '', state)
}

function walkAndProject(value: unknown, path: string, state: ColumnProjectionState): unknown {
  if (typeof value !== 'object' || value === null) return value

  if (Array.isArray(value)) {
    const arrayPath = path || ''
    if (hasActiveColumnProjection(state, arrayPath)) {
      const appliedColumns = getAppliedProjectionColumns(state, arrayPath)
      return value.map((item) => {
        if (!isObjectRecord(item)) return item

        const projected: Record<string, unknown> = {}
        for (const column of appliedColumns) {
          setValueByRelativePath(projected, column.path, getValueByRelativePath(item, column.path))
        }
        return projected
      })
    }

    return value.map((item, index) => {
      const itemPath = path ? `${path}[${index}]` : `[${index}]`
      return walkAndProject(item, itemPath, state)
    })
  }

  const projected: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : `.${key}`
    projected[key] = walkAndProject(child, childPath, state)
  }
  return projected
}

function setValueByRelativePath(target: Record<string, unknown>, relativePath: string, value: unknown) {
  const segments = relativePath.split('.')
  let current = target

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]
    if (index === segments.length - 1) {
      current[segment] = value
      return
    }

    if (!isObjectRecord(current[segment])) {
      current[segment] = {}
    }
    current = current[segment] as Record<string, unknown>
  }
}

export function getProjectionContextForPath(path: string): {
  arrayPath: string
  itemPath: string
  relativePath: string
} | null {
  const matches = [...path.matchAll(/\[(\d+)\]/g)]
  if (matches.length === 0) return null
  const lastMatch = matches[matches.length - 1]
  const bracketEnd = (lastMatch.index ?? 0) + lastMatch[0].length
  if (path.length <= bracketEnd || path[bracketEnd] !== '.') return null
  const itemPath = path.slice(0, bracketEnd)
  const arrayPath = path.slice(0, lastMatch.index)
  const relativePath = path.slice(bracketEnd + 1)
  return { arrayPath, itemPath, relativePath }
}

export function isProjectedPathVisible(state: ColumnProjectionState, fullPath: string): boolean {
  const context = getProjectionContextForPath(fullPath)
  if (!context) return true
  const appliedColumns = state[context.arrayPath]?.appliedColumns ?? []
  if (appliedColumns.length === 0) return true
  return appliedColumns.some(
    (column) =>
      column.path === context.relativePath ||
      column.path.startsWith(context.relativePath + '.')
  )
}

export function normalizeColumns(
  allColumns: ProjectionColumn[],
  selectedPaths: string[]
): ProjectionColumn[] {
  const selectedPathSet = new Set(selectedPaths)
  return allColumns.filter((column) => selectedPathSet.has(column.path))
}

function normalizeColumnPaths(allColumns: ProjectionColumn[], selectedPaths: string[]): string[] {
  return normalizeColumns(allColumns, selectedPaths).map((column) => column.path)
}

function isLeafValue(value: unknown): boolean {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

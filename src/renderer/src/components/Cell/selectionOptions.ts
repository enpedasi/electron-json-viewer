import type { KeyFilterState } from './keyFilter'
import type { ColumnProjectionState } from './columnProjection'
import { collectObjectArrayKeys, normalizeKeySelection, isObjectRecord } from './keyFilter'
import { collectArrayLeafColumns, normalizeColumns } from './columnProjection'

export interface SelectionOptionsFile {
  type: 'json-grid-viewer-selection-options'
  version: 1
  sourceFileName: string
  savedAt: string
  keyFilters: Record<string, string[]>
  columnProjections: Record<string, string[]>
}

export function buildSelectionOptionsDto(
  sourceFileName: string,
  keyFilters: KeyFilterState,
  columnProjections: ColumnProjectionState
): SelectionOptionsFile {
  const keyFiltersDto: Record<string, string[]> = {}
  for (const [path, state] of Object.entries(keyFilters)) {
    if (state.appliedKeys.length > 0) {
      keyFiltersDto[path] = state.appliedKeys
    }
  }

  const columnProjectionsDto: Record<string, string[]> = {}
  for (const [path, state] of Object.entries(columnProjections)) {
    const persistedColumnPaths = state.appliedColumns
      .map((col) => col.path)
      .filter((columnPath) => !columnPath.includes('[]'))
    if (persistedColumnPaths.length > 0) {
      columnProjectionsDto[path] = persistedColumnPaths
    }
  }

  return {
    type: 'json-grid-viewer-selection-options',
    version: 1,
    sourceFileName,
    savedAt: new Date().toISOString(),
    keyFilters: keyFiltersDto,
    columnProjections: columnProjectionsDto
  }
}

export function serializeSelectionOptions(dto: SelectionOptionsFile): string {
  return JSON.stringify(dto, null, 2)
}

export function parseSelectionOptions(text: string): SelectionOptionsFile | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }

  if (!isObjectRecord(parsed)) return null
  if (parsed.type !== 'json-grid-viewer-selection-options') return null
  if (parsed.version !== 1) return null

  const keyFilters: Record<string, string[]> = {}
  if (isObjectRecord(parsed.keyFilters)) {
    for (const [path, value] of Object.entries(parsed.keyFilters)) {
      if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        keyFilters[path] = value
      }
    }
  }

  const columnProjections: Record<string, string[]> = {}
  if (isObjectRecord(parsed.columnProjections)) {
    for (const [path, value] of Object.entries(parsed.columnProjections)) {
      if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        columnProjections[path] = value
      }
    }
  }

  return {
    type: 'json-grid-viewer-selection-options',
    version: 1,
    sourceFileName: typeof parsed.sourceFileName === 'string' ? parsed.sourceFileName : '',
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    keyFilters,
    columnProjections
  }
}

export function applySelectionOptionsToData(
  data: unknown,
  options: SelectionOptionsFile
): {
  keyFilters: KeyFilterState
  columnProjections: ColumnProjectionState
} {
  const newKeyFilters: KeyFilterState = {}
  const newColumnProjections: ColumnProjectionState = {}

  const dataArrayAt = (root: unknown, arrayPath: string): unknown[] | null => {
    if (!arrayPath) {
      return Array.isArray(root) ? root : null
    }
    const tokens = tokenizePath(arrayPath)
    let current: unknown = root
    for (const token of tokens) {
      if (token.type === 'index') {
        if (!Array.isArray(current)) return null
        current = current[Number(token.value)]
      } else {
        if (!isObjectRecord(current)) return null
        current = current[token.value]
      }
    }
    return Array.isArray(current) ? current : null
  }

  for (const [arrayPath, savedKeys] of Object.entries(options.keyFilters)) {
    const arr = dataArrayAt(data, arrayPath)
    if (!arr) continue
    const allKeys = collectObjectArrayKeys(arr)
    const validKeys = normalizeKeySelection(allKeys, savedKeys)
    if (validKeys.length === 0) continue
    newKeyFilters[arrayPath] = {
      isSelecting: false,
      appliedKeys: validKeys,
      draftKeys: validKeys,
      draftQuery: ''
    }
  }

  for (const [arrayPath, savedColumnPaths] of Object.entries(options.columnProjections)) {
    const arr = dataArrayAt(data, arrayPath)
    if (!arr) continue
    const allColumns = collectArrayLeafColumns(arr)
    const validColumns = normalizeColumns(allColumns, savedColumnPaths)
    if (validColumns.length === 0) continue
    newColumnProjections[arrayPath] = {
      isSelecting: false,
      appliedColumns: validColumns,
      draftColumnPaths: validColumns.map((col) => col.path),
      draftQuery: ''
    }
  }

  return { keyFilters: newKeyFilters, columnProjections: newColumnProjections }
}

export function hasAnyActiveSelection(
  keyFilters: KeyFilterState,
  columnProjections: ColumnProjectionState
): boolean {
  return (
    Object.values(keyFilters).some((s) => s.appliedKeys.length > 0) ||
    Object.values(columnProjections).some((s) => s.appliedColumns.length > 0)
  )
}

export function hasAnyPersistableSelection(
  keyFilters: KeyFilterState,
  columnProjections: ColumnProjectionState
): boolean {
  return (
    Object.values(keyFilters).some((s) => s.appliedKeys.length > 0) ||
    Object.values(columnProjections).some((s) =>
      s.appliedColumns.some((column) => !column.path.includes('[]'))
    )
  )
}

interface PathToken {
  type: 'key' | 'index'
  value: string
}

function tokenizePath(path: string): PathToken[] {
  const tokens: PathToken[] = []
  const parts = path.split('.').filter(Boolean)
  for (const part of parts) {
    const match = part.match(/^(.+?)\[(\d+)\]$/)
    if (match) {
      tokens.push({ type: 'key', value: match[1] })
      tokens.push({ type: 'index', value: match[2] })
    } else {
      tokens.push({ type: 'key', value: part })
    }
  }
  return tokens
}

export function isOptionFilePath(filePath: string): boolean {
  return filePath.endsWith('.option')
}

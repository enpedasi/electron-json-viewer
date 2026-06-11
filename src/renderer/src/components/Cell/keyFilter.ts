export interface KeyFilterPathState {
  isSelecting: boolean
  appliedKeys: string[]
  draftKeys: string[]
  draftQuery: string
}

export type KeyFilterState = Record<string, KeyFilterPathState>

export function createEmptyKeyFilterState(): KeyFilterState {
  return {}
}

const KEY_SCAN_ITEM_LIMIT = 5000

export function collectObjectArrayKeys(array: unknown[], maxItems = KEY_SCAN_ITEM_LIMIT): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const limit = Math.min(array.length, maxItems)
  for (let i = 0; i < limit; i++) {
    const item = array[i]
    if (!isObjectRecord(item)) continue
    for (const key of Object.keys(item)) {
      if (!seen.has(key)) {
        seen.add(key)
        keys.push(key)
      }
    }
  }
  return keys
}

export function beginKeyFilterSelection(
  state: KeyFilterState,
  path: string,
  allKeys: string[]
): KeyFilterState {
  const current = state[path]
  const baseDraftKeys =
    current?.appliedKeys && current.appliedKeys.length > 0
      ? normalizeKeySelection(allKeys, current.appliedKeys)
      : allKeys

  return {
    ...state,
    [path]: {
      isSelecting: true,
      appliedKeys: normalizeKeySelection(allKeys, current?.appliedKeys ?? []),
      draftKeys: baseDraftKeys,
      draftQuery: current?.draftQuery ?? ''
    }
  }
}

export function cancelKeyFilterSelection(state: KeyFilterState, path: string): KeyFilterState {
  const current = state[path]
  if (!current) return state
  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: false,
      draftKeys: current.appliedKeys.length > 0 ? current.appliedKeys : []
    }
  }
}

export function setDraftKeySelected(
  state: KeyFilterState,
  path: string,
  key: string,
  selected: boolean
): KeyFilterState {
  const current = state[path] ?? {
    isSelecting: true,
    appliedKeys: [],
    draftKeys: [],
    draftQuery: ''
  }
  const draftKeys = selected
    ? Array.from(new Set([...current.draftKeys, key]))
    : current.draftKeys.filter((draftKey) => draftKey !== key)

  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: true,
      draftKeys
    }
  }
}

export function setDraftQuery(state: KeyFilterState, path: string, query: string): KeyFilterState {
  const current = state[path] ?? {
    isSelecting: true,
    appliedKeys: [],
    draftKeys: [],
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

export function applyDraftKeyFilter(
  state: KeyFilterState,
  path: string,
  allKeys: string[]
): KeyFilterState {
  const current = state[path]
  if (!current) return state

  const nextAppliedKeys = normalizeKeySelection(allKeys, current.draftKeys)
  if (nextAppliedKeys.length === 0) {
    return state
  }

  const appliedKeys = nextAppliedKeys.length === allKeys.length ? [] : nextAppliedKeys
  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: false,
      appliedKeys,
      draftKeys: appliedKeys.length > 0 ? appliedKeys : allKeys
    }
  }
}

export function clearAppliedKeyFilter(state: KeyFilterState, path: string): KeyFilterState {
  const current = state[path]
  if (!current) return state
  return {
    ...state,
    [path]: {
      ...current,
      isSelecting: false,
      appliedKeys: [],
      draftKeys: []
    }
  }
}

export function getVisibleObjectArrayKeys(allKeys: string[], appliedKeys: string[]): string[] {
  const normalizedAppliedKeys = normalizeKeySelection(allKeys, appliedKeys)
  return normalizedAppliedKeys.length > 0 ? normalizedAppliedKeys : allKeys
}

export function hasActiveKeyFilter(state: KeyFilterState, path: string): boolean {
  return (state[path]?.appliedKeys.length ?? 0) > 0
}

export function hasAnyActiveKeyFilter(state: KeyFilterState): boolean {
  return Object.values(state).some((entry) => entry.appliedKeys.length > 0)
}

export function getArrayPathForItemPath(itemPath: string): string | null {
  const match = itemPath.match(/^(.*)\[\d+\]$/)
  return match ? match[1] : null
}

export function isObjectArrayKeyVisible(
  state: KeyFilterState,
  objectItemPath: string,
  key: string
): boolean {
  const arrayPath = getArrayPathForItemPath(objectItemPath)
  if (arrayPath === null) return true

  const appliedKeys = state[arrayPath]?.appliedKeys ?? []
  return appliedKeys.length === 0 || appliedKeys.includes(key)
}

export function normalizeKeySelection(allKeys: string[], selectedKeys: string[]): string[] {
  const selectedKeySet = new Set(selectedKeys)
  return allKeys.filter((key) => selectedKeySet.has(key))
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function applyKeyFiltersToData(data: unknown, keyFilters: KeyFilterState): unknown {
  if (!hasAnyActiveKeyFilter(keyFilters)) return data
  return walkAndFilter(data, '', keyFilters)
}

function walkAndFilter(obj: unknown, path: string, keyFilters: KeyFilterState): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    const processedItems = obj.map((item, index) => {
      const itemPath = path ? `${path}[${index}]` : `[${index}]`
      return walkAndFilter(item, itemPath, keyFilters)
    })

    const arrayPath = path || ''
    const filter = keyFilters[arrayPath]
    if (filter && filter.appliedKeys.length > 0) {
      return processedItems.map((item) => {
        if (isObjectRecord(item)) {
          const result: Record<string, unknown> = {}
          for (const key of filter.appliedKeys) {
            if (key in item) {
              result[key] = item[key]
            }
          }
          return result
        }
        return item
      })
    }

    return processedItems
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const childPath = path ? `${path}.${key}` : `.${key}`
    result[key] = walkAndFilter(value, childPath, keyFilters)
  }
  return result
}

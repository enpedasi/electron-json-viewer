import { KeyFilterState, isObjectArrayKeyVisible } from '../Cell/keyFilter'
import { ColumnProjectionState, isProjectedPathVisible, getProjectionContextForPath } from '../Cell/columnProjection'
import {
  RowFilterCondition,
  RowFilterState,
  getVisibleArrayIndexSet,
  isConditionActive,
  rowMatchesFilters
} from '../Cell/rowFilter'
import {
  UnwindState,
  buildUnwoundRowEntries,
  resolveUnwoundValue
} from '../Cell/unwind'
import { escapeRegExp } from '../Cell/highlightText'

export interface SearchResult {
  path: string
  value: any
}

export function collectSearchAncestorPaths(results: SearchResult[]): ReadonlySet<string> {
  const ancestors = new Set<string>()
  for (const result of results) {
    const path = result.path
    let pos = 0
    while (pos < path.length) {
      const ch = path[pos]
      if (ch === '.') {
        ancestors.add(path.slice(0, pos))
        pos++
      } else if (ch === '[') {
        ancestors.add(path.slice(0, pos))
        const closeIdx = path.indexOf(']', pos)
        if (closeIdx === -1) break
        pos = closeIdx + 1
      } else {
        pos++
      }
    }
  }
  return ancestors
}

export function searchJson(
  json: any,
  query: string,
  keyFilters: KeyFilterState = {},
  columnProjections: ColumnProjectionState = {},
  rowFilters: RowFilterState = {},
  unwinds: UnwindState = {}
): SearchResult[] {
  const results: SearchResult[] = []
  const searchQuery = query.toLowerCase()
  const unwindMatchers = createUnwindMatchers(unwinds)
  const visibleIndexSetCache = new Map<string, Set<number> | null>()
  const unwindVisibilityCache = new Map<string, UnwindVisibility>()

  const search = (obj: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return

    const currentDepth = path.split('.').length + path.split('[').length - 1
    if (currentDepth > 50) return

    const visibleIndexSet = Array.isArray(obj) ? getSearchVisibleIndexSet(obj, path) : null

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
      if (Array.isArray(obj) && visibleIndexSet && !visibleIndexSet.has(Number(key))) continue

      const value = obj[key]
      const currentPath = Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`

      if (!Array.isArray(obj) && !isObjectArrayKeyVisible(keyFilters, path, key)) {
        continue
      }

      if (!isPathVisibleUnderCompiledUnwind(unwindMatchers, columnProjections, currentPath)) {
        continue
      }

      if (
        !isProjectedPathVisible(columnProjections, currentPath) &&
        !isUnwindTraversalPath(unwindMatchers, currentPath)
      ) {
        continue
      }

      const isInsideProjection = getProjectionContextForPath(currentPath) !== null &&
        columnProjections[getProjectionContextForPath(currentPath)!.arrayPath]?.appliedColumns.length > 0

      if (key.toLowerCase().includes(searchQuery)) {
        if (!isInsideProjection || typeof value !== 'object' || value === null) {
          results.push({ path: currentPath, value: key })
        }
      }

      if (typeof value === 'object' && value !== null) {
        search(value, currentPath)
      } else if (String(value).toLowerCase().includes(searchQuery)) {
        results.push({ path: currentPath, value })
      }
    }
  }

  search(json)
  return results

  function getSearchVisibleIndexSet(array: unknown[], path: string): Set<number> | null {
    if (visibleIndexSetCache.has(path)) return visibleIndexSetCache.get(path) ?? null

    let visibleIndexSet: Set<number> | null
    const unwind = unwinds[path]
    const conditions = rowFilters[path]
    if (unwind && hasActiveConditions(conditions)) {
      visibleIndexSet = getUnwindVisibility(path, array, unwind.relativePath, conditions).parentVisible
      visibleIndexSetCache.set(path, visibleIndexSet)
      return visibleIndexSet
    }

    const childContext = getUnwindChildArrayContext(unwindMatchers, path)
    const parentConditions = childContext ? rowFilters[childContext.arrayPath] : undefined
    if (childContext && hasActiveConditions(parentConditions)) {
      const parentArray = getValueBySearchPath(json, childContext.arrayPath)
      const visibility = Array.isArray(parentArray)
        ? getUnwindVisibility(
            childContext.arrayPath,
            parentArray,
            childContext.relativePath,
            parentConditions
          )
        : null
      visibleIndexSet = visibility?.childVisibleByParent.get(childContext.parentIndex) ?? new Set()
      visibleIndexSetCache.set(path, visibleIndexSet)
      return visibleIndexSet
    }

    visibleIndexSet = getVisibleArrayIndexSet(array, conditions)
    visibleIndexSetCache.set(path, visibleIndexSet)
    return visibleIndexSet
  }

  function getUnwindVisibility(
    arrayPath: string,
    array: unknown[],
    relativePath: string,
    conditions: Record<string, RowFilterCondition>
  ): UnwindVisibility {
    const cached = unwindVisibilityCache.get(arrayPath)
    if (cached) return cached

    const visibility: UnwindVisibility = {
      parentVisible: new Set<number>(),
      childVisibleByParent: new Map<number, Set<number>>()
    }
    for (const entry of buildUnwoundRowEntries(array as any[], arrayPath, relativePath)) {
      if (
        !rowMatchesFilters(entry.element, conditions, (_element, columnId) =>
          resolveUnwoundValue(entry.element, entry.child, columnId, relativePath)
        )
      ) {
        continue
      }
      visibility.parentVisible.add(entry.sourceIndex)
      if (entry.child) {
        const childSet = visibility.childVisibleByParent.get(entry.sourceIndex) ?? new Set<number>()
        childSet.add(entry.child.index)
        visibility.childVisibleByParent.set(entry.sourceIndex, childSet)
      }
    }
    unwindVisibilityCache.set(arrayPath, visibility)
    return visibility
  }
}

interface UnwindMatcher {
  arrayPath: string
  relativePath: string
  childArrayPattern: RegExp
  childValuePattern: RegExp
  traversalPattern: RegExp
}

interface UnwindVisibility {
  parentVisible: Set<number>
  childVisibleByParent: Map<number, Set<number>>
}

function hasActiveConditions(
  conditions: Record<string, RowFilterCondition> | undefined
): conditions is Record<string, RowFilterCondition> {
  return Boolean(conditions && Object.values(conditions).some(isConditionActive))
}

function getUnwindChildArrayContext(
  unwindMatchers: UnwindMatcher[],
  fullPath: string
): { arrayPath: string; parentIndex: number; relativePath: string } | null {
  for (const matcher of unwindMatchers) {
    const match = fullPath.match(matcher.childArrayPattern)
    if (!match) continue
    return {
      arrayPath: matcher.arrayPath,
      parentIndex: Number(match[1]),
      relativePath: matcher.relativePath
    }
  }
  return null
}

function getValueBySearchPath(root: unknown, path: string): unknown {
  if (!path) return root
  let current = root as any
  const pattern = /\.([^\.\[]+)|\[(\d+)\]/g
  for (const match of path.matchAll(pattern)) {
    if (current === null || current === undefined) return undefined
    const key = match[1] ?? match[2]
    current = current[key]
  }
  return current
}

function createUnwindMatchers(unwinds: UnwindState): UnwindMatcher[] {
  const matchers: UnwindMatcher[] = []
  for (const [arrayPath, unwind] of Object.entries(unwinds)) {
    const escapedArrayPath = escapeRegExp(arrayPath)
    const escapedRelativePath = escapeRegExp(unwind.relativePath)
    matchers.push({
      arrayPath,
      relativePath: unwind.relativePath,
      childArrayPattern: new RegExp(`^${escapedArrayPath}\\[(\\d+)\\]\\.${escapedRelativePath}$`),
      childValuePattern: new RegExp(
        `^${escapedArrayPath}\\[\\d+\\]\\.${escapedRelativePath}\\[\\d+\\](?:\\.(.*))?$`
      ),
      traversalPattern: new RegExp(`^${escapedArrayPath}\\[\\d+\\]\\.(.*)$`)
    })
  }
  return matchers
}

function isUnwindTraversalPath(unwindMatchers: UnwindMatcher[], fullPath: string): boolean {
  for (const matcher of unwindMatchers) {
    const match = fullPath.match(matcher.traversalPattern)
    if (!match) continue
    const relativePath = match[1]
    if (
      relativePath === matcher.relativePath ||
      matcher.relativePath.startsWith(`${relativePath}.`)
    ) {
      return true
    }
  }
  return false
}

function isPathVisibleUnderCompiledUnwind(
  unwindMatchers: UnwindMatcher[],
  columnProjections: ColumnProjectionState,
  fullPath: string
): boolean {
  for (const matcher of unwindMatchers) {
    const applied = columnProjections[matcher.arrayPath]?.appliedColumns ?? []
    if (applied.length === 0) continue
    const match = fullPath.match(matcher.childValuePattern)
    if (!match) continue

    const rest = match[1]
    const columnId =
      rest === undefined ? `${matcher.relativePath}[]` : `${matcher.relativePath}[].${rest}`
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

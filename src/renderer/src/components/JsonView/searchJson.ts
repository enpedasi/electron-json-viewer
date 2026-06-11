import { KeyFilterState, isObjectArrayKeyVisible } from '../Cell/keyFilter'
import { ColumnProjectionState, isProjectedPathVisible, getProjectionContextForPath } from '../Cell/columnProjection'

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

export function searchJson(json: any, query: string, keyFilters: KeyFilterState = {}, columnProjections: ColumnProjectionState = {}): SearchResult[] {
  const results: SearchResult[] = []
  const searchQuery = query.toLowerCase()

  const search = (obj: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return

    const currentDepth = path.split('.').length + path.split('[').length - 1
    if (currentDepth > 50) return

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue

      const value = obj[key]
      const currentPath = Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`

      if (!Array.isArray(obj) && !isObjectArrayKeyVisible(keyFilters, path, key)) {
        continue
      }

      if (!isProjectedPathVisible(columnProjections, currentPath)) {
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
}

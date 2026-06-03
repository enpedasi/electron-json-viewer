import { KeyFilterState, isObjectArrayKeyVisible } from '../Cell/keyFilter'

export interface SearchResult {
  path: string
  value: any
}

export function searchJson(json: any, query: string, keyFilters: KeyFilterState = {}): SearchResult[] {
  const results: SearchResult[] = []
  const searchQuery = query.toLowerCase()

  const search = (obj: any, path = '') => {
    if (typeof obj !== 'object' || obj === null) return

    const currentDepth = path.split('.').length + path.split('[').length - 1
    if (currentDepth > 50) return

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue

      if (!Array.isArray(obj) && !isObjectArrayKeyVisible(keyFilters, path, key)) {
        continue
      }

      const value = obj[key]
      const currentPath = Array.isArray(obj) ? `${path}[${key}]` : `${path}.${key}`

      if (key.toLowerCase().includes(searchQuery)) {
        results.push({ path: currentPath, value: key })
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

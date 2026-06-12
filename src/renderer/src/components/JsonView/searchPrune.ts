import { SearchResult, collectSearchAncestorPaths } from './searchJson'

export interface PrunePathSets {
  matched: ReadonlySet<string>
  ancestors: ReadonlySet<string>
}

export function buildPrunePathSets(results: SearchResult[]): PrunePathSets | null {
  if (results.length === 0) return null
  return {
    matched: new Set(results.map((result) => result.path)),
    ancestors: collectSearchAncestorPaths(results)
  }
}

export function isPathVisibleInPrune(
  prune: PrunePathSets | null | undefined,
  path: string
): boolean {
  if (!prune) return true
  if (prune.ancestors.has(path) || prune.matched.has(path)) return true

  let pos = 0
  while (pos < path.length) {
    const ch = path[pos]
    if (ch === '.') {
      if (prune.matched.has(path.slice(0, pos))) return true
      pos++
    } else if (ch === '[') {
      if (prune.matched.has(path.slice(0, pos))) return true
      const closeIdx = path.indexOf(']', pos)
      if (closeIdx === -1) break
      pos = closeIdx + 1
    } else {
      pos++
    }
  }
  return false
}

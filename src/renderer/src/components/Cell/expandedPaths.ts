export function isPathExpanded(
  path: string,
  expandedPaths: ReadonlySet<string> | string[] = new Set(),
  shouldAutoExpand = false
): boolean {
  if (path === '' || shouldAutoExpand) return true
  if (expandedPaths instanceof Set) return expandedPaths.has(path)
  return expandedPaths.includes(path)
}

export function updateExpandedPaths(
  expandedPaths: string[] = [],
  path: string,
  expanded: boolean
): string[] {
  if (path === '') return expandedPaths

  if (expanded) {
    return expandedPaths.includes(path) ? expandedPaths : [...expandedPaths, path]
  }

  return expandedPaths.filter((expandedPath) => expandedPath !== path)
}

export function collectExpandablePaths(element: unknown, path = '', acc: string[] = []): string[] {
  if (typeof element !== 'object' || element === null) return acc

  if (Array.isArray(element)) {
    for (let index = 0; index < element.length; index++) {
      const item = element[index]
      const childPath = `${path}[${index}]`
      if (typeof item === 'object' && item !== null) {
        acc.push(childPath)
        collectExpandablePaths(item, childPath, acc)
      }
    }
    return acc
  }

  for (const [key, value] of Object.entries(element)) {
    const childPath = `${path}.${key}`
    if (typeof value === 'object' && value !== null) {
      acc.push(childPath)
      collectExpandablePaths(value, childPath, acc)
    }
  }

  return acc
}

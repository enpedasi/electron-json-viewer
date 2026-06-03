export function isPathExpanded(
  path: string,
  expandedPaths: string[] = [],
  shouldAutoExpand = false
): boolean {
  return path === '' || shouldAutoExpand || expandedPaths.includes(path)
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

export function collectExpandablePaths(element: unknown, path = ''): string[] {
  if (typeof element !== 'object' || element === null) return []

  const paths: string[] = []

  if (Array.isArray(element)) {
    element.forEach((item, index) => {
      const childPath = `${path}[${index}]`
      if (typeof item === 'object' && item !== null) {
        paths.push(childPath, ...collectExpandablePaths(item, childPath))
      }
    })
    return paths
  }

  Object.entries(element).forEach(([key, value]) => {
    const childPath = `${path}.${key}`
    if (typeof value === 'object' && value !== null) {
      paths.push(childPath, ...collectExpandablePaths(value, childPath))
    }
  })

  return paths
}

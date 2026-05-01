export function parsePath(path: string): (string | number)[] {
  if (!path) return []
  const segments: (string | number)[] = []
  const regex = /\.([^\.\[]+)|\[(\d+)\]/g
  let match
  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      segments.push(match[1])
    } else if (match[2] !== undefined) {
      segments.push(parseInt(match[2], 10))
    }
  }
  return segments
}

export function getValueByPath(root: any, path: string): any {
  const segments = parsePath(path)
  let current = root
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined
    current = current[seg]
  }
  return current
}

export function setValueByPath(root: any, path: string, newValue: any): any {
  if (!path) return newValue
  const segments = parsePath(path)
  return setValueRecursive(root, segments, 0, newValue)
}

function setValueRecursive(
  obj: any,
  segments: (string | number)[],
  index: number,
  newValue: any
): any {
  if (index === segments.length) return newValue
  const seg = segments[index]
  if (Array.isArray(obj)) {
    const arr = [...obj]
    arr[seg as number] = setValueRecursive(obj[seg as number], segments, index + 1, newValue)
    return arr
  }
  if (obj != null && typeof obj === 'object') {
    return { ...obj, [seg]: setValueRecursive(obj[seg], segments, index + 1, newValue) }
  }
  return obj
}

export function deleteByPath(root: any, path: string): any {
  if (!path) return root
  const segments = parsePath(path)
  if (segments.length === 0) return root
  return deleteRecursive(root, segments, 0)
}

function deleteRecursive(obj: any, segments: (string | number)[], index: number): any {
  const seg = segments[index]
  const isLast = index === segments.length - 1
  if (isLast) {
    if (Array.isArray(obj)) {
      const arr = [...obj]
      arr.splice(seg as number, 1)
      return arr
    }
    if (obj != null && typeof obj === 'object') {
      const { [seg]: _, ...rest } = obj
      return rest
    }
    return obj
  }
  if (Array.isArray(obj)) {
    const arr = [...obj]
    arr[seg as number] = deleteRecursive(obj[seg as number], segments, index + 1)
    return arr
  }
  if (obj != null && typeof obj === 'object') {
    return { ...obj, [seg]: deleteRecursive(obj[seg], segments, index + 1) }
  }
  return obj
}

export function addPropertyByPath(root: any, path: string, key: string, value: any): any {
  const target = path ? getValueByPath(root, path) : root
  if (target == null || typeof target !== 'object') return root
  if (Array.isArray(target)) {
    const newArr = [...target, value]
    return path ? setValueByPath(root, path, newArr) : newArr
  }
  const newObj = { ...target, [key]: value }
  return path ? setValueByPath(root, path, newObj) : newObj
}

export function addArrayItemByPath(root: any, path: string, value: any, index?: number): any {
  const target = path ? getValueByPath(root, path) : root
  if (!Array.isArray(target)) return root
  const newArr = [...target]
  if (index !== undefined && index >= 0 && index <= newArr.length) {
    newArr.splice(index, 0, value)
  } else {
    newArr.push(value)
  }
  return path ? setValueByPath(root, path, newArr) : newArr
}

export function renameKeyByPath(
  root: any,
  parentPath: string,
  oldKey: string,
  newKey: string
): any {
  const target = parentPath ? getValueByPath(root, parentPath) : root
  if (target == null || typeof target !== 'object' || Array.isArray(target)) return root
  if (!(oldKey in target)) return root
  const entries = Object.entries(target)
  const newEntries = entries.map(([k, v]) => (k === oldKey ? [newKey, v] : [k, v]))
  const newObj = Object.fromEntries(newEntries)
  return parentPath ? setValueByPath(root, parentPath, newObj) : newObj
}

export function applyOperation(root: any, op: import('../../App').DataOperation): any {
  switch (op.type) {
    case 'set':
      return setValueByPath(root, op.path, op.value)
    case 'delete':
      return deleteByPath(root, op.path)
    case 'add': {
      const parent = op.path ? getValueByPath(root, op.path) : root
      if (Array.isArray(parent)) {
        return addArrayItemByPath(root, op.path, op.value)
      }
      return addPropertyByPath(root, op.path, op.key || 'newKey', op.value)
    }
    case 'rename': {
      const segments = parsePath(op.path)
      const parentPath = segments.slice(0, -1).reduce((acc, seg) => {
        if (typeof seg === 'number') return `${acc}[${seg}]`
        return `${acc}.${seg}`
      }, '')
      return renameKeyByPath(root, parentPath, op.key || '', op.newKey || '')
    }
    default:
      return root
  }
}

export function invertOperation(
  root: any,
  op: import('../../App').DataOperation
): import('../../App').DataOperation {
  switch (op.type) {
    case 'set': {
      const oldValue = getValueByPath(root, op.path)
      return { type: 'set', path: op.path, value: oldValue }
    }
    case 'delete': {
      const oldValue = getValueByPath(root, op.path)
      return { type: 'set', path: op.path, value: oldValue }
    }
    case 'add': {
      const parent = op.path ? getValueByPath(root, op.path) : root
      if (Array.isArray(parent)) {
        const idx = parent.length
        return { type: 'delete', path: `${op.path}[${idx}]` }
      }
      return { type: 'delete', path: `${op.path ? op.path : ''}.${op.key}` }
    }
    case 'rename':
      return { type: 'rename', path: op.path, key: op.newKey, newKey: op.key }
    default:
      return op
  }
}

export function coerceValue(rawValue: string, originalType: string): any {
  if (rawValue === 'null') return null
  if (rawValue === 'true') return true
  if (rawValue === 'false') return false
  if (originalType === 'number') {
    const num = Number(rawValue)
    return isNaN(num) ? rawValue : num
  }
  if (originalType === 'boolean') {
    return rawValue === 'true'
  }
  return rawValue
}

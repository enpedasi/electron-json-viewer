import { getValueByRelativePath } from './columnProjection'

export const ROW_FILTER_NULL = '(null)'
export const ROW_FILTER_MISSING = '(missing)'
export const ROW_FILTER_MAX_SCAN = 5000
export const ROW_FILTER_MAX_DISTINCT = 200

export type RowFilterOperator = 'contains' | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'

export type RowFilterCondition =
  | { type: 'values'; selectedValues: string[] }
  | { type: 'expr'; operator: RowFilterOperator; operand: string }

export type RowFilterState = Record<string, Record<string, RowFilterCondition>>
export type RowFilterValueResolver = (element: unknown, columnId: string) => unknown

const defaultResolver: RowFilterValueResolver = (element, columnId) =>
  getValueByRelativePath(element, columnId)

export function createEmptyRowFilterState(): RowFilterState {
  return {}
}

export function formatRowFilterValue(value: unknown): string {
  if (value === undefined) return ROW_FILTER_MISSING
  if (value === null) return ROW_FILTER_NULL
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function collectDistinctColumnValues(
  array: unknown[],
  columnId: string,
  maxScan = ROW_FILTER_MAX_SCAN,
  maxDistinct = ROW_FILTER_MAX_DISTINCT,
  resolve: RowFilterValueResolver = defaultResolver
): { values: string[]; truncated: boolean } {
  const seen = new Set<string>()
  let truncated = false
  const limit = Math.min(array.length, maxScan)
  if (array.length > maxScan) truncated = true

  for (let index = 0; index < limit; index++) {
    const formatted = formatRowFilterValue(resolve(array[index], columnId))
    if (seen.has(formatted)) continue
    if (seen.size >= maxDistinct) {
      truncated = true
      break
    }
    seen.add(formatted)
  }

  return {
    values: [...seen].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    ),
    truncated
  }
}

export function isConditionActive(condition: RowFilterCondition | undefined): boolean {
  if (!condition) return false
  if (condition.type === 'values') return condition.selectedValues.length > 0
  return condition.operand.trim() !== ''
}

export function rowMatchesCondition(value: unknown, condition: RowFilterCondition): boolean {
  if (!isConditionActive(condition)) return true
  if (condition.type === 'values') {
    return condition.selectedValues.includes(formatRowFilterValue(value))
  }

  const operand = condition.operand.trim()
  const formatted = formatRowFilterValue(value)
  if (isEmptyFilterExpressionValue(value, formatted)) return false
  if (condition.operator === 'contains') {
    return formatted.toLowerCase().includes(operand.toLowerCase())
  }

  const operandNumber = Number(operand)
  const valueNumber = typeof value === 'number' ? value : Number(formatted)
  const numeric =
    !Number.isNaN(operandNumber) &&
    !Number.isNaN(valueNumber) &&
    formatted.trim() !== '' &&
    value !== null &&
    value !== undefined
  const left: string | number = numeric ? valueNumber : formatted
  const right: string | number = numeric ? operandNumber : operand

  switch (condition.operator) {
    case 'eq':
      return left === right || formatted === operand
    case 'ne':
      return !(left === right || formatted === operand)
    case 'gt':
      return left > right
    case 'gte':
      return left >= right
    case 'lt':
      return left < right
    case 'lte':
      return left <= right
  }
}

function isEmptyFilterExpressionValue(value: unknown, formatted: string): boolean {
  return value === undefined || value === null || formatted.trim() === ''
}

export function rowMatchesFilters(
  element: unknown,
  conditions: Record<string, RowFilterCondition> | undefined,
  resolve: RowFilterValueResolver = defaultResolver
): boolean {
  if (!conditions) return true
  for (const [columnId, condition] of Object.entries(conditions)) {
    if (!isConditionActive(condition)) continue
    if (!rowMatchesCondition(resolve(element, columnId), condition)) return false
  }
  return true
}

export function setRowFilterCondition(
  state: RowFilterState,
  arrayPath: string,
  columnId: string,
  condition: RowFilterCondition
): RowFilterState {
  return {
    ...state,
    [arrayPath]: { ...(state[arrayPath] ?? {}), [columnId]: condition }
  }
}

export function clearRowFilterColumn(
  state: RowFilterState,
  arrayPath: string,
  columnId: string
): RowFilterState {
  const current = state[arrayPath]
  if (!current || !(columnId in current)) return state
  const next = { ...current }
  delete next[columnId]
  return Object.keys(next).length === 0 ? clearRowFilters(state, arrayPath) : { ...state, [arrayPath]: next }
}

export function clearRowFilters(state: RowFilterState, arrayPath: string): RowFilterState {
  if (!state[arrayPath]) return state
  const next = { ...state }
  delete next[arrayPath]
  return next
}

export function hasActiveRowFilter(state: RowFilterState, arrayPath: string): boolean {
  const conditions = state[arrayPath]
  if (!conditions) return false
  return Object.values(conditions).some(isConditionActive)
}

export function hasAnyActiveRowFilter(state: RowFilterState): boolean {
  return Object.keys(state).some((arrayPath) => hasActiveRowFilter(state, arrayPath))
}

export function getVisibleArrayIndexSet(
  array: unknown[],
  conditions: Record<string, RowFilterCondition> | undefined,
  resolve: RowFilterValueResolver = defaultResolver
): Set<number> | null {
  if (!conditions || !Object.values(conditions).some(isConditionActive)) return null
  const visible = new Set<number>()
  for (let index = 0; index < array.length; index++) {
    if (rowMatchesFilters(array[index], conditions, resolve)) visible.add(index)
  }
  return visible
}

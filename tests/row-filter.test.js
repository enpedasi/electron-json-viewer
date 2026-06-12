const assert = require('assert')
const path = require('path')
const esbuild = require('esbuild')

const sourcePath = path.join(
  __dirname,
  '..',
  'src',
  'renderer',
  'src',
  'components',
  'Cell',
  'rowFilter.ts'
)

const { outputFiles } = esbuild.buildSync({
  entryPoints: [sourcePath],
  bundle: true,
  write: false,
  format: 'cjs',
  target: 'es2020'
})
const moduleUnderTest = { exports: {} }
new Function('exports', 'module', 'require', outputFiles[0].text)(
  moduleUnderTest.exports,
  moduleUnderTest,
  require
)

const {
  formatRowFilterValue,
  collectDistinctColumnValues,
  isConditionActive,
  rowMatchesCondition,
  rowMatchesFilters,
  setRowFilterCondition,
  clearRowFilterColumn,
  clearRowFilters,
  hasActiveRowFilter,
  hasAnyActiveRowFilter,
  getVisibleArrayIndexSet,
  ROW_FILTER_NULL,
  ROW_FILTER_MISSING
} = moduleUnderTest.exports

assert.strictEqual(formatRowFilterValue(undefined), ROW_FILTER_MISSING)
assert.strictEqual(formatRowFilterValue(null), ROW_FILTER_NULL)
assert.strictEqual(formatRowFilterValue(12), '12')
assert.strictEqual(formatRowFilterValue(false), 'false')
assert.strictEqual(formatRowFilterValue({ a: 1 }), '{"a":1}')

const rows = [
  { status: 'active', count: 2, meta: { x: 1 } },
  { status: 'paused', count: 10 },
  { status: 'active', count: null },
  'not-object',
  { count: 2 }
]
const distinct = collectDistinctColumnValues(rows, 'status')
assert.deepStrictEqual(distinct.values, ['(missing)', 'active', 'paused'])
assert.strictEqual(distinct.truncated, false)
assert.deepStrictEqual(collectDistinctColumnValues(rows, 'meta.x').values.includes('1'), true)
assert.deepStrictEqual(
  collectDistinctColumnValues(rows, 'status', 5000, 200, () => 'resolved').values,
  ['resolved']
)
const many = Array.from({ length: 50 }, (_, i) => ({ v: i }))
assert.strictEqual(collectDistinctColumnValues(many, 'v', 50, 10).truncated, true)
assert.strictEqual(collectDistinctColumnValues(many, 'v', 50, 10).values.length, 10)

assert.strictEqual(isConditionActive({ type: 'values', selectedValues: [] }), false)
assert.strictEqual(isConditionActive({ type: 'expr', operator: 'eq', operand: '' }), false)
assert.strictEqual(isConditionActive({ type: 'expr', operator: 'eq', operand: '0' }), true)

assert.strictEqual(
  rowMatchesCondition('active', { type: 'values', selectedValues: ['active', '(null)'] }),
  true
)
assert.strictEqual(
  rowMatchesCondition(null, { type: 'values', selectedValues: ['active', '(null)'] }),
  true
)
assert.strictEqual(rowMatchesCondition('paused', { type: 'values', selectedValues: ['active'] }), false)
assert.strictEqual(
  rowMatchesCondition('Hello World', { type: 'expr', operator: 'contains', operand: 'world' }),
  true
)
assert.strictEqual(rowMatchesCondition(10, { type: 'expr', operator: 'gt', operand: '5' }), true)
assert.strictEqual(rowMatchesCondition(3, { type: 'expr', operator: 'gt', operand: '5' }), false)
assert.strictEqual(rowMatchesCondition('10', { type: 'expr', operator: 'gte', operand: '10' }), true)
assert.strictEqual(rowMatchesCondition('abc', { type: 'expr', operator: 'eq', operand: 'abc' }), true)
assert.strictEqual(rowMatchesCondition('abc', { type: 'expr', operator: 'ne', operand: 'x' }), true)
assert.strictEqual(rowMatchesCondition('', { type: 'expr', operator: 'contains', operand: 'a' }), false)
assert.strictEqual(rowMatchesCondition('   ', { type: 'expr', operator: 'ne', operand: 'x' }), false)
assert.strictEqual(rowMatchesCondition(null, { type: 'expr', operator: 'ne', operand: 'x' }), false)
assert.strictEqual(rowMatchesCondition(undefined, { type: 'expr', operator: 'lt', operand: 'z' }), false)
// 値選択モードでは空値を明示選択できる
assert.strictEqual(rowMatchesCondition(undefined, { type: 'values', selectedValues: ['(missing)'] }), true)

const conditions = {
  status: { type: 'values', selectedValues: ['active'] },
  count: { type: 'expr', operator: 'gte', operand: '2' }
}
assert.strictEqual(rowMatchesFilters({ status: 'active', count: 2 }, conditions), true)
assert.strictEqual(rowMatchesFilters({ status: 'active', count: 1 }, conditions), false)
assert.strictEqual(rowMatchesFilters({ status: 'paused', count: 5 }, conditions), false)
assert.strictEqual(
  rowMatchesFilters({ ignored: true }, { status: { type: 'values', selectedValues: ['ok'] } }, () => 'ok'),
  true
)

let state = {}
state = setRowFilterCondition(state, '.users', 'status', {
  type: 'values',
  selectedValues: ['active']
})
assert.strictEqual(hasActiveRowFilter(state, '.users'), true)
assert.strictEqual(hasActiveRowFilter(state, '.other'), false)
assert.strictEqual(hasAnyActiveRowFilter(state), true)

state = setRowFilterCondition(state, '.users', 'count', {
  type: 'expr',
  operator: 'gt',
  operand: '1'
})
assert.strictEqual(Object.keys(state['.users']).length, 2)

state = clearRowFilterColumn(state, '.users', 'status')
assert.strictEqual(state['.users'].status, undefined)
assert.strictEqual(hasActiveRowFilter(state, '.users'), true)

state = clearRowFilters(state, '.users')
assert.strictEqual(hasActiveRowFilter(state, '.users'), false)
assert.strictEqual(hasAnyActiveRowFilter(state), false)

const arr = [{ status: 'active' }, { status: 'paused' }, { status: 'active' }]
const visible = getVisibleArrayIndexSet(arr, {
  status: { type: 'values', selectedValues: ['active'] }
})
assert.deepStrictEqual([...visible].sort(), [0, 2])
assert.strictEqual(getVisibleArrayIndexSet(arr, undefined), null)
assert.strictEqual(getVisibleArrayIndexSet(arr, {}), null)
assert.strictEqual(
  getVisibleArrayIndexSet(arr, { status: { type: 'values', selectedValues: [] } }),
  null
)

console.log('row filter tests passed')

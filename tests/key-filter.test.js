const assert = require('assert')
const fs = require('fs')
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
  'keyFilter.ts'
)

const source = fs.readFileSync(sourcePath, 'utf8')
const { code } = esbuild.transformSync(source, {
  loader: 'ts',
  format: 'cjs',
  target: 'es2020'
})

const moduleUnderTest = { exports: {} }
const runModule = new Function('exports', 'module', code)
runModule(moduleUnderTest.exports, moduleUnderTest)

const {
  collectObjectArrayKeys,
  beginKeyFilterSelection,
  setDraftKeySelected,
  setDraftQuery,
  applyDraftKeyFilter,
  clearAppliedKeyFilter,
  getVisibleObjectArrayKeys,
  hasActiveKeyFilter,
  hasAnyActiveKeyFilter,
  getArrayPathForItemPath,
  isObjectArrayKeyVisible
} = moduleUnderTest.exports

const rows = [
  { id: 1, name: 'Ada', status: 'active' },
  { id: 2, status: 'paused', owner: 'ops' },
  null,
  ['not', 'object'],
  { name: 'Linus', id: 3 }
]

assert.deepStrictEqual(collectObjectArrayKeys(rows), ['id', 'name', 'status', 'owner'])
assert.deepStrictEqual(collectObjectArrayKeys([1, 'x', null]), [])

let state = {}
state = beginKeyFilterSelection(state, '', ['id', 'name', 'status'])
assert.deepStrictEqual(state[''].draftKeys, ['id', 'name', 'status'])
assert.strictEqual(state[''].draftQuery, '')

state = setDraftKeySelected(state, '', 'status', false)
assert.deepStrictEqual(state[''].draftKeys, ['id', 'name'])

state = setDraftKeySelected(state, '', 'status', true)
assert.deepStrictEqual(state[''].draftKeys, ['id', 'name', 'status'])

state = setDraftQuery(state, '', 'na')
assert.strictEqual(state[''].draftQuery, 'na')

state = setDraftKeySelected(state, '', 'status', false)
state = applyDraftKeyFilter(state, '', ['id', 'name', 'status'])
assert.deepStrictEqual(state[''].appliedKeys, ['id', 'name'])
assert.strictEqual(state[''].isSelecting, false)
assert.strictEqual(hasActiveKeyFilter(state, ''), true)
assert.strictEqual(hasAnyActiveKeyFilter(state), true)
assert.deepStrictEqual(getVisibleObjectArrayKeys(['id', 'name', 'status'], state[''].appliedKeys), [
  'id',
  'name'
])

state = clearAppliedKeyFilter(state, '')
assert.strictEqual(hasActiveKeyFilter(state, ''), false)
assert.strictEqual(hasAnyActiveKeyFilter(state), false)
assert.deepStrictEqual(getVisibleObjectArrayKeys(['id', 'name'], state[''].appliedKeys), [
  'id',
  'name'
])

assert.strictEqual(getArrayPathForItemPath('[0]'), '')
assert.strictEqual(getArrayPathForItemPath('.users[12]'), '.users')
assert.strictEqual(getArrayPathForItemPath('.groups[1].items[4]'), '.groups[1].items')
assert.strictEqual(getArrayPathForItemPath('.metadata'), null)

state = applyDraftKeyFilter(
  setDraftKeySelected(beginKeyFilterSelection({}, '.users', ['id', 'name', 'email']), '.users', 'email', false),
  '.users',
  ['id', 'name', 'email']
)
assert.strictEqual(isObjectArrayKeyVisible(state, '.users[0]', 'id'), true)
assert.strictEqual(isObjectArrayKeyVisible(state, '.users[0]', 'email'), false)
assert.strictEqual(isObjectArrayKeyVisible(state, '.metadata', 'email'), true)

// --- applyKeyFiltersToData tests ---
const { applyKeyFiltersToData } = moduleUnderTest.exports

// 1. Simple root array with filter
assert.deepStrictEqual(
  applyKeyFiltersToData([{ a: 1, b: 2, c: 3 }], { '': { appliedKeys: ['a', 'c'] } }),
  [{ a: 1, c: 3 }]
)

// 2. Nested array with filter
assert.deepStrictEqual(
  applyKeyFiltersToData(
    { users: [{ id: 1, name: 'Ada', email: 'a@example.com' }] },
    { '.users': { appliedKeys: ['id', 'name'] } }
  ),
  { users: [{ id: 1, name: 'Ada' }] }
)

// 3. No filter (pass through)
assert.deepStrictEqual(
  applyKeyFiltersToData([{ a: 1, b: 2 }], {}),
  [{ a: 1, b: 2 }]
)

// 4. Mixed array (objects and primitives)
assert.deepStrictEqual(
  applyKeyFiltersToData([{ a: 1 }, 'primitive', null], { '': { appliedKeys: ['a'] } }),
  [{ a: 1 }, 'primitive', null]
)

// 5. Deeply nested array with filter
assert.deepStrictEqual(
  applyKeyFiltersToData(
    { groups: [{ users: [{ id: 1, secret: 'x' }] }] },
    { '.groups[0].users': { appliedKeys: ['id'] } }
  ),
  { groups: [{ users: [{ id: 1 }] }] }
)

// 6. Empty appliedKeys (treated as no filter)
assert.deepStrictEqual(
  applyKeyFiltersToData([{ a: 1, b: 2 }], { '': { appliedKeys: [] } }),
  [{ a: 1, b: 2 }]
)

// 7. Object inside array element retains nested structure
assert.deepStrictEqual(
  applyKeyFiltersToData(
    [{ id: 1, meta: { x: 10, y: 20 } }],
    { '': { appliedKeys: ['id', 'meta'] } }
  ),
  [{ id: 1, meta: { x: 10, y: 20 } }]
)

console.log('key filter state tests passed')

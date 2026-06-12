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
  'JsonView',
  'searchJson.ts'
)

const { outputFiles } = esbuild.buildSync({
  entryPoints: [sourcePath],
  bundle: true,
  write: false,
  format: 'cjs',
  target: 'es2020'
})
const code = outputFiles[0].text

const moduleUnderTest = { exports: {} }
const runModule = new Function('exports', 'module', 'require', code)
runModule(moduleUnderTest.exports, moduleUnderTest, require)

const { searchJson, collectSearchAncestorPaths } = moduleUnderTest.exports

const data = [
  { id: 1, name: 'Ada', email: 'ada@example.com', status: 'active' },
  { id: 2, name: 'Linus', email: 'linus@example.com', status: 'paused' }
]

assert.deepStrictEqual(
  searchJson(data, 'email').map((result) => result.path),
  ['[0].email', '[1].email']
)

const keyFilters = {
  '': {
    isSelecting: false,
    appliedKeys: ['id', 'name'],
    draftKeys: ['id', 'name'],
    draftQuery: ''
  }
}

assert.deepStrictEqual(searchJson(data, 'email', keyFilters), [])
assert.deepStrictEqual(
  searchJson(data, 'linus', keyFilters).map((result) => result.path),
  ['[1].name']
)

const nested = {
  groups: [
    {
      id: 'group-a',
      users: [
        { id: 1, name: 'Ada', secret: 'hidden' },
        { id: 2, name: 'Grace', secret: 'classified' }
      ]
    }
  ]
}

const nestedFilters = {
  '.groups[0].users': {
    isSelecting: false,
    appliedKeys: ['id', 'name'],
    draftKeys: ['id', 'name'],
    draftQuery: ''
  }
}

assert.deepStrictEqual(searchJson(nested, 'classified', nestedFilters), [])
assert.deepStrictEqual(
  searchJson(nested, 'grace', nestedFilters).map((result) => result.path),
  ['.groups[0].users[1].name']
)

console.log('search json key filter tests passed')

const projectedStatuses = [
  {
    unitStatus: { jobNumber: 1, startTime: '2026-06-03T10:34:48+09:00', retCode: 0 },
    definition: { unitType: 'JOB', unitID: 18099, unitName: 'J-CY1220' }
  }
]

const columnProjections = {
  '': {
    isSelecting: false,
    appliedColumns: [
      { path: 'unitStatus.jobNumber', label: 'jobNumber', groupPath: 'unitStatus' },
      { path: 'definition.unitName', label: 'unitName', groupPath: 'definition' }
    ],
    draftColumnPaths: ['unitStatus.jobNumber', 'definition.unitName'],
    draftQuery: ''
  }
}

assert.deepStrictEqual(searchJson(projectedStatuses, 'retCode', {}, columnProjections), [])
assert.deepStrictEqual(searchJson(projectedStatuses, 'unitStatus', {}, columnProjections), [])
assert.deepStrictEqual(searchJson(projectedStatuses, 'definition', {}, columnProjections), [])
assert.deepStrictEqual(
  searchJson(projectedStatuses, 'J-CY1220', {}, columnProjections).map((result) => result.path),
  ['[0].definition.unitName']
)

const ancestors = collectSearchAncestorPaths([
  { path: '.users[3].name', value: 'test' }
])
assert.deepStrictEqual(
  [...ancestors].sort(),
  ['', '.users', '.users[3]'].sort()
)

const mismatchAncestors = collectSearchAncestorPaths([
  { path: '.users[0].id', value: 1 }
])
assert.strictEqual(mismatchAncestors.has('.user'), false)

const rowFilterData = [
  { status: 'active', note: 'alpha' },
  { status: 'paused', note: 'alpha-hidden' }
]
const rowFilters = {
  '': { status: { type: 'values', selectedValues: ['active'] } }
}
assert.deepStrictEqual(
  searchJson(rowFilterData, 'alpha', {}, {}, rowFilters).map((r) => r.path),
  ['[0].note']
)
assert.strictEqual(
  searchJson(rowFilterData, 'alpha', {}, {}, {
    '': { status: { type: 'values', selectedValues: [] } }
  }).length,
  2
)

const unwindOrders = [
  {
    id: 1,
    items: [{ sku: 'A-1', qty: 2, secretNote: 'hidden-gem' }]
  }
]
const unwinds = { '': { relativePath: 'items' } }
const unwindProjections = {
  '': {
    isSelecting: false,
    appliedColumns: [
      { path: 'id', label: 'id', groupPath: '' },
      { path: 'items[].sku', label: 'sku', groupPath: 'items[]' }
    ],
    draftColumnPaths: ['id', 'items[].sku'],
    draftQuery: ''
  }
}
assert.deepStrictEqual(
  searchJson(unwindOrders, 'hidden-gem', {}, unwindProjections, {}, unwinds),
  []
)
assert.deepStrictEqual(
  searchJson(unwindOrders, 'A-1', {}, unwindProjections, {}, unwinds).map((r) => r.path),
  ['[0].items[0].sku']
)
assert.strictEqual(searchJson(unwindOrders, 'hidden-gem').length, 1)

const unwindRowFilterData = [
  {
    id: 1,
    items: [
      { sku: 'A-1', note: 'keep-me' },
      { sku: 'B-2', note: 'hide-me' }
    ]
  }
]
const unwindRowFilters = {
  '': { 'items[].sku': { type: 'values', selectedValues: ['A-1'] } }
}
assert.deepStrictEqual(
  searchJson(unwindRowFilterData, 'keep-me', {}, {}, unwindRowFilters, unwinds).map(
    (r) => r.path
  ),
  ['[0].items[0].note']
)
assert.deepStrictEqual(
  searchJson(unwindRowFilterData, 'hide-me', {}, {}, unwindRowFilters, unwinds),
  []
)

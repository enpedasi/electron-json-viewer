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

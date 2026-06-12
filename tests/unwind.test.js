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
  'unwind.ts'
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
  collectUnwindCandidates,
  buildUnwoundRowEntries,
  collectUnwoundColumns,
  getChildRelativePath,
  resolveUnwoundValue,
  getUnwoundCellPath,
  getUnwindChildIndexForPath,
  isPathVisibleUnderUnwind
} = moduleUnderTest.exports

const orders = [
  {
    id: 1,
    customer: { name: 'Ada', region: 'APAC' },
    items: [
      { sku: 'A-1', qty: 2, price: { amount: 100 } },
      { sku: 'A-2', qty: 1 }
    ],
    tags: ['a', 'b']
  },
  { id: 2, customer: { name: 'Grace' }, items: [] },
  { id: 3, customer: { name: 'Linus' } }
]

assert.deepStrictEqual(collectUnwindCandidates(orders), ['items', 'tags'])
assert.deepStrictEqual(collectUnwindCandidates([{ a: { b: [1] } }]), ['a.b'])
assert.deepStrictEqual(collectUnwindCandidates([{ items: [] }]), [])
assert.deepStrictEqual(collectUnwindCandidates([1, 'x']), [])

const entries = buildUnwoundRowEntries(orders, '.orders', 'items')
assert.strictEqual(entries.length, 4)
assert.deepStrictEqual(
  entries.map((e) => e.indexLabel),
  ['0.0', '0.1', '1', '2']
)
assert.strictEqual(entries[0].key, '0:0')
assert.strictEqual(entries[0].sourceIndex, 0)
assert.strictEqual(entries[0].rowPath, '.orders[0]')
assert.deepStrictEqual(entries[0].child, {
  index: 0,
  element: { sku: 'A-1', qty: 2, price: { amount: 100 } },
  path: '.orders[0].items[0]'
})
assert.strictEqual(entries[2].child, undefined)

const columns = collectUnwoundColumns(orders, 'items')
assert.deepStrictEqual(
  columns.map((c) => c.path),
  ['id', 'customer.name', 'customer.region', 'items[].sku', 'items[].qty', 'items[].price.amount']
)
assert.strictEqual(columns[3].label, 'sku')

const tagColumns = collectUnwoundColumns(orders, 'tags')
assert.ok(tagColumns.some((c) => c.path === 'tags[]' && c.label === 'tags'))

assert.strictEqual(getChildRelativePath('items[].sku', 'items'), 'sku')
assert.strictEqual(getChildRelativePath('items[].price.amount', 'items'), 'price.amount')
assert.strictEqual(getChildRelativePath('items[]', 'items'), '')
assert.strictEqual(getChildRelativePath('customer.name', 'items'), null)
assert.strictEqual(getChildRelativePath('itemsX[].sku', 'items'), null)

const entry0 = entries[0]
assert.strictEqual(resolveUnwoundValue(entry0.element, entry0.child, 'customer.name', 'items'), 'Ada')
assert.strictEqual(resolveUnwoundValue(entry0.element, entry0.child, 'items[].sku', 'items'), 'A-1')
assert.strictEqual(resolveUnwoundValue(entry0.element, entry0.child, 'items[].price.amount', 'items'), 100)
const entry2 = entries[2]
assert.strictEqual(resolveUnwoundValue(entry2.element, entry2.child, 'items[].sku', 'items'), undefined)

assert.strictEqual(getUnwoundCellPath(entry0.rowPath, entry0.child, 'customer.name', 'items'), '.orders[0].customer.name')
assert.strictEqual(getUnwoundCellPath(entry0.rowPath, entry0.child, 'items[].sku', 'items'), '.orders[0].items[0].sku')
const tagEntries = buildUnwoundRowEntries(orders, '.orders', 'tags')
assert.strictEqual(getUnwoundCellPath(tagEntries[1].rowPath, tagEntries[1].child, 'tags[]', 'tags'), '.orders[0].tags[1]')
assert.strictEqual(getUnwindChildIndexForPath('.orders', '.orders[0].items[40].sku', 'items'), 40)
assert.strictEqual(getUnwindChildIndexForPath('', '[0].items[1].sku', 'items'), 1)
assert.strictEqual(getUnwindChildIndexForPath('.orders', '.orders[0].id', 'items'), null)

const unwinds = { '.orders': { relativePath: 'items' } }
const projections = {
  '.orders': {
    isSelecting: false,
    appliedColumns: [
      { path: 'id', label: 'id', groupPath: '' },
      { path: 'items[].sku', label: 'sku', groupPath: 'items[]' }
    ],
    draftColumnPaths: ['id', 'items[].sku'],
    draftQuery: ''
  }
}
assert.strictEqual(isPathVisibleUnderUnwind(unwinds, projections, '.orders[0].items[1].sku'), true)
assert.strictEqual(isPathVisibleUnderUnwind(unwinds, projections, '.orders[0].items[1].qty'), false)
assert.strictEqual(isPathVisibleUnderUnwind(unwinds, projections, '.orders[0].items[0].price.amount'), false)
assert.strictEqual(isPathVisibleUnderUnwind(unwinds, projections, '.orders[0].customer.name'), true)
assert.strictEqual(isPathVisibleUnderUnwind(unwinds, {}, '.orders[0].items[1].qty'), true)
assert.strictEqual(isPathVisibleUnderUnwind({}, projections, '.orders[0].items[1].qty'), true)
assert.strictEqual(isPathVisibleUnderUnwind(unwinds, projections, '.other[0].x'), true)

console.log('unwind tests passed')

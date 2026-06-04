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
  'scrollPosition.ts'
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

const { normalizeScrollTop, updateTabScrollTop } = moduleUnderTest.exports

assert.strictEqual(normalizeScrollTop(123.7), 123.7)
assert.strictEqual(normalizeScrollTop(-20), 0)
assert.strictEqual(normalizeScrollTop(Number.NaN), 0)
assert.strictEqual(normalizeScrollTop(Number.POSITIVE_INFINITY), 0)

const tabs = [
  { id: 'tab-a', scrollTop: 120, label: 'A' },
  { id: 'tab-b', scrollTop: 20, label: 'B' }
]
const updated = updateTabScrollTop(tabs, 'tab-b', 540)

assert.deepStrictEqual(tabs, [
  { id: 'tab-a', scrollTop: 120, label: 'A' },
  { id: 'tab-b', scrollTop: 20, label: 'B' }
])
assert.deepStrictEqual(updated, [
  { id: 'tab-a', scrollTop: 120, label: 'A' },
  { id: 'tab-b', scrollTop: 540, label: 'B' }
])
assert.strictEqual(updateTabScrollTop(tabs, 'tab-a', 120), tabs)
assert.strictEqual(updateTabScrollTop(tabs, 'missing', 88), tabs)

console.log('scroll position state tests passed')

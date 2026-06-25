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
  'virtualScroll.ts'
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
  MAX_VIRTUAL_SCROLL_HEIGHT,
  MAX_VIRTUAL_SPACER_ROW_HEIGHT,
  getVirtualScrollScale,
  splitVirtualSpacerHeight
} = moduleUnderTest.exports

assert.strictEqual(getVirtualScrollScale(0), 1)
assert.strictEqual(getVirtualScrollScale(-10), 1)
assert.strictEqual(getVirtualScrollScale(Number.POSITIVE_INFINITY), 1)
assert.strictEqual(getVirtualScrollScale(MAX_VIRTUAL_SCROLL_HEIGHT - 1), 1)
assert.strictEqual(getVirtualScrollScale(MAX_VIRTUAL_SCROLL_HEIGHT), 1)
assert.strictEqual(getVirtualScrollScale(MAX_VIRTUAL_SCROLL_HEIGHT * 3), 3)

assert.deepStrictEqual(splitVirtualSpacerHeight(0), [])
assert.deepStrictEqual(splitVirtualSpacerHeight(-10), [])
assert.deepStrictEqual(splitVirtualSpacerHeight(Number.POSITIVE_INFINITY), [])
assert.deepStrictEqual(splitVirtualSpacerHeight(42.2), [43])
assert.deepStrictEqual(splitVirtualSpacerHeight(MAX_VIRTUAL_SPACER_ROW_HEIGHT), [
  MAX_VIRTUAL_SPACER_ROW_HEIGHT
])
assert.deepStrictEqual(splitVirtualSpacerHeight(MAX_VIRTUAL_SPACER_ROW_HEIGHT + 17), [
  MAX_VIRTUAL_SPACER_ROW_HEIGHT,
  17
])

const veryLargeHeight = 33_554_432
const chunks = splitVirtualSpacerHeight(veryLargeHeight)
assert.strictEqual(
  chunks.reduce((sum, chunk) => sum + chunk, 0),
  veryLargeHeight
)
assert.ok(chunks.every((chunk) => chunk > 0 && chunk <= MAX_VIRTUAL_SPACER_ROW_HEIGHT))

console.log('virtual scroll tests passed')

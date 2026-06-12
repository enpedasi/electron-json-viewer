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
  'JsonView',
  'searchPrune.ts'
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

const { buildPrunePathSets, isPathVisibleInPrune } = moduleUnderTest.exports

assert.strictEqual(buildPrunePathSets([]), null)

const prune = buildPrunePathSets([
  { path: '.groups[0].users[1].name', value: 'Grace' },
  { path: '.metadata', value: 'metadata' }
])

assert.strictEqual(isPathVisibleInPrune(prune, ''), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.groups'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.groups[0]'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.groups[0].users'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.groups[0].users[1]'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.groups[0].users[1].name'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.metadata'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.metadata.created'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.metadata.tags[3]'), true)
assert.strictEqual(isPathVisibleInPrune(prune, '.groups[1]'), false)
assert.strictEqual(isPathVisibleInPrune(prune, '.groups[0].users[0]'), false)
assert.strictEqual(isPathVisibleInPrune(prune, '.other'), false)
assert.strictEqual(isPathVisibleInPrune(prune, '.metadata2'), false)
assert.strictEqual(isPathVisibleInPrune(null, '.anything'), true)
assert.strictEqual(isPathVisibleInPrune(undefined, '.anything'), true)

console.log('search prune tests passed')

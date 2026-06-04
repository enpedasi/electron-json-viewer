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
  'expandedPaths.ts'
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

const { collectExpandablePaths, isPathExpanded, updateExpandedPaths } = moduleUnderTest.exports

const original = ['.users', '.metadata']
const withDetails = updateExpandedPaths(original, '.users[0].details', true)

assert.deepStrictEqual(original, ['.users', '.metadata'])
assert.deepStrictEqual(withDetails, ['.users', '.metadata', '.users[0].details'])
assert.deepStrictEqual(updateExpandedPaths(withDetails, '.users', false), [
  '.metadata',
  '.users[0].details'
])
assert.deepStrictEqual(updateExpandedPaths(withDetails, '.users[0].details', true), withDetails)

assert.strictEqual(isPathExpanded('', [], false), true)
assert.strictEqual(isPathExpanded('.users', ['.users'], false), true)
assert.strictEqual(isPathExpanded('.users', [], true), true)
assert.strictEqual(isPathExpanded('.users', [], false), false)

assert.deepStrictEqual(
  collectExpandablePaths({
    users: [
      { name: 'Ada', details: { active: true } },
      { name: 'Linus', tags: ['kernel', 'git'] }
    ],
    metadata: { count: 2 },
    empty: []
  }),
  ['.users', '.users[0]', '.users[0].details', '.users[1]', '.users[1].tags', '.metadata', '.empty']
)
assert.deepStrictEqual(collectExpandablePaths([{ items: [1, 2] }]), ['[0]', '[0].items'])
assert.deepStrictEqual(collectExpandablePaths('plain value'), [])

console.log('expanded path state tests passed')

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
  'rowEntries.ts'
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

const { buildPlainRowEntries } = moduleUnderTest.exports

const entries = buildPlainRowEntries([{ a: 1 }, 'x', null], '.users')
assert.strictEqual(entries.length, 3)
assert.deepStrictEqual(entries[0], {
  key: '0',
  indexLabel: '0',
  sourceIndex: 0,
  element: { a: 1 },
  rowPath: '.users[0]'
})
assert.strictEqual(entries[2].rowPath, '.users[2]')

const rootEntries = buildPlainRowEntries(['x'], '')
assert.strictEqual(rootEntries[0].rowPath, '[0]')

console.log('row entries tests passed')

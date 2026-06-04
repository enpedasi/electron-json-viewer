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
  'FileUtils.ts'
)

const source = fs.readFileSync(sourcePath, 'utf8')
const { code } = esbuild.transformSync(source, {
  loader: 'ts',
  format: 'cjs',
  target: 'es2020'
})

const moduleUnderTest = { exports: {} }
const runModule = new Function('exports', 'module', 'require', code)
runModule(moduleUnderTest.exports, moduleUnderTest, require)

const { getFileNameFromPath } = moduleUnderTest.exports

assert.strictEqual(getFileNameFromPath(null), 'Untitled')
assert.strictEqual(getFileNameFromPath('/home/user/data/sample.json'), 'sample.json')
assert.strictEqual(getFileNameFromPath('C:\\Users\\ueno\\data\\sample.json'), 'sample.json')
assert.strictEqual(getFileNameFromPath('C:/Users/ueno/data/sample.json'), 'sample.json')
assert.strictEqual(getFileNameFromPath('mixed/path\\sample.yaml'), 'sample.yaml')
assert.strictEqual(getFileNameFromPath('sample.json'), 'sample.json')

console.log('file path display tests passed')

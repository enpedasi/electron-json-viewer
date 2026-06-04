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
  'Tabs',
  'openFiles.ts'
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

const { planOpenedFiles } = moduleUnderTest.exports

let nextId = 1
const createTab = (filePath) => ({
  id: `new-${nextId++}`,
  filePath,
  jsonData: null,
  isDirty: false
})
const prepareTabForFile = (tab, filePath) => ({ ...tab, filePath })

const existingTabs = [
  { id: 'tab-a', filePath: '/data/a.json', jsonData: { a: true }, isDirty: false },
  { id: 'tab-b', filePath: '/data/b.json', jsonData: { b: true }, isDirty: false }
]

const firstPlan = planOpenedFiles({
  tabs: existingTabs,
  filePaths: ['/data/c.json'],
  createTab,
  prepareTabForFile
})

assert.strictEqual(firstPlan.tabs.length, 3)
assert.strictEqual(firstPlan.tabs[2].filePath, '/data/c.json')
assert.deepStrictEqual(firstPlan.filesToLoad, [{ filePath: '/data/c.json', tabId: 'new-1' }])
assert.strictEqual(firstPlan.activeTabId, 'new-1')

const duplicatePlan = planOpenedFiles({
  tabs: firstPlan.tabs,
  filePaths: ['/data/c.json'],
  createTab,
  prepareTabForFile
})

assert.strictEqual(duplicatePlan.tabs, firstPlan.tabs)
assert.deepStrictEqual(duplicatePlan.filesToLoad, [])
assert.strictEqual(duplicatePlan.activeTabId, 'new-1')

const emptyTabPlan = planOpenedFiles({
  tabs: [{ id: 'empty', filePath: null, jsonData: null, isDirty: false }],
  filePaths: ['/data/d.json'],
  createTab,
  prepareTabForFile
})

assert.deepStrictEqual(emptyTabPlan.tabs, [
  { id: 'empty', filePath: '/data/d.json', jsonData: null, isDirty: false }
])
assert.deepStrictEqual(emptyTabPlan.filesToLoad, [{ filePath: '/data/d.json', tabId: 'empty' }])
assert.strictEqual(emptyTabPlan.activeTabId, 'empty')

const repeatedInSameEventPlan = planOpenedFiles({
  tabs: existingTabs,
  filePaths: ['/data/e.json', '/data/e.json'],
  createTab,
  prepareTabForFile
})

assert.strictEqual(repeatedInSameEventPlan.tabs.length, 3)
assert.deepStrictEqual(repeatedInSameEventPlan.filesToLoad, [
  { filePath: '/data/e.json', tabId: 'new-2' }
])

console.log('open files plan tests passed')

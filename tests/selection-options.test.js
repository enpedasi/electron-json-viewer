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
  'selectionOptions.ts'
)

const tmpFile = path.join(__dirname, '_selection_options_bundle.js')
esbuild.buildSync({
  entryPoints: [sourcePath],
  bundle: true,
  format: 'cjs',
  target: 'es2020',
  outfile: tmpFile,
  external: []
})

const {
  buildSelectionOptionsDto,
  serializeSelectionOptions,
  parseSelectionOptions,
  applySelectionOptionsToData,
  hasAnyActiveSelection,
  isOptionFilePath
} = require(tmpFile)

fs.unlinkSync(tmpFile)

const emptyKeyFilters = {}
const emptyColumnProjections = {}

const activeKeyFilters = {
  '.statuses': {
    isSelecting: false,
    appliedKeys: ['release', 'unitStatus', 'definition'],
    draftKeys: ['release', 'unitStatus', 'definition'],
    draftQuery: ''
  }
}

const activeColumnProjections = {
  '.statuses': {
    isSelecting: false,
    appliedColumns: [
      { path: 'unitStatus.jobNumber', label: 'jobNumber', groupPath: 'unitStatus' },
      { path: 'unitStatus.startTime', label: 'startTime', groupPath: 'unitStatus' },
      { path: 'definition.unitName', label: 'unitName', groupPath: 'definition' }
    ],
    draftColumnPaths: ['unitStatus.jobNumber', 'unitStatus.startTime', 'definition.unitName'],
    draftQuery: ''
  }
}

console.log('Test: hasAnyActiveSelection returns false for empty states')
assert.strictEqual(hasAnyActiveSelection(emptyKeyFilters, emptyColumnProjections), false)

console.log('Test: hasAnyActiveSelection returns true for active keyFilters')
assert.strictEqual(hasAnyActiveSelection(activeKeyFilters, emptyColumnProjections), true)

console.log('Test: hasAnyActiveSelection returns true for active columnProjections')
assert.strictEqual(hasAnyActiveSelection(emptyKeyFilters, activeColumnProjections), true)

console.log('Test: buildSelectionOptionsDto includes only applied data')
const dto = buildSelectionOptionsDto('sample.json', activeKeyFilters, activeColumnProjections)
assert.strictEqual(dto.type, 'json-grid-viewer-selection-options')
assert.strictEqual(dto.version, 1)
assert.strictEqual(dto.sourceFileName, 'sample.json')
assert.deepStrictEqual(dto.keyFilters, { '.statuses': ['release', 'unitStatus', 'definition'] })
assert.deepStrictEqual(dto.columnProjections, {
  '.statuses': ['unitStatus.jobNumber', 'unitStatus.startTime', 'definition.unitName']
})

console.log('Test: buildSelectionOptionsDto excludes empty applied states')
const emptyDto = buildSelectionOptionsDto('test.json', emptyKeyFilters, emptyColumnProjections)
assert.deepStrictEqual(emptyDto.keyFilters, {})
assert.deepStrictEqual(emptyDto.columnProjections, {})

console.log('Test: buildSelectionOptionsDto excludes draft and query state')
const draftState = {
  '.items': {
    isSelecting: true,
    appliedKeys: ['a', 'b'],
    draftKeys: ['a', 'b', 'c'],
    draftQuery: 'search text'
  }
}
const draftDto = buildSelectionOptionsDto('test.json', draftState, emptyColumnProjections)
assert.deepStrictEqual(draftDto.keyFilters, { '.items': ['a', 'b'] })

console.log('Test: serializeSelectionOptions produces valid JSON')
const json = serializeSelectionOptions(dto)
const parsed = JSON.parse(json)
assert.strictEqual(parsed.type, 'json-grid-viewer-selection-options')
assert.strictEqual(parsed.version, 1)

console.log('Test: parseSelectionOptions accepts valid option JSON')
const optionJson = JSON.stringify({
  type: 'json-grid-viewer-selection-options',
  version: 1,
  sourceFileName: 'sample.json',
  savedAt: '2026-06-06T00:00:00.000Z',
  keyFilters: { '.statuses': ['release', 'unitStatus'] },
  columnProjections: { '.statuses': ['unitStatus.jobNumber'] }
})
const options = parseSelectionOptions(optionJson)
assert.ok(options)
assert.deepStrictEqual(options.keyFilters, { '.statuses': ['release', 'unitStatus'] })
assert.deepStrictEqual(options.columnProjections, { '.statuses': ['unitStatus.jobNumber'] })

console.log('Test: parseSelectionOptions rejects invalid type')
assert.strictEqual(parseSelectionOptions('{"type":"invalid","version":1}'), null)

console.log('Test: parseSelectionOptions rejects invalid version')
assert.strictEqual(parseSelectionOptions('{"type":"json-grid-viewer-selection-options","version":2}'), null)

console.log('Test: parseSelectionOptions rejects non-JSON')
assert.strictEqual(parseSelectionOptions('not json'), null)

console.log('Test: parseSelectionOptions ignores non-string array values')
const badOption = JSON.stringify({
  type: 'json-grid-viewer-selection-options',
  version: 1,
  sourceFileName: 'test.json',
  savedAt: '2026-06-06T00:00:00.000Z',
  keyFilters: { '.path': ['valid', 123] },
  columnProjections: { '.path': ['valid'] }
})
const badParsed = parseSelectionOptions(badOption)
assert.ok(badParsed)
assert.deepStrictEqual(badParsed.keyFilters, {})

console.log('Test: applySelectionOptionsToData reconstructs key filters')
const data = {
  statuses: [
    { release: null, unitStatus: { jobNumber: 1 }, definition: { unitName: 'test' } },
    { release: {}, unitStatus: { jobNumber: 2 }, definition: { unitName: 'test2' } }
  ]
}
const applyResult = applySelectionOptionsToData(data, options)
assert.ok(applyResult.keyFilters['.statuses'])
assert.deepStrictEqual(applyResult.keyFilters['.statuses'].appliedKeys, ['release', 'unitStatus'])

console.log('Test: applySelectionOptionsToData skips non-existent keys')
const partialOption = parseSelectionOptions(JSON.stringify({
  type: 'json-grid-viewer-selection-options',
  version: 1,
  sourceFileName: 'test.json',
  savedAt: '2026-06-06T00:00:00.000Z',
  keyFilters: { '.statuses': ['release', 'nonExistent'] },
  columnProjections: {}
}))
const partialResult = applySelectionOptionsToData(data, partialOption)
assert.deepStrictEqual(partialResult.keyFilters['.statuses'].appliedKeys, ['release'])

console.log('Test: applySelectionOptionsToData skips non-existent paths')
const missingPathOption = parseSelectionOptions(JSON.stringify({
  type: 'json-grid-viewer-selection-options',
  version: 1,
  sourceFileName: 'test.json',
  savedAt: '2026-06-06T00:00:00.000Z',
  keyFilters: { '.nonExistent': ['a'] },
  columnProjections: {}
}))
const missingResult = applySelectionOptionsToData(data, missingPathOption)
assert.deepStrictEqual(missingResult.keyFilters, {})

console.log('Test: applySelectionOptionsToData resolves bracket-indexed array paths')
const nestedData = {
  groups: [
    {
      items: [
        { name: 'A', value: 1 },
        { name: 'B', value: 2 }
      ]
    }
  ]
}
const bracketOption = parseSelectionOptions(JSON.stringify({
  type: 'json-grid-viewer-selection-options',
  version: 1,
  sourceFileName: 'test.json',
  savedAt: '2026-06-06T00:00:00.000Z',
  keyFilters: { '.groups[0].items': ['name'] },
  columnProjections: {}
}))
const bracketResult = applySelectionOptionsToData(nestedData, bracketOption)
assert.ok(bracketResult.keyFilters['.groups[0].items'])
assert.deepStrictEqual(bracketResult.keyFilters['.groups[0].items'].appliedKeys, ['name'])

console.log('Test: isOptionFilePath detects .option files')
assert.strictEqual(isOptionFilePath('sample.json.option'), true)
assert.strictEqual(isOptionFilePath('sample.json'), false)
assert.strictEqual(isOptionFilePath('test.yaml.option'), true)

console.log('\nAll selection-options tests passed!')

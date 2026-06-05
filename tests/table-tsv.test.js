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
  'tableTsv.ts'
)

const tmpFile = path.join(__dirname, '_table_tsv_bundle.js')
esbuild.buildSync({
  entryPoints: [sourcePath],
  bundle: true,
  format: 'cjs',
  target: 'es2020',
  outfile: tmpFile,
  external: []
})

const { buildTsvFromColumns } = require(tmpFile)

fs.unlinkSync(tmpFile)

console.log('Test: TSV with direct keys as headers')
const rows = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false }
]
const columns = [
  { header: 'name' },
  { header: 'age' },
  { header: 'active' }
]
const tsv = buildTsvFromColumns(rows, columns)
const lines = tsv.split('\n')
assert.strictEqual(lines[0], 'name\tage\tactive')
assert.strictEqual(lines[1], 'Alice\t30\ttrue')
assert.strictEqual(lines[2], 'Bob\t25\tfalse')

console.log('Test: TSV with nested column paths')
const nestedRows = [
  { user: { name: 'Alice', address: { city: 'Tokyo' } }, score: 100 },
  { user: { name: 'Bob', address: { city: 'Osaka' } }, score: 95 }
]
const nestedColumns = [
  { header: 'name', valuePath: 'user.name' },
  { header: 'city', valuePath: 'user.address.city' },
  { header: 'score' }
]
const nestedTsv = buildTsvFromColumns(nestedRows, nestedColumns)
const nestedLines = nestedTsv.split('\n')
assert.strictEqual(nestedLines[0], 'name\tcity\tscore')
assert.strictEqual(nestedLines[1], 'Alice\tTokyo\t100')
assert.strictEqual(nestedLines[2], 'Bob\tOsaka\t95')

console.log('Test: null and undefined become empty string')
const nullRows = [
  { a: null, b: undefined, c: 'text' }
]
const nullColumns = [{ header: 'a' }, { header: 'b' }, { header: 'c' }]
const nullTsv = buildTsvFromColumns(nullRows, nullColumns)
const nullLines = nullTsv.split('\n')
assert.strictEqual(nullLines[1], '\t\ttext')

console.log('Test: tabs and newlines in values are replaced with space')
const specialRows = [
  { text: 'hello\tworld\nnext' }
]
const specialColumns = [{ header: 'text' }]
const specialTsv = buildTsvFromColumns(specialRows, specialColumns)
const specialLines = specialTsv.split('\n')
assert.strictEqual(specialLines[0], 'text')
assert.strictEqual(specialLines[1], 'hello world next')

console.log('Test: object and array values are JSON stringified')
const complexRows = [
  { obj: { key: 'val' }, arr: [1, 2] }
]
const complexColumns = [{ header: 'obj' }, { header: 'arr' }]
const complexTsv = buildTsvFromColumns(complexRows, complexColumns)
const complexLines = complexTsv.split('\n')
assert.strictEqual(complexLines[1], '{"key":"val"}\t[1,2]')

console.log('Test: projection columns with valuePath')
const projRows = [
  { id: 1, data: { x: 10, y: 20 } },
  { id: 2, data: { x: 30, y: 40 } }
]
const projColumns = [
  { header: 'x', valuePath: 'data.x' },
  { header: 'y', valuePath: 'data.y' }
]
const projTsv = buildTsvFromColumns(projRows, projColumns)
const projLines = projTsv.split('\n')
assert.strictEqual(projLines[0], 'x\ty')
assert.strictEqual(projLines[1], '10\t20')
assert.strictEqual(projLines[2], '30\t40')

console.log('\nAll table-tsv tests passed!')

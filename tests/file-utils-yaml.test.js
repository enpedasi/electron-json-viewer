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

const {
  detectFileType,
  parseContent,
  serializeData,
  validateText,
  defaultFileName
} = moduleUnderTest.exports

const fixturesDir = path.join(__dirname, 'fixtures')

// 以下は js-yaml 4.1.1（更新前）で FileUtils.ts 経由の動作を確認して固定した golden 値。
const SAMPLE = [
  'base: &base',
  '  enabled: true',
  'item:',
  '  <<: *base',
  '  name: "x"',
  'list:',
  '  - 1',
  '  - two',
  '  - { k: v }',
  'empty: null',
  'tagged: !Ref SomeParam',
  'nested:',
  '  key: value'
].join('\n')

const EXPECTED_DATA = {
  base: { enabled: true },
  item: { enabled: true, name: 'x' },
  list: [1, 'two', { k: 'v' }],
  empty: null,
  tagged: 'SomeParam',
  nested: { key: 'value' }
}

const EXPECTED_DUMP = [
  'base:',
  '  enabled: true',
  'item:',
  '  enabled: true',
  '  name: x',
  'list:',
  '  - 1',
  '  - two',
  '  - k: v',
  'empty: null',
  'tagged: SomeParam',
  'nested:',
  '  key: value',
  ''
].join('\n')

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL: ${name} — ${e.message}`)
    failed++
  }
}

check('detectFileType: .yaml/.yml → yaml, .json → json', () => {
  assert.strictEqual(detectFileType('foo.yaml'), 'yaml')
  assert.strictEqual(detectFileType('foo.yml'), 'yaml')
  assert.strictEqual(detectFileType('foo.json'), 'json')
  assert.strictEqual(detectFileType(null), 'json')
})

check('defaultFileName: yaml → untitled.yaml', () => {
  assert.strictEqual(defaultFileName('yaml'), 'untitled.yaml')
  assert.strictEqual(defaultFileName('json'), 'untitled.json')
})

check('parseContent: golden expectedData と一致', () => {
  assert.deepStrictEqual(parseContent(SAMPLE, 'yaml'), EXPECTED_DATA)
})

check('serializeData: golden expectedDump と完全一致', () => {
  assert.strictEqual(serializeData(EXPECTED_DATA, 'yaml'), EXPECTED_DUMP)
})

check('round-trip: parse → dump → parse で同一', () => {
  const first = parseContent(SAMPLE, 'yaml')
  const dumped = serializeData(first, 'yaml')
  const second = parseContent(dumped, 'yaml')
  assert.deepStrictEqual(second, first)
})

check('validateText: 正しい YAML は期待データを返す', () => {
  assert.deepStrictEqual(validateText('a: 1\nb:\n  - x\n', 'yaml'), { a: 1, b: ['x'] })
})

check('validateText: 不正 YAML は例外を投げる', () => {
  assert.throws(() => validateText('a: b: c', 'yaml'))
})

const cases = [
  {
    file: 'nsis-embedded.yaml',
    assertData: (result) => {
      assert.strictEqual(typeof result.nsis.script, 'string')
      assert.ok(result.nsis.script.startsWith('!include "StdUtils.nsh"'))
    }
  },
  {
    file: 'cloudformation.yaml',
    assertData: (result) => {
      assert.strictEqual(result.Resources.MyBucket.Type, 'AWS::S3::Bucket')
      assert.strictEqual(
        result.Resources.MyBucket.Properties.BucketName,
        'BucketNameParam'
      )
    }
  },
  {
    file: 'ruby-tags.yaml',
    assertData: (result) => {
      assert.ok(Array.isArray(result), 'expected array from ruby tags')
      assert.strictEqual(result.length, 2)
    }
  }
]

for (const { file, assertData } of cases) {
  const filePath = path.join(fixturesDir, file)
  const raw = fs.readFileSync(filePath, 'utf8')
  check(`${file}: parseContent で主要値が取得できる`, () => {
    const result = parseContent(raw, 'yaml')
    assertData(result)
  })
  check(`${file}: round-trip でデータが同一`, () => {
    const first = parseContent(raw, 'yaml')
    const second = parseContent(serializeData(first, 'yaml'), 'yaml')
    assert.deepStrictEqual(second, first)
  })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)

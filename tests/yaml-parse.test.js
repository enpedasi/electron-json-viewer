const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

const tolerantSchema = yaml.DEFAULT_SCHEMA.extend({
  explicit: [
    new yaml.Type('!', {
      kind: 'scalar',
      multi: true,
      resolve: () => true,
      construct: (data) => data ?? ''
    }),
    new yaml.Type('!', {
      kind: 'mapping',
      multi: true,
      resolve: () => true,
      construct: (data) => data ?? {}
    }),
    new yaml.Type('!', {
      kind: 'sequence',
      multi: true,
      resolve: () => true,
      construct: (data) => data ?? []
    })
  ]
})

const fixturesDir = path.join(__dirname, 'fixtures')

const cases = [
  { file: 'nsis-embedded.yaml', key: 'nsis' },
  { file: 'cloudformation.yaml', key: 'AWSTemplateFormatVersion' },
  { file: 'ruby-tags.yaml', key: null }
]

let passed = 0
let failed = 0

for (const { file, key } of cases) {
  const filePath = path.join(fixturesDir, file)
  const raw = fs.readFileSync(filePath, 'utf8')
  try {
    const result = yaml.load(raw, { schema: tolerantSchema })
    if (key && result[key] === undefined) {
      console.log(`  FAIL: ${file} — missing key "${key}"`)
      failed++
    } else {
      console.log(`  PASS: ${file}`)
      passed++
    }
  } catch (e) {
    console.log(`  FAIL: ${file} — ${e.message}`)
    failed++
  }
}

const builderDebug = path.join(__dirname, '..', 'dist', 'builder-debug.yml')
if (fs.existsSync(builderDebug)) {
  const raw = fs.readFileSync(builderDebug, 'utf8')
  try {
    const result = yaml.load(raw, { schema: tolerantSchema })
    if (result && result.nsis) {
      console.log('  PASS: dist/builder-debug.yml')
      passed++
    } else {
      console.log('  FAIL: dist/builder-debug.yml — missing key "nsis"')
      failed++
    }
  } catch (e) {
    console.log(`  FAIL: dist/builder-debug.yml — ${e.message}`)
    failed++
  }
} else {
  console.log('  SKIP: dist/builder-debug.yml (not present)')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)

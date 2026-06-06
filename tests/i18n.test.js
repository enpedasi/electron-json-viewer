const assert = require('assert')
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const sourcePath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'i18n.ts')
const tmpFile = path.join(__dirname, '_i18n_bundle.js')

esbuild.buildSync({
  entryPoints: [sourcePath],
  bundle: true,
  format: 'cjs',
  target: 'es2020',
  outfile: tmpFile,
  external: []
})

const {
  LANGUAGE_STORAGE_KEY,
  createTranslator,
  detectInitialLanguage,
  messages,
  setStoredLanguage
} = require(tmpFile)

fs.unlinkSync(tmpFile)

function makeStorage(value) {
  return {
    value,
    getItem(key) {
      return key === LANGUAGE_STORAGE_KEY ? this.value : null
    },
    setItem(key, nextValue) {
      if (key === LANGUAGE_STORAGE_KEY) this.value = nextValue
    }
  }
}

function makeEnv({ stored = null, language, languages } = {}) {
  return {
    storage: makeStorage(stored),
    language,
    languages
  }
}

console.log('Test: detects Japanese from navigator.languages')
assert.strictEqual(detectInitialLanguage(makeEnv({ languages: ['ja-JP'] })), 'ja')
assert.strictEqual(detectInitialLanguage(makeEnv({ languages: ['en-US', 'ja-JP'] })), 'ja')

console.log('Test: defaults to English for non-Japanese languages')
assert.strictEqual(detectInitialLanguage(makeEnv({ language: 'en-US' })), 'en')

console.log('Test: uses stored language before auto-detection')
assert.strictEqual(detectInitialLanguage(makeEnv({ stored: 'ja', language: 'en-US' })), 'ja')

console.log('Test: ignores invalid stored language')
assert.strictEqual(detectInitialLanguage(makeEnv({ stored: 'fr', language: 'ja-JP' })), 'ja')

console.log('Test: persists selected language')
const storage = makeStorage(null)
setStoredLanguage('ja', storage)
assert.strictEqual(storage.value, 'ja')
assert.strictEqual(detectInitialLanguage({ storage, language: 'en-US' }), 'ja')

console.log('Test: English and Japanese dictionaries share the same keys')
assert.deepStrictEqual(Object.keys(messages.en).sort(), Object.keys(messages.ja).sort())

console.log('Test: translators return localized strings')
assert.strictEqual(createTranslator('en')('tabs.save'), 'Save')
assert.strictEqual(createTranslator('ja')('tabs.save'), '保存')

console.log('Test: translators interpolate values')
assert.strictEqual(createTranslator('en')('tabs.closeTab', { name: 'sample.json' }), 'Close tab sample.json')
assert.strictEqual(createTranslator('ja')('tabs.closeTab', { name: 'sample.json' }), 'sample.json タブを閉じる')

console.log('\nAll i18n tests passed!')

# English and Japanese i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add English and Japanese runtime UI localization with automatic first-launch detection and persisted manual override.

**Architecture:** Add a small renderer-only i18n module with typed language helpers, dictionaries, localStorage persistence, and a translator function. `App.tsx` owns language state and passes the translator through the existing component tree; UI components replace hard-coded user-facing strings with translation lookups.

**Tech Stack:** React 18, TypeScript, Vite, Node-based utility tests bundled with esbuild.

---

## File Structure

- Create `src/renderer/src/i18n.ts`: language type, dictionaries, language detection, persistence, translator factory.
- Create `tests/i18n.test.js`: Node tests for detection, persistence, dictionary parity, and translation fallback.
- Modify `src/renderer/src/App.tsx`: own language state, create translator, pass language controls and translations to child components, translate app-level strings.
- Modify `src/renderer/src/components/Tabs/TabsComponent.tsx`: add language switcher and translate tab controls.
- Modify `src/renderer/src/components/JsonView/JsonViewComponent.tsx`: translate search overlay, floating actions, empty/loading/error states, and pass translator onward.
- Modify `src/renderer/src/components/JsonView/TextEditor.tsx`: translate text editor controls and parse error prefix.
- Modify `src/renderer/src/components/Cell/Cell.tsx`: translate max-depth label and pass translator onward.
- Modify `src/renderer/src/components/Cell/ArrayTable.tsx`: translate filter/projection/copy/add labels.
- Modify `src/renderer/src/components/Cell/ArrayRow.tsx`: translate row delete label and pass translator onward.
- Modify `src/renderer/src/components/Cell/ObjectTable.tsx`: translate headers, add-property controls, delete labels, and pass translator onward.
- Modify `src/renderer/src/components/Cell/EditableCell.tsx`: translate editable cell tooltips.

## Task 1: i18n Utility

**Files:**
- Create: `src/renderer/src/i18n.ts`
- Test: `tests/i18n.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/i18n.test.js` with tests that bundle `src/renderer/src/i18n.ts` and assert:

```js
assert.strictEqual(detectInitialLanguage(makeEnv({ languages: ['ja-JP'] })), 'ja')
assert.strictEqual(detectInitialLanguage(makeEnv({ language: 'en-US' })), 'en')
assert.strictEqual(detectInitialLanguage(makeEnv({ stored: 'ja', language: 'en-US' })), 'ja')
assert.strictEqual(detectInitialLanguage(makeEnv({ stored: 'fr', language: 'ja-JP' })), 'ja')
assert.deepStrictEqual(Object.keys(messages.en).sort(), Object.keys(messages.ja).sort())
assert.strictEqual(createTranslator('en')('tabs.save'), 'Save')
assert.strictEqual(createTranslator('ja')('tabs.save'), '保存')
```

Use an in-memory storage object:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/i18n.test.js`

Expected: FAIL because `src/renderer/src/i18n.ts` does not exist or does not export the required API.

- [ ] **Step 3: Write minimal implementation**

Create `src/renderer/src/i18n.ts` with:

```ts
export type Language = 'en' | 'ja'
export type TranslationKey = keyof typeof messages.en
export const LANGUAGE_STORAGE_KEY = 'json-grid-viewer.language'

export const messages = {
  en: {
    'tabs.save': 'Save',
    'tabs.view': 'View',
    'tabs.edit': 'Edit',
    'tabs.text': 'Text',
    'tabs.grid': 'Grid',
    'tabs.newTab': 'New tab',
    'tabs.untitled': 'Untitled',
    'tabs.closeTab': 'Close tab {name}',
    'tabs.switchToView': 'Switch to view mode',
    'tabs.switchToEdit': 'Switch to edit mode',
    'tabs.showText': 'Show text view',
    'tabs.showGrid': 'Show grid view',
    'tabs.language': 'Language',
    'tabs.english': 'English',
    'tabs.japanese': 'Japanese',
    'app.selectTab': 'Select a tab.',
    'app.start': 'Open a file, drag and drop, or use the + button to start a new tab.',
    'file.pasted': 'Pasted {type}',
    'file.clipboardInvalid': 'Clipboard content is not valid JSON or YAML',
    'file.cannotRead': 'Cannot read file outside the desktop environment.',
    'file.errorPrefix': 'Error - {name}',
    'file.loadFailed': 'Failed to load or parse: {message}',
    'json.searchPlaceholder': 'Search (Enter to run/next)',
    'json.clearSearch': 'Clear search',
    'json.search': 'Search',
    'json.close': 'Close (Esc)',
    'json.expandAll': 'Expand all',
    'json.keyFilterMode': 'Key filter mode',
    'json.keyFilter': 'Key filter',
    'json.columnProjectionMode': 'Select nested array values as columns',
    'json.columnProjection': 'Columns',
    'json.undo': 'Undo (Ctrl+Z)',
    'json.redo': 'Redo (Ctrl+Shift+Z)',
    'json.save': 'Save (Ctrl+S)',
    'json.error': 'Error:',
    'json.dropFile': 'Drag and drop a JSON/YAML file',
    'json.pasteIntro': 'or paste from the clipboard',
    'json.paste': 'Paste from clipboard',
    'json.pasteShortcut': 'Paste from clipboard (Ctrl+V)',
    'json.loading': 'Loading {name}...',
    'json.copyFiltered': 'Copy data after filter/column selection',
    'json.copied': 'Copied',
    'cell.maxDepth': 'Max depth reached',
    'cell.clickToToggle': 'Click to toggle',
    'cell.doubleClickToEdit': 'Double-click to edit',
    'table.copyTsv': 'Copy visible table as TSV',
    'table.saveSelection': 'Save selection settings',
    'table.hiddenCount': '{count} hidden',
    'table.searchKeys': 'Search keys',
    'table.searchColumnPaths': 'Search column paths',
    'table.apply': 'Apply',
    'table.clear': 'Clear',
    'table.cancel': 'Cancel',
    'table.visibleKeys': 'Visible keys: {keys}',
    'table.visibleColumns': 'Visible columns: {columns}',
    'table.addElement': '+ Add element',
    'table.delete': 'Delete',
    'object.key': 'key',
    'object.val': 'val',
    'object.newKey': 'New key name',
    'object.add': 'Add',
    'object.addProperty': '+ Add property',
    'text.format': 'Format',
    'text.minify': 'Minify',
    'text.parseError': '{type} parse error: {message}'
  },
  ja: {
    'tabs.save': '保存',
    'tabs.view': '閲覧',
    'tabs.edit': '編集',
    'tabs.text': 'テキスト',
    'tabs.grid': 'グリッド',
    'tabs.newTab': '新しいタブ',
    'tabs.untitled': '無題',
    'tabs.closeTab': '{name} タブを閉じる',
    'tabs.switchToView': '閲覧モードに切替',
    'tabs.switchToEdit': '編集モードに切替',
    'tabs.showText': 'テキスト表示',
    'tabs.showGrid': 'グリッド表示',
    'tabs.language': '言語',
    'tabs.english': '英語',
    'tabs.japanese': '日本語',
    'app.selectTab': 'タブを選択してください。',
    'app.start': 'ファイルを開くか、ドラッグ＆ドロップ、または「+」ボタンで新しいタブを開始してください。',
    'file.pasted': '貼り付けた {type}',
    'file.clipboardInvalid': 'クリップボードの内容は有効な JSON または YAML ではありません',
    'file.cannotRead': 'デスクトップ環境の外ではファイルを読み込めません。',
    'file.errorPrefix': 'エラー - {name}',
    'file.loadFailed': '読み込みまたは解析に失敗しました: {message}',
    'json.searchPlaceholder': '検索 (Enterで実行/次へ)',
    'json.clearSearch': '検索をクリア',
    'json.search': '検索',
    'json.close': '閉じる (Esc)',
    'json.expandAll': '全て展開',
    'json.keyFilterMode': 'キー絞込モード',
    'json.keyFilter': 'キー絞込',
    'json.columnProjectionMode': '配列のネストした値を列として選択',
    'json.columnProjection': '列選択',
    'json.undo': '元に戻す (Ctrl+Z)',
    'json.redo': 'やり直し (Ctrl+Shift+Z)',
    'json.save': '保存 (Ctrl+S)',
    'json.error': 'エラー:',
    'json.dropFile': 'JSON/YAMLファイルをドラッグ&ドロップしてください',
    'json.pasteIntro': 'または、クリップボードからペースト',
    'json.paste': 'クリップボードからペースト',
    'json.pasteShortcut': 'クリップボードからペースト (Ctrl+V)',
    'json.loading': '{name} を読み込み中...',
    'json.copyFiltered': 'フィルター/列選択適用後のデータをコピー',
    'json.copied': 'コピーしました',
    'cell.maxDepth': '最大深度に到達しました',
    'cell.clickToToggle': 'クリックで切替',
    'cell.doubleClickToEdit': 'ダブルクリックで編集',
    'table.copyTsv': '表示中の表をTSVコピー',
    'table.saveSelection': '選択設定を保存',
    'table.hiddenCount': '{count} hidden',
    'table.searchKeys': 'キーを検索',
    'table.searchColumnPaths': '列パスを検索',
    'table.apply': '確定',
    'table.clear': '解除',
    'table.cancel': '取消',
    'table.visibleKeys': '表示キー: {keys}',
    'table.visibleColumns': '表示列: {columns}',
    'table.addElement': '+ 要素を追加',
    'table.delete': '削除',
    'object.key': 'キー',
    'object.val': '値',
    'object.newKey': '新しいキー名',
    'object.add': '追加',
    'object.addProperty': '+ プロパティを追加',
    'text.format': 'フォーマット',
    'text.minify': '最小化',
    'text.parseError': '{type}パースエラー: {message}'
  }
} as const
```

Then implement detection and interpolation:

```ts
export interface LanguageEnvironment {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  language?: string
  languages?: readonly string[]
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ja'
}

export function detectInitialLanguage(env: LanguageEnvironment = {}): Language {
  const stored = env.storage?.getItem(LANGUAGE_STORAGE_KEY)
  if (isLanguage(stored)) return stored
  const candidates = env.languages?.length ? env.languages : [env.language]
  return candidates.some((candidate) => candidate?.toLowerCase().startsWith('ja')) ? 'ja' : 'en'
}

export function detectAppLanguage(): Language {
  return detectInitialLanguage({
    storage: typeof window !== 'undefined' ? window.localStorage : null,
    language: typeof navigator !== 'undefined' ? navigator.language : undefined,
    languages: typeof navigator !== 'undefined' ? navigator.languages : undefined
  })
}

export function setStoredLanguage(language: Language, storage = window.localStorage): void {
  storage.setItem(LANGUAGE_STORAGE_KEY, language)
}

export function createTranslator(language: Language) {
  return (key: TranslationKey, values: Record<string, string | number> = {}) => {
    const template = messages[language][key] ?? messages.en[key] ?? key
    return String(template).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`))
  }
}

export type Translator = ReturnType<typeof createTranslator>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/i18n.test.js`

Expected: PASS with all i18n tests passed.

## Task 2: Wire Language State and Tab Switcher

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/Tabs/TabsComponent.tsx`
- Test: `tests/i18n.test.js`

- [ ] **Step 1: Write the failing test**

Extend `tests/i18n.test.js` to assert persistence:

```js
const storage = makeStorage(null)
setStoredLanguage('ja', storage)
assert.strictEqual(storage.value, 'ja')
assert.strictEqual(detectInitialLanguage({ storage, language: 'en-US' }), 'ja')
```

- [ ] **Step 2: Run test to verify it fails if persistence is not complete**

Run: `node tests/i18n.test.js`

Expected: PASS if Task 1 already implemented persistence; otherwise FAIL with storage mismatch. If it passes, continue because this task's production work is UI wiring around the tested API.

- [ ] **Step 3: Wire `App.tsx`**

Import and initialize:

```ts
import {
  Language,
  createTranslator,
  detectAppLanguage,
  setStoredLanguage
} from './i18n'
```

Add state inside `App`:

```ts
const [language, setLanguage] = useState<Language>(() => detectAppLanguage())
const t = useMemo(() => createTranslator(language), [language])
const handleLanguageChange = useCallback((nextLanguage: Language) => {
  setLanguage(nextLanguage)
  setStoredLanguage(nextLanguage)
}, [])
```

Pass `t`, `language`, and `onLanguageChange` to `TabsComponent`, and pass `t` to `JsonViewComponent`.

- [ ] **Step 4: Wire `TabsComponent.tsx`**

Add props:

```ts
import { Language, Translator } from '../../i18n'

language: Language
onLanguageChange: (language: Language) => void
t: Translator
```

Replace tab labels and titles with `t(...)`. Add language buttons in `.tab-mode-buttons`:

```tsx
<div className="language-switcher" title={t('tabs.language')} aria-label={t('tabs.language')}>
  <button className={`tab-mode-btn ${language === 'en' ? 'active' : ''}`} onClick={() => onLanguageChange('en')} title={t('tabs.english')}>EN</button>
  <button className={`tab-mode-btn ${language === 'ja' ? 'active' : ''}`} onClick={() => onLanguageChange('ja')} title={t('tabs.japanese')}>日本語</button>
</div>
```

- [ ] **Step 5: Run build**

Run: `npm run web:build`

Expected: PASS. Fix TypeScript import or prop errors before moving on.

## Task 3: Translate Viewer and Text Editor

**Files:**
- Modify: `src/renderer/src/components/JsonView/JsonViewComponent.tsx`
- Modify: `src/renderer/src/components/JsonView/TextEditor.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Write failing coverage target**

Use `rg` as the red check:

Run: `rg -n "検索|全て展開|キー絞込|列選択|エラー:|ドラッグ|クリップボード|読み込み中|フォーマット|最小化|パースエラー" src/renderer/src/components/JsonView src/renderer/src/App.tsx`

Expected before implementation: matches hard-coded Japanese UI strings.

- [ ] **Step 2: Translate `JsonViewComponent.tsx`**

Add `t: Translator` prop, replace text:

```tsx
placeholder={t('json.searchPlaceholder')}
aria-label={t('json.clearSearch')}
{t('json.search')}
title={t('json.close')}
title={t('json.expandAll')}
{t('json.expandAll')}
title={t('json.keyFilterMode')}
{t('json.keyFilter')}{hasAnyActiveKeyFilter(tabData.keyFilters) ? ' *' : ''}
title={t('json.columnProjectionMode')}
{t('json.columnProjection')}{hasAnyActiveColumnProjection(tabData.columnProjections) ? ' *' : ''}
<p>{t('json.error')}</p>
<p>{t('json.dropFile')}</p>
<span>{t('json.pasteIntro')}</span>
title={t('json.pasteShortcut')}
aria-label={t('json.paste')}
<p>{t('json.loading', { name: tabData.fileName })}</p>
```

Pass `t` to `TextEditor`, `Cell`, and `CopyFilterButton`. Update `CopyFilterButton` to use `t('json.copied')` and `t('json.copyFiltered')`.

- [ ] **Step 3: Translate `TextEditor.tsx`**

Add `t: Translator` prop. Replace:

```tsx
{t('text.format')}
{t('text.minify')}
{t('text.parseError', { type: label, message: error })}
```

- [ ] **Step 4: Translate app-level strings in `App.tsx`**

Replace pasted/error names and empty states:

```ts
fileName: t('file.pasted', { type: result.fileType.toUpperCase() })
jsonData: { error: t('file.clipboardInvalid') }
jsonData: { error: t('file.cannotRead') }
fileName: t('file.errorPrefix', { name: getFileNameFromPath(filePath) })
jsonData: { error: t('file.loadFailed', { message: error.message || String(error) }) }
```

Replace inactive panel text:

```tsx
<p>{t('app.selectTab')}</p>
<p>{t('app.start')}</p>
```

- [ ] **Step 5: Verify string search and build**

Run: `rg -n "検索|全て展開|キー絞込|列選択|エラー:|ドラッグ|クリップボード|読み込み中|フォーマット|最小化|パースエラー" src/renderer/src/components/JsonView src/renderer/src/App.tsx`

Expected: no matches for user-facing hard-coded strings, except comments if any remain.

Run: `npm run web:build`

Expected: PASS.

## Task 4: Translate Cell and Table Components

**Files:**
- Modify: `src/renderer/src/components/Cell/Cell.tsx`
- Modify: `src/renderer/src/components/Cell/ArrayTable.tsx`
- Modify: `src/renderer/src/components/Cell/ArrayRow.tsx`
- Modify: `src/renderer/src/components/Cell/ObjectTable.tsx`
- Modify: `src/renderer/src/components/Cell/EditableCell.tsx`

- [ ] **Step 1: Write failing coverage target**

Run: `rg -n "削除|追加|取消|確定|解除|表示キー|表示列|コピーしました|TSV|選択設定|キーを検索|列パスを検索|ダブルクリック|クリックで切替|Max depth|hidden|プロパティ|新しいキー" src/renderer/src/components/Cell`

Expected before implementation: matches hard-coded UI strings.

- [ ] **Step 2: Pass translator through `Cell.tsx` and `ArrayRow.tsx`**

Add `t: Translator` prop to both components and pass it to nested `Cell`, `ArrayTable`, and `ObjectTable` calls. Replace:

```tsx
return <span className="value">{t('cell.maxDepth')}</span>
```

- [ ] **Step 3: Translate `EditableCell.tsx`**

Add `t: Translator` prop and replace titles:

```tsx
title={t('cell.clickToToggle')}
title={t('cell.doubleClickToEdit')}
```

- [ ] **Step 4: Translate `ArrayTable.tsx`**

Add `t: Translator` prop and replace labels:

```tsx
title={tsvCopied ? t('json.copied') : t('table.copyTsv')}
aria-label={tsvCopied ? t('json.copied') : t('table.copyTsv')}
<span className="key-filter-title">{t('json.keyFilter')}</span>
title={t('table.saveSelection')}
aria-label={t('table.saveSelection')}
<span className="key-filter-badge">{t('table.hiddenCount', { count: hiddenCount })}</span>
placeholder={t('table.searchKeys')}
{t('table.apply')}
{t('table.clear')}
{t('table.cancel')}
{t('table.visibleKeys', { keys: visibleKeys.join(', ') })}
<span className="column-projection-title">{t('json.columnProjection')}</span>
placeholder={t('table.searchColumnPaths')}
{t('table.visibleColumns', { columns: appliedProjectionColumns.map((column) => column.path).join(', ') })}
{t('table.addElement')}
```

- [ ] **Step 5: Translate `ObjectTable.tsx`**

Add `t: Translator` prop and replace labels:

```ts
{ header: t('object.key'), thClass: 'object key' }
{ header: t('object.val'), thClass: 'object value' }
```

Update controls:

```tsx
title={t('table.delete')}
placeholder={t('object.newKey')}
{t('object.add')}
{t('table.cancel')}
{t('object.addProperty')}
```

- [ ] **Step 6: Verify string search and build**

Run: `rg -n "削除|追加|取消|確定|解除|表示キー|表示列|コピーしました|選択設定|キーを検索|列パスを検索|ダブルクリック|クリックで切替|Max depth|プロパティ|新しいキー" src/renderer/src/components/Cell`

Expected: no matches for user-facing hard-coded strings, except translation dictionary imports or non-user comments.

Run: `npm run web:build`

Expected: PASS.

## Task 5: Final Verification

**Files:**
- Modify as needed based on verification only.

- [ ] **Step 1: Run i18n unit test**

Run: `node tests/i18n.test.js`

Expected: PASS.

- [ ] **Step 2: Run existing utility tests**

Run:

```bash
node tests/open-files-plan.test.js
node tests/key-filter.test.js
node tests/selection-options.test.js
node tests/search-json.test.js
node tests/scroll-position.test.js
node tests/table-tsv.test.js
node tests/yaml-parse.test.js
node tests/expanded-paths.test.js
node tests/column-projection.test.js
node tests/file-path-display.test.js
```

Expected: all PASS.

- [ ] **Step 3: Run TypeScript/Vite build**

Run: `npm run web:build`

Expected: PASS.

- [ ] **Step 4: Search for remaining hard-coded UI strings**

Run:

```bash
rg -n "保存|閲覧|編集|検索|全て展開|キー絞込|列選択|削除|追加|取消|確定|解除|ドラッグ|クリップボード|フォーマット|最小化|パースエラー|Untitled|Close tab|New Tab|Max depth reached|Copy visible|Double-click" src/renderer/src --glob '!i18n.ts'
```

Expected: no user-facing hard-coded UI strings remain. Investigate each match and either translate it or confirm it is not user-facing.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add src/renderer/src/i18n.ts tests/i18n.test.js src/renderer/src/App.tsx src/renderer/src/components/Tabs/TabsComponent.tsx src/renderer/src/components/JsonView/JsonViewComponent.tsx src/renderer/src/components/JsonView/TextEditor.tsx src/renderer/src/components/Cell/Cell.tsx src/renderer/src/components/Cell/ArrayTable.tsx src/renderer/src/components/Cell/ArrayRow.tsx src/renderer/src/components/Cell/ObjectTable.tsx src/renderer/src/components/Cell/EditableCell.tsx docs/superpowers/plans/2026-06-06-english-japanese-i18n.md
git commit -m "feat: add english and japanese ui localization"
```

Expected: commit succeeds and includes only i18n implementation files plus this plan.

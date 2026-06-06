export type Language = 'en' | 'ja'

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
    'tabs.menu': 'Menu',
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
    'tabs.menu': 'メニュー',
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

export type TranslationKey = keyof typeof messages.en

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

export function setStoredLanguage(
  language: Language,
  storage: Pick<Storage, 'setItem'> = window.localStorage
): void {
  storage.setItem(LANGUAGE_STORAGE_KEY, language)
}

export function createTranslator(language: Language) {
  return (key: TranslationKey, values: Record<string, string | number> = {}) => {
    const template = messages[language][key] ?? messages.en[key] ?? key
    return String(template).replace(/\{(\w+)\}/g, (_, name) =>
      String(values[name] ?? `{${name}}`)
    )
  }
}

export type Translator = ReturnType<typeof createTranslator>

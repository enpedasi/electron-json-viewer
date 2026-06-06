# English and Japanese i18n Design

## Context

The app is a Tauri + React JSON/YAML viewer and editor. User-facing renderer strings are currently embedded directly in React components, with a mix of Japanese and English labels. README files already exist separately for English and Japanese, so this work focuses on runtime UI language support inside the app.

## Goal

Support English and Japanese UI text. On first launch, the app should choose Japanese when the browser or OS language starts with `ja`; otherwise it should choose English. Users can override the language from inside the app, and that choice should persist across launches.

## Non-Goals

- Translating JSON/YAML keys, values, filenames, or file contents.
- Translating developer console logs or test output.
- Adding external i18n dependencies.
- Reworking README files or documentation beyond this implementation spec.
- Localizing native file dialog filter names or Rust-native dialog copy in this first pass.

## Proposed Approach

Add a lightweight renderer i18n module rather than introducing a full i18n library. The app only needs two languages and simple static strings, so a local dictionary keeps the change small and easy to test.

The module will expose:

- `Language`: `'en' | 'ja'`
- `detectInitialLanguage()`: returns saved language if present, otherwise detects from `navigator.language` / `navigator.languages`
- `setStoredLanguage(language)`: persists a manual choice in `localStorage`
- `createTranslator(language)`: returns a typed translation lookup function
- English and Japanese dictionaries with the same keys

## UI Placement

Add a compact language switcher to the existing tab action area near Save / View / Edit / Text/Grid controls. The switcher should show the current language and allow toggling between `EN` and `日本語`. This keeps the setting visible without creating a new settings screen.

## Component Flow

`App.tsx` owns the selected language state. On startup it calls `detectInitialLanguage()`. When the user changes language, `App.tsx` updates state and persists the new value.

`App.tsx` creates a translator for the active language and passes it to UI components that render labels:

- `TabsComponent`
- `JsonViewComponent`
- `TextEditor`
- `Cell`
- `ArrayTable`
- `ArrayRow`
- `ObjectTable`
- `EditableCell`

This keeps translation explicit and avoids a broad React context refactor. Use explicit props for this implementation because the current component tree is shallow.

## Translation Scope

Translate visible UI text, placeholders, button text, titles, and aria labels for:

- Tabs and tab controls.
- Save, view/edit, text/grid controls.
- Search overlay labels and placeholders.
- Empty state and loading state text.
- Error headings and parse error prefixes.
- Expand all, undo, redo, key filter, column projection, copy, apply, clear, cancel.
- Add property and add array item controls.
- Editable cell tooltips.
- Object table headers `key` and `val`.

Dynamic data remains unchanged:

- File names.
- JSON/YAML values.
- Object keys and array indexes.
- Search result counts.
- Column paths and selected key lists.

## Error Handling

If stored language is invalid or unavailable, fall back to auto-detection. If a translation key is missing in development, the translator should return the key or a clear fallback rather than crashing the app. Tests should catch missing keys between dictionaries.

## Persistence

Use `localStorage` with a stable key such as `json-grid-viewer.language`. The stored value is only accepted when it is `en` or `ja`.

## Testing

Add Node-based unit tests for the i18n utility module:

- Auto-detects Japanese for `ja`, `ja-JP`, and Japanese entries in `navigator.languages`.
- Defaults to English for non-Japanese language settings.
- Uses a valid stored language before auto-detection.
- Ignores invalid stored language values.
- Verifies English and Japanese dictionaries have identical key sets.

Run existing relevant tests plus TypeScript build:

- `node tests/i18n.test.js`
- Existing Node tests if the implementation touches shared utilities.
- `npm run web:build`

## Risks

The main risk is missing a hard-coded UI string during the first pass. Mitigation: search TSX files for Japanese UI text and common English UI labels after implementation, then convert any remaining user-facing strings.

Another risk is prop churn across table/cell components. Keep the prop shape consistent by passing the same translator function through the existing component hierarchy.

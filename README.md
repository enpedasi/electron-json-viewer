# JSON Grid Viewer

A cross-platform desktop viewer and editor for JSON / YAML data, focused on visualizing arrays as tables and objects as key-value pairs. Built with a React 18 + TypeScript frontend inside a [Tauri v2](https://v2.tauri.app/) (Rust) shell, making it lighter and faster than its Electron-based predecessor.

> Based on the MIT-licensed [dutchigor/json-grid-viewer](https://github.com/dutchigor/json-grid-viewer). This repository adds Tauri migration, YAML support, editing/Undo-Redo functionality, and more.

---

## Key Features

### Viewing
- **Grid View**: Arrays are rendered as tables with column headers; objects are rendered as two-column `key | value` tables
- **Text View**: Display and edit raw data (JSON format/minify, YAML format)
- **Expand / Collapse**: Per-node expand state persistence, with `+ / -` buttons and keyboard (`+` `-` `→`) support
- **"Expand All" button**: Expand the entire tree at once
- **Data type color-coding** highlight
- **Column width resizing**: Drag the right edge of a header to resize; double-click to reset

### Search
- Full-text search across keys and values (`Ctrl/Cmd + F`)
- Highlight matches and jump to the next with Enter
- Auto-expand parent nodes containing matches

### Editing (`Edit` mode)
- Inline editing of primitive values (double-click / Enter / F2)
- Click to toggle `true` / `false` for booleans; `null` value editing support
- Objects: add, delete, and rename properties
- Arrays: add and delete elements
- Undo / Redo (up to 100 steps, `Ctrl/Cmd + Z` / `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y`)
- Unsaved (`*`) indicator per tab
- Unsaved changes confirmation dialog on tab/window close

### File Operations
- Load and save JSON / YAML (`.json` / `.yaml` / `.yml`)
- Drag & drop multiple files to open them as tabs simultaneously
- OS "Open with" integration (Tauri `files-opened` event)
- "Save As" dialog (JSON / YAML / All Files filter)
- Supports Japanese filenames and paths with spaces

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop Runtime | Tauri v2 (Rust) |
| Frontend | React 18, TypeScript |
| Build Tool | Vite 7 |
| YAML Parsing | js-yaml |
| Desktop API | `@tauri-apps/api` / `@tauri-apps/plugin-{dialog,fs,os}` |
| Tauri Commands | `rfd` for confirmation dialogs |
| Testing | Node.js (`node:assert` + esbuild) |
| Linting / Formatting | ESLint, Prettier |

---

## Directory Structure

```text
electron-json-viewer/
├── build/                    # (legacy) Electron build resources
├── resources/                # Icons, etc.
├── src/
│   └── renderer/             # Vite root (React frontend)
│       ├── index.html
│       └── src/
│           ├── App.tsx                # Tab state, history, shortcuts orchestration
│           ├── App.css
│           ├── main.jsx
│           ├── platform/              # Desktop API boundary (Tauri implementation)
│           │   ├── index.ts
│           │   ├── tauriApi.ts
│           │   └── types.ts
│           └── components/
│               ├── Tabs/              # Tab UI
│               │   ├── TabsComponent.tsx
│               │   ├── TabsComponent.css
│               │   └── openFiles.ts
│               ├── JsonView/          # View area
│               │   ├── JsonViewComponent.tsx
│               │   ├── TextEditor.tsx
│               │   └── scrollPosition.ts
│               └── Cell/              # Grid rendering
│                   ├── Cell.tsx
│                   ├── ArrayTable.tsx
│                   ├── ArrayRow.tsx
│                   ├── ObjectTable.tsx
│                   ├── EditableCell.tsx
│                   ├── ResizableTable.tsx
│                   ├── CellUtils.ts
│                   ├── expandedPaths.ts
│                   └── FileUtils.ts
├── src-tauri/                # Tauri (Rust) backend
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── capabilities/
│   ├── icons/
│   └── src/
│       ├── main.rs
│       └── lib.rs            # show_unsaved_dialog etc. #[tauri::command]
├── tests/                    # Node.js-based utility tests
│   ├── expanded-paths.test.js
│   ├── file-path-display.test.js
│   ├── open-files-plan.test.js
│   ├── scroll-position.test.js
│   ├── yaml-parse.test.js
│   └── fixtures/             # Test YAML samples
├── vite.config.ts            # Frontend Vite configuration
├── tsconfig.json
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** 18 or later
- **Rust** stable (MSVC toolchain) 1.77.2 or later
- **Windows**: Microsoft C++ Build Tools, WebView2 Runtime
- **macOS**: Xcode Command Line Tools
- **Linux**: Tauri dependencies such as `webkit2gtk` / `libssl` (see official docs)

For details, refer to the official Tauri [Prerequisites](https://v2.tauri.app/start/prerequisites/) page.

---

## Setup and Development Commands

```bash
# Install dependencies
npm install

# Start as a Tauri app (Vite dev server + Rust app)
npm run dev

# Frontend-only development (runs in browser, Tauri APIs are stubbed)
npm run web:dev

# Static build
npm run web:build
npm run web:preview

# Lint / Format
npm run lint
npm run format
```

## Build

```bash
# Tauri release build for the host OS
npm run build
```

The output is placed under `src-tauri/target/release/bundle/`.
The Tauri bundler configuration (`tauri.conf.json`) generates OS-specific installers and executables.

## Tests

```bash
node tests/expanded-paths.test.js
node tests/file-path-display.test.js
node tests/open-files-plan.test.js
node tests/scroll-position.test.js
node tests/yaml-parse.test.js
```

Node.js-based unit tests for the utility layer (`expandedPaths`, `openFiles`, etc.).
It is recommended to run ESLint / Prettier static analysis and formatting before CI.

---

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Save | `Ctrl/Cmd + S` |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` |
| Open search bar | `Ctrl/Cmd + F` |
| Close search bar | `Esc` |
| Edit cell (text mode) | `Enter` or `F2` |
| Cancel cell edit | `Esc` |
| Expand node | `+` or `→` |
| Collapse node | `-` |

---

## Design Notes

- **Data Model**: The internal representation is a format-agnostic JS object. All display, editing, and search operations work against this object.
- **Desktop API Boundary**: Native functionality is abstracted through the `DesktopApi` interface in `src/renderer/src/platform/`, limiting the impact when swapping to a different runtime in the future.
- **YAML Schema**: `FileUtils.ts` extends the `js-yaml` schema with a fallback so that documents containing `!` tags can be loaded without crashing.
- **History Management**: `applyOperation` / `invertOperation` make each `set` / `delete` / `add` / `rename` operation reversible, enabling Undo / Redo.

---

## License

This project is released under the MIT License.
The frontend grid rendering logic is based on [dutchigor/json-grid-viewer](https://github.com/dutchigor/json-grid-viewer) (MIT).
YAML parsing uses [js-yaml](https://github.com/nodeca/js-yaml) (MIT).

# JSON Grid Viewer

JSON / YAML データを「配列はテーブル」「オブジェクトはキー・バリュー」で可視化することに重点を置いた、クロスプラットフォーム対応のデスクトップビューア兼エディタです。
React 18 + TypeScript のフロントエンドを [Tauri v2](https://v2.tauri.app/) (Rust) のシェルで動作させ、Electron ベースの前身より軽量・高速に動作します。

> 元になっているのは MIT ライセンスの [dutchigor/json-grid-viewer](https://github.com/dutchigor/json-grid-viewer) です。本リポジトリはそれをベースに Tauri 移行、YAML 対応、編集/Undo-Redo 機能などを追加しています。

---

## 主な機能

### 閲覧
- **グリッドビュー**: 配列は列ヘッダ付きのテーブル形式、オブジェクトは `key | value` の 2 列表で描画
- **テキストビュー**: 生データの表示・編集（JSON はフォーマット / 最小化、YAML はフォーマット）
- **展開 / 折りたたみ**: ノード単位の展開状態の保持、`+ / -` ボタンとキーボード (`+` `-` `→`) に対応
- **「全て展開」ボタン**: ツリー全体を一括展開
- **データ型ごとの色分け** ハイライト
- **列幅のリサイズ**: ヘッダ右端をドラッグで列幅調整、ダブルクリックでリセット

### 検索
- キーおよび値に含まれる文字列の全文検索 (`Ctrl/Cmd + F`)
- マッチ箇所をハイライトし、Enter で次候補へジャンプ
- 検索に連動してマッチを包含する親ノードを自動展開

### 編集 (`編集` モード)
- プリミティブ値のインライン編集（ダブルクリック / Enter / F2）
- ブール値はクリックで `true` / `false` をトグル、`null` 値の編集対応
- オブジェクト: プロパティの追加・削除・キー名のリネーム
- 配列: 要素の追加・削除
- Undo / Redo（最大 100 ステップ、`Ctrl/Cmd + Z` / `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y`）
- タブ単位の未保存 (`*`) 表示
- タブ / ウィンドウクローズ時の未保存確認ダイアログ

### ファイル操作
- JSON / YAML（`.json` / `.yaml` / `.yml`）の読み込み・保存
- ドラッグ & ドロップで複数ファイルを同時に開いてタブ化
- OS の「アプリで開く」連携 (Tauri `files-opened` イベント)
- 「名前を付けて保存」ダイアログ (JSON / YAML / All Files フィルタ)
- 日本語ファイル名、スペース入りパスにも対応

---

## 技術スタック

| レイヤ | 採用技術 |
| --- | --- |
| デスクトップランタイム | Tauri v2 (Rust) |
| フロントエンド | React 18, TypeScript |
| ビルドツール | Vite 7 |
| YAML パース | js-yaml |
| デスクトップ API | `@tauri-apps/api` / `@tauri-apps/plugin-{dialog,fs,os}` |
| Tauri コマンド | `rfd` による確認ダイアログ |
| テスト | Node.js (`node:assert` + esbuild) |
| 静的解析 / 整形 | ESLint, Prettier |

---

## ディレクトリ構成

```text
electron-json-viewer/
├── build/                    # (legacy) Electron 用ビルドリソース
├── resources/                # アイコン等
├── src/
│   └── renderer/             # Vite ルート (React フロントエンド)
│       ├── index.html
│       └── src/
│           ├── App.tsx                # タブ状態・履歴・ショートカットの統括
│           ├── App.css
│           ├── main.jsx
│           ├── platform/              # デスクトップ API 境界 (Tauri 実装)
│           │   ├── index.ts
│           │   ├── tauriApi.ts
│           │   └── types.ts
│           └── components/
│               ├── Tabs/              # タブ UI
│               │   ├── TabsComponent.tsx
│               │   ├── TabsComponent.css
│               │   └── openFiles.ts
│               ├── JsonView/          # ビューエリア
│               │   ├── JsonViewComponent.tsx
│               │   ├── TextEditor.tsx
│               │   └── scrollPosition.ts
│               └── Cell/              # グリッド描画
│                   ├── Cell.tsx
│                   ├── ArrayTable.tsx
│                   ├── ArrayRow.tsx
│                   ├── ObjectTable.tsx
│                   ├── EditableCell.tsx
│                   ├── ResizableTable.tsx
│                   ├── CellUtils.ts
│                   ├── expandedPaths.ts
│                   └── FileUtils.ts
├── src-tauri/                # Tauri (Rust) バックエンド
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── capabilities/
│   ├── icons/
│   └── src/
│       ├── main.rs
│       └── lib.rs            # show_unsaved_dialog などの #[tauri::command]
├── tests/                    # Node.js ベースのユーティリティテスト
│   ├── expanded-paths.test.js
│   ├── file-path-display.test.js
│   ├── open-files-plan.test.js
│   ├── scroll-position.test.js
│   ├── yaml-parse.test.js
│   └── fixtures/             # テスト用 YAML サンプル
├── vite.config.ts            # フロントエンドの Vite 設定
├── tsconfig.json
├── package.json
└── README.md
```

---

## 開発環境の前提条件

- **Node.js** 18 以上
- **Rust** stable (MSVC toolchain) 1.77.2 以上
- **Windows**: Microsoft C++ Build Tools, WebView2 Runtime
- **macOS**: Xcode Command Line Tools
- **Linux**: `webkit2gtk` / `libssl` 等の Tauri 依存パッケージ（公式ドキュメント参照）

詳細は Tauri 公式の [Prerequisites](https://v2.tauri.app/start/prerequisites/) を参照してください。

---

## セットアップと開発コマンド

```bash
# 依存関係をインストール
npm install

# Tauri アプリとして開発起動 (Vite dev server + Rust アプリ)
npm run dev

# フロントエンド単体での開発 (ブラウザで動く, tauri API はスタブ)
npm run web:dev

# 静的ビルド
npm run web:build
npm run web:preview

# Lint / Format
npm run lint
npm run format
```

## ビルド

```bash
# ホスト OS 向けの Tauri リリースビルド
npm run build
```

成果物は `src-tauri/target/release/bundle/` 配下に出力されます。
Tauri の bundler 設定 (`tauri.conf.json`) により、OS に応じたインストーラや実行ファイルが生成されます。

## テスト

```bash
node tests/expanded-paths.test.js
node tests/file-path-display.test.js
node tests/open-files-plan.test.js
node tests/scroll-position.test.js
node tests/yaml-parse.test.js
```

ユーティリティ層 (`expandedPaths`, `openFiles` など) に対する Node.js ベースのユニットテストです。
ESLint / Prettier による静的解析と整形を CI の前に通すことを推奨します。

---

## キーボードショートカット

| 操作 | ショートカット |
| --- | --- |
| 保存 | `Ctrl/Cmd + S` |
| 元に戻す (Undo) | `Ctrl/Cmd + Z` |
| やり直し (Redo) | `Ctrl/Cmd + Shift + Z` または `Ctrl/Cmd + Y` |
| 検索バーを開く | `Ctrl/Cmd + F` |
| 検索バーを閉じる | `Esc` |
| セルを編集 (テキストモード時) | `Enter` または `F2` |
| セル編集をキャンセル | `Esc` |
| ノードを展開 | `+` または `→` |
| ノードを折りたたみ | `-` |

---

## 設計メモ

- **データモデル**: 内部表現はフォーマット非依存の JS オブジェクト。表示・編集・検索はすべてこのオブジェクトに対して行います。
- **デスクトップ API 境界**: `src/renderer/src/platform/` の `DesktopApi` インターフェースを介してネイティブ機能を抽象化しており、将来的に別ランタイムへ差し替える際の影響範囲を限定しています。
- **YAML スキーマ**: `FileUtils.ts` で `js-yaml` のスキーマを拡張し、`!` タグを含むドキュメントでも落ちずに読み込めるようフォールバックを定義しています。
- **履歴管理**: `applyOperation` / `invertOperation` により `set` / `delete` / `add` / `rename` の各操作を反転可能にし、Undo / Redo を実現しています。

---

## ライセンス

本プロジェクトは MIT ライセンスの下で公開されています。
フロントエンドのグリッド描画ロジックは [dutchigor/json-grid-viewer](https://github.com/dutchigor/json-grid-viewer) (MIT) をベースにしています。
YAML パースには [js-yaml](https://github.com/nodeca/js-yaml) (MIT) を使用しています。

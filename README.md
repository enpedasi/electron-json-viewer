# electron-json-grid

An Electron application with React

## 概要

electron-json-gridは、JSONデータを見やすく表示するためのデスクトップアプリケーションです。主な機能は以下の通りです：

- JSONファイルのドラッグ＆ドロップによる読み込み
- 配列やオブジェクトの展開・折りたたみ表示
- キーや値によるデータ検索機能
- データテーブルの列幅調整機能
- JSONデータの視覚化


## 機能詳細

- **JSONデータの表示**: 配列はテーブル形式、オブジェクトはキー・バリュー形式で表示
- **インタラクティブな操作**: 要素の展開/折りたたみが可能（+/-ボタンまたはキーボード）
- **検索機能**: キーワードによる検索と結果間の移動
- **レスポンシブなテーブル**: 列の幅をドラッグで調整可能
- **シンタックスハイライト**: データ型に応じた色分け表示

## 技術構成

- **フロントエンド**: React、TypeScript
- **デスクトップ化**: Electron
- **ビルドツール**: Electron Vite

## プロジェクト構成

```
electron-json-viewer/
├── build/                 # ビルド関連のリソース
│   ├── entitlements.mac.plist
│   └── icon.*             # アプリケーションアイコン（各OS用）
├── resources/             # アプリケーションリソース
│   └── icon.png           # アイコン画像
├── src/                   # ソースコード
│   ├── main/              # Electron メインプロセス
│   │   └── index.js       # メインプロセスのエントリーポイント
│   ├── preload/           # プリロードスクリプト
│   │   └── index.js       # レンダラープロセスとの通信ブリッジ
│   └── renderer/          # フロントエンド（レンダラープロセス）
│       ├── index.html     # HTML エントリーポイント
│       └── src/           # Reactアプリケーション
│           ├── App.tsx    # メインアプリケーションコンポーネント
│           ├── main.jsx   # Reactエントリーポイント
│           ├── assets/    # スタイルシートと画像
│           └── components/ # Reactコンポーネント
│               ├── Versions.jsx
│               └── Cell/  # JSONビューワーのコンポーネント
│                   ├── Cell.tsx       # 基本セルコンポーネント
│                   ├── ArrayTable.tsx # 配列表示コンポーネント
│                   ├── ArrayRow.tsx   # 配列行コンポーネント
│                   ├── ObjectTable.tsx # オブジェクト表示コンポーネント
│                   └── ResizableTable.tsx # サイズ調整可能テーブル
├── electron-builder.yml   # Electron Builder設定
├── electron.vite.config.mjs # Electron Vite設定
└── package.json           # プロジェクト依存関係とスクリプト
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esben.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## License

This project is licensed under MIT License. The licenses of the open source software used are as follows:

dutchigor/json-grid-viewer:  (MIT License)

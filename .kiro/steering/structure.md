# プロジェクト構造

> **Inclusion Mode**: Always
> このドキュメントは全てのAI対話で自動的に読み込まれます

## ルートディレクトリ構成

```
tickTackFour/
├── frontend/          # Reactフロントエンドアプリケーション
├── api/               # Azure Functionsバックエンド
├── e2e/               # E2Eテスト（Playwright）
├── .kiro/             # Spec-driven development管理
├── .claude/           # Claude Code設定・コマンド
├── .github/           # GitHub Actions CI/CD設定
├── CLAUDE.md          # プロジェクト全体のAI指示書
├── README.md          # プロジェクト説明書
└── staticwebapp.config.json  # Azure Static Web Apps設定
```

## フロントエンド構造 (`frontend/`)

### ディレクトリ構成
```
frontend/
├── src/
│   ├── types/         # 型定義
│   │   ├── GameState.ts        # ゲーム状態の型定義
│   │   ├── SignalREvents.ts    # SignalRイベントの型定義
│   │   ├── index.ts            # 型定義のエクスポート
│   │   └── __tests__/          # 型定義のテスト
│   ├── assets/        # 静的アセット（画像、アイコン等）
│   ├── App.tsx        # ルートReactコンポーネント
│   ├── App.css        # アプリケーションスタイル
│   ├── main.tsx       # エントリーポイント
│   └── index.css      # グローバルスタイル
├── public/            # 静的公開ファイル
│   └── vite.svg       # ファビコン等
├── index.html         # HTMLテンプレート
├── vite.config.ts     # Viteビルド設定
├── tsconfig.json      # TypeScript設定（全体）
├── tsconfig.app.json  # TypeScript設定（アプリ用）
├── tsconfig.node.json # TypeScript設定（Node用）
├── eslint.config.js   # ESLint設定
├── package.json       # 依存関係・スクリプト
└── README.md          # フロントエンド説明書
```

### 主要ファイルの役割
- **`types/`**: 共有型定義（フロントエンド・バックエンド間で型を共有）
- **`App.tsx`**: メインUIロジック、SignalR接続、タイマー管理
- **`main.tsx`**: ReactDOM初期化、アプリケーションマウント
- **`vite.config.ts`**: ビルド最適化、開発サーバー設定、プラグイン設定

## バックエンド構造 (`api/`)

### ディレクトリ構成
```
api/
├── src/
│   └── models/        # データモデルと型定義
│       ├── GameState.ts        # ゲーム状態モデル
│       ├── SignalREvents.ts    # SignalRイベント型
│       ├── index.ts            # モデルのエクスポート
│       └── __tests__/          # モデルのテスト
├── host.json          # Azure Functions ホスト設定
├── local.settings.json # ローカル環境変数
├── jest.config.js     # Jestテスト設定
├── tsconfig.json      # TypeScript設定
└── package.json       # 依存関係・スクリプト
```

### 主要ファイルの役割
- **`models/`**: ビジネスロジックとデータモデル（フロントエンドと型を共有）
- **`host.json`**: Functions実行環境の設定（ログレベル、タイムアウト等）
- **`local.settings.json`**: ローカル開発用の環境変数（Azure接続文字列等）

### Azure Functions構成（予定）
```
api/src/
├── functions/         # HTTPトリガー・SignalRバインディング関数
│   ├── negotiate/     # SignalR接続ネゴシエーション
│   ├── updateTimer/   # タイマー更新API
│   └── getGameState/  # ゲーム状態取得API
└── models/            # 共有データモデル
```

## E2Eテスト構造 (`e2e/`)

### ディレクトリ構成
```
e2e/
├── specs/                           # Phase 1/2統合テストスイート
│   ├── player-management.spec.ts    # プレイヤー管理テスト
│   ├── timer-operations.spec.ts     # タイマー動作テスト
│   ├── active-player.spec.ts        # アクティブプレイヤー管理テスト
│   ├── game-controls.spec.ts        # ゲーム制御テスト
│   ├── responsive-ui.spec.ts        # レスポンシブUIテスト
│   ├── persistence.spec.ts          # 永続化検証（Phase 2のみ実行）
│   └── realtime-sync.spec.ts        # リアルタイム同期検証（Phase 2のみ実行）
├── pages/                           # Page Object Model（POM）
│   └── GameTimerPage.ts             # ゲームタイマーページオブジェクト
├── fixtures/                        # テストフィクスチャ
│   └── gameStates.ts                # テスト用ゲーム状態データ
├── helpers/                         # ヘルパー関数
│   └── timeHelpers.ts               # 時間検証ヘルパー
├── tsconfig.json                    # E2Eテスト用TypeScript設定
└── playwright.config.ts             # Playwright設定ファイル
```

### 主要ファイルの役割
- **`specs/`**: Phase 1/2統合テストスイート（同じファイルで両フェーズに対応）
- **`pages/`**: Page Object Model パターンで UI 要素とロケーターを管理
- **`fixtures/`**: テストデータとフィクスチャ（再利用可能なテストデータ）
- **`helpers/`**: テストヘルパー関数（時間検証、状態検証等）
- **`playwright.config.ts`**: ブラウザ設定、ベースURL、タイムアウト等の設定

### テストアーキテクチャの特徴
- **Phase 1/2統合**: 同じテストファイルでインメモリ（Phase 1）とバックエンド統合（Phase 2）の両方に対応
- **環境変数制御**: Phase 2専用テストは `test.skip(process.env.PHASE !== '2')` で制御
- **data-testid**: 安定した要素選択のため `data-testid` 属性を使用
- **Page Object Model**: UI 構造変更の影響を最小化するためのデザインパターン

## Spec-Driven Development構造 (`.kiro/`)

### ディレクトリ構成
```
.kiro/
├── steering/          # プロジェクト全体のステアリング
│   ├── product.md     # 製品概要
│   ├── tech.md        # 技術スタック
│   └── structure.md   # プロジェクト構造（本ファイル）
└── specs/             # 機能仕様
    └── multiplayer-game-timer/
        ├── spec.json       # 仕様メタデータ
        ├── requirements.md # 要件定義
        ├── design.md       # 技術設計
        └── tasks.md        # 実装タスク
```

### ファイルの役割
- **`steering/`**: AI開発の全体ガイド（Always Included）
- **`specs/`**: 個別機能の仕様管理（Phase管理、承認フロー）

## Claude Code設定 (`.claude/`)

### ディレクトリ構成
```
.claude/
├── commands/kiro/     # Kiroカスタムスラッシュコマンド
│   ├── spec-init.md        # 仕様初期化
│   ├── spec-requirements.md # 要件生成
│   ├── spec-design.md      # 技術設計生成
│   ├── spec-tasks.md       # タスク生成
│   ├── spec-impl.md        # タスク実装
│   ├── spec-status.md      # 進捗確認
│   ├── steering.md         # ステアリング管理
│   ├── steering-custom.md  # カスタムステアリング
│   ├── validate-design.md  # 設計検証
│   └── validate-gap.md     # ギャップ分析
└── settings.local.json # ローカル設定
```

## CI/CD設定 (`.github/`)

### ディレクトリ構成
```
.github/
└── workflows/
    └── azure-static-web-apps.yml  # Azure自動デプロイ
```

## ファイル命名規則

### TypeScript/React
- **コンポーネント**: PascalCase + `.tsx` (例: `App.tsx`, `TimerDisplay.tsx`)
- **型定義**: PascalCase + `.ts` (例: `GameState.ts`, `SignalREvents.ts`)
- **ユーティリティ**: camelCase + `.ts` (例: `formatTime.ts`, `timerUtils.ts`)
- **テスト**: `__tests__/` ディレクトリ内、元ファイル名 + `.test.ts(x)`

### スタイル
- **グローバル**: `index.css`
- **コンポーネント**: コンポーネント名 + `.css` (例: `App.css`)
- **モジュールCSS**: コンポーネント名 + `.module.css` (将来的に導入予定)

### 設定ファイル
- **TypeScript設定**: `tsconfig.json`, `tsconfig.*.json`
- **ビルドツール**: `vite.config.ts`, `jest.config.js`
- **リンター**: `eslint.config.js`

## インポート構成パターン

### 絶対インポート（推奨）
TypeScriptパスマッピング設定により、以下のように絶対パスでインポート可能：
```typescript
// frontend/src 内のファイルから
import { GameState } from '@/types/GameState'
import { formatTime } from '@/utils/formatTime'
```

### 相対インポート
同一ディレクトリまたは近接ファイルは相対パスでインポート：
```typescript
import { GameState } from './GameState'
import { Timer } from '../components/Timer'
```

### バレルエクスポート
各ディレクトリの `index.ts` でまとめてエクスポート：
```typescript
// types/index.ts
export * from './GameState'
export * from './SignalREvents'

// 使用側
import { GameState, SignalREvent } from '@/types'
```

## コード組織パターン

### 関心の分離
- **型定義**: `types/` または `models/` に集約
- **ビジネスロジック**: カスタムフックまたはサービスクラス
- **UI**: Reactコンポーネント（Presentation/Container分離）
- **ユーティリティ**: `utils/` ディレクトリ（将来的に追加予定）

### 状態管理
- **ローカル状態**: `useState`, `useReducer`
- **グローバル状態**: SignalRによるサーバー同期（Context API不要）
- **副作用**: `useEffect` フック

### テスト配置
- **ユニットテスト**: 同ディレクトリ内の `__tests__/` フォルダ
- **E2Eテスト**: プロジェクトルートの `e2e/` ディレクトリ（Playwright）

## 主要アーキテクチャ原則

### 1. 型の共有
フロントエンドとバックエンドで型定義を共有し、型安全性を確保：
- `frontend/src/types/` ⟷ `api/src/models/`
- ビルド時に型チェック実施

### 2. 単方向データフロー
```
User Action → Azure Functions API → Cosmos DB
                      ↓
                SignalR Service
                      ↓
              All Clients (State Update)
```

### 3. モジュール境界
- フロントエンド: UIロジックとプレゼンテーション
- バックエンド: ビジネスロジックとデータ永続化
- 型定義: 両者の契約インターフェース

### 4. テスト駆動開発（TDD）
- 実装前にテストを作成（spec-implコマンド使用時）
- モデル・型定義は100%カバレッジ目標
- UIコンポーネントは主要パスをテスト

### 5. Spec-Driven Development
- 機能追加は必ず仕様作成から開始
- Requirements → Design → Tasks → Implementation のフロー
- 各フェーズで承認プロセス実施

## ビルド成果物

### フロントエンド (`frontend/dist/`)
- **index.html**: エントリーHTML
- **assets/**: JS/CSSバンドル（ハッシュ付きファイル名）
- **vite.svg**: 静的アセット

### バックエンド (`api/dist/`)
- **コンパイル済みJS**: TypeScriptから変換
- **node_modules/**: 本番依存関係
- **host.json**: Functions設定

## 除外パターン

### `.gitignore` 主要パターン
```
node_modules/
dist/
.env
local.settings.json
*.log
.DS_Store
test-results/
playwright-report/
playwright/.cache/
```

### ビルド・依存関係除外
- `node_modules/`: npm依存関係
- `dist/`: ビルド成果物
- `.serena/`: AIエージェント作業ディレクトリ
- `test-results/`: Playwright テスト結果
- `playwright-report/`: Playwright HTML レポート
- `playwright/.cache/`: Playwright キャッシュ

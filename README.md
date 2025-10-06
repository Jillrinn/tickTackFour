# マルチプレイヤー・ゲームタイマー

4〜6人のプレイヤーの経過時間を個別に計測する、ボードゲーム用のマルチプレイヤー対応タイマーアプリケーション。

## プロジェクト構造

```
tickTackFour/
├── frontend/          # React 18 + TypeScript + Vite
│   ├── src/
│   ├── public/
│   └── package.json
├── api/               # Azure Functions (Node.js 20 + TypeScript)
│   ├── src/
│   │   └── models/    # データモデルと型定義
│   ├── host.json
│   ├── local.settings.json
│   └── package.json
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml
├── .kiro/             # Kiro spec-driven development
│   └── specs/
│       └── multiplayer-game-timer/
│           ├── spec.json
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
└── staticwebapp.config.json
```

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite
- SignalR Client SDK (`@microsoft/signalr`)

### バックエンド
- Azure Functions (Node.js 20)
- TypeScript
- Azure Cosmos DB (Table API) - `@azure/data-tables`
- Azure SignalR Service

### ホスティング
- Azure Static Web Apps (フロントエンド)
- Azure Functions Consumption Plan (API)
- Azure SignalR Service Free Tier
- Azure Cosmos DB Free Tier

## ローカル開発

### 前提条件
- Node.js 20以上
- npm
- Azure Functions Core Tools v4

### フロントエンド開発サーバー起動

```bash
cd frontend
npm install
npm run dev
```

### バックエンド開発サーバー起動

```bash
cd api
npm install
npm run build
npm start
```

### 環境変数設定

`api/local.settings.json` に以下の環境変数を設定:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureSignalRConnectionString": "<your-signalr-connection-string>",
    "CosmosDBConnectionString": "<your-cosmosdb-connection-string>"
  }
}
```

## E2Eテスト

### テスト実行

```bash
# 全テスト実行
npm run test:e2e

# UI表示モード（デバッグ用）
npm run test:e2e:ui

# ヘッドありモード（ブラウザ表示）
npm run test:e2e:headed

# デバッグモード
npm run test:e2e:debug
```

### テストカバレッジ

Phase 1（フロントエンドのみ）: **37テスト**

- **スモークテスト** (3テスト): アプリケーション起動とブラウザ動作確認
- **プレイヤー管理** (8テスト): プレイヤー数変更、名前入力、カード表示
- **タイマー動作** (6テスト): カウントアップ/ダウン、タイムアウト、フォーマット
- **アクティブプレイヤー操作** (7テスト): アクティブ設定、切り替え、+10秒機能
- **ゲーム制御** (6テスト): 一時停止/再開、リセット
- **レスポンシブUI** (7テスト): 375px/768px/1024px/1440px レイアウト検証

Phase 2（バックエンド統合）: **準備完了（実装待ち）**

- **DB永続化** (7テスト雛形): リロード後の状態復元、DB保存確認
- **SignalRリアルタイム同期** (9テスト雛形): 複数クライアント間の状態同期

### CI/CD統合

プルリクエスト作成時に自動でE2Eテストを実行:

- Chromiumブラウザでの自動テスト
- 失敗時のスクリーンショット・トレース自動保存
- テスト失敗時のデプロイ停止

## デプロイ

GitHub Actionsを使用したCI/CDパイプラインが自動で設定されています。

1. Azure Static Web Appsリソースを作成
2. GitHub Secretsに `AZURE_STATIC_WEB_APPS_API_TOKEN` を追加
3. `main` ブランチへのpushで自動デプロイ

## 仕様書

詳細な仕様は `.kiro/specs/multiplayer-game-timer/` 以下を参照:

- `requirements.md` - 要件定義
- `design.md` - 技術設計
- `tasks.md` - 実装タスク

## ライセンス

ISC

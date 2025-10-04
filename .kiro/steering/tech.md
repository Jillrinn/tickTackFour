# 技術スタック

> **Inclusion Mode**: Always
> このドキュメントは全てのAI対話で自動的に読み込まれます

## アーキテクチャ概要

### システム構成

```
Client (React SPA)
    ↕ (SignalR WebSocket/HTTP)
Azure SignalR Service
    ↕
Azure Functions (API Layer)
    ↕
Azure Cosmos DB (Table API)
    ↕
Azure Static Web Apps (Hosting)
```

### アーキテクチャパターン
- **イベント駆動アーキテクチャ + CQRSライト**
  - コマンド（タイマー操作）: REST API経由でFunctionsに送信
  - クエリ（状態取得）: SignalR経由でリアルタイム配信
  - 状態変更時にSignalRを通じて全クライアントへブロードキャスト

## フロントエンド

### コア技術スタック
- **React 19.1.1**: UIコンポーネントフレームワーク
- **TypeScript 5.9**: 型安全な開発環境
- **Vite 7.1**: 高速ビルドツール・開発サーバー
- **@microsoft/signalr 9.0**: リアルタイム通信クライアント

### 開発ツール
- **ESLint 9.36**: コード品質・スタイル管理
  - `@eslint/js`: JavaScript用設定
  - `eslint-plugin-react-hooks`: React Hooks ルール
  - `eslint-plugin-react-refresh`: React Fast Refresh対応
  - `typescript-eslint`: TypeScript用設定
- **Vitest 3.2**: ユニットテストフレームワーク
  - jsdom: DOM環境シミュレーション
  - カバレッジレポート対応

### ビルド・開発
- **ビルドツール**: Vite + TypeScript Compiler
- **開発サーバー**: Vite Dev Server (HMR対応)
- **プラグイン**: `@vitejs/plugin-react` - React Fast Refresh

## バックエンド

### コア技術スタック
- **Azure Functions 4.8**: サーバーレスAPI基盤
- **Node.js 20**: ランタイム環境
- **TypeScript 5.9**: 型安全な開発環境

### 主要依存関係
- **@azure/data-tables 13.3**: Cosmos DB Table API クライアント
- **@azure/functions 4.8**: Azure Functions SDK

### テストツール
- **Jest 30.2**: テストフレームワーク
- **ts-jest 29.4**: TypeScript対応
- **tsx 4.20**: TypeScript実行環境

## Azure無料層サービス

### 1. Azure Static Web Apps (Free Tier)
- **用途**: フロントエンド静的コンテンツホスティング
- **制限**: 250MB ストレージ、100GB/月 帯域幅
- **デプロイ**: GitHub Actions CI/CD

### 2. Azure SignalR Service (Free Tier)
- **用途**: リアルタイム双方向通信
- **制限**: 同時接続20、メッセージ2万/日
- **プロトコル**: WebSocket (フォールバック: Server-Sent Events, Long Polling)

### 3. Azure Cosmos DB (Free Tier)
- **API**: Table API
- **用途**: ゲーム状態の永続化
- **無料枠**: 1000 RU/s + 25GB (完全無料)
- **使用量**: 約2.5 RU/s (余裕あり)

### 4. Azure Functions (Consumption Plan)
- **用途**: サーバーレスAPI
- **無料枠**: 月100万リクエスト
- **ランタイム**: Node.js 20

## 開発環境

### 前提条件
- Node.js 20以上
- npm (Node.js付属)
- Azure Functions Core Tools v4
- Git

### 環境変数

#### フロントエンド
開発時は環境変数不要（Viteのデフォルト設定を使用）

#### バックエンド (`api/local.settings.json`)
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureSignalRConnectionString": "<SignalR接続文字列>",
    "CosmosDBConnectionString": "<Cosmos DB接続文字列>"
  }
}
```

## 開発コマンド

### フロントエンド (`frontend/`)
```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (http://localhost:5173)
npm run dev

# プロダクションビルド
npm run build

# ビルドプレビュー
npm run preview

# リンター実行
npm run lint

# テスト実行
npm run test          # 通常実行
npm run test:ui       # UIモード
npm run test:coverage # カバレッジ付き
```

### バックエンド (`api/`)
```bash
# 依存関係インストール
npm install

# TypeScriptビルド
npm run build

# ビルド監視（自動再ビルド）
npm run watch

# Azure Functions ローカル起動 (http://localhost:7071)
npm start

# ビルド成果物削除
npm run clean

# テスト実行
npm run test          # 通常実行
npm run test:watch    # 監視モード
npm run test:coverage # カバレッジ付き
```

### プロジェクトルート
```bash
# 全依存関係インストール
npm install --workspaces

# Gitコミット（日本語メッセージ推奨）
git add .
git commit -m "機能: タイマー機能の実装"
```

## ポート構成

- **フロントエンド開発サーバー**: `http://localhost:5173` (Vite)
- **バックエンドAPI**: `http://localhost:7071` (Azure Functions)
- **プレビューサーバー**: `http://localhost:4173` (Vite Preview)

## 技術的制約

### Azure無料層の制限
- **SignalR**: 同時接続20、メッセージ2万/日（1秒更新で約5.5時間分）
- **Functions**: 月100万リクエスト、実行時間制限あり
- **Cosmos DB**: 1000 RU/s（本用途では十分）

### 設計上の制約
- 認証レイヤーなし（無料層でのシンプル運用）
- 履歴保存なし（ステートレス設計）
- リアルタイム更新は1秒間隔（メッセージ数節約）

## デプロイ戦略

### CI/CDパイプライン
- **ツール**: GitHub Actions
- **設定ファイル**: `.github/workflows/azure-static-web-apps.yml`
- **トリガー**: `main`ブランチへのpush
- **自動化**:
  1. フロントエンドビルド
  2. バックエンドビルド
  3. Azure Static Web Appsへデプロイ
  4. Azure Functionsへデプロイ

### 必要なシークレット
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: GitHub Secretsに設定

## コード品質基準

### TypeScript設定
- **Strict Mode**: 有効
- **Target**: ES2020
- **Module**: ESNext (フロントエンド), CommonJS (バックエンド)

### テストカバレッジ目標
- ユニットテスト: 80%以上
- 主要ロジック: 100%カバレッジ

### コーディング規約
- ESLintルールに準拠
- コミットメッセージは日本語で記述
- 思考は英語、生成コードとコメントは日本語

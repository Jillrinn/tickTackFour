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

以下のソフトウェアが必要です：

#### Node.js 20以上
- [Node.js公式サイト](https://nodejs.org/)からダウンロードしてインストール
- npm はNode.jsに含まれています

バージョン確認：
```bash
node --version  # v20.0.0以上
npm --version   # 10.0.0以上
```

#### Azure Functions Core Tools v4
ローカル環境でAzure Functionsを実行するために必要です。

**インストール方法（プラットフォーム別）:**

**macOS (Homebrew):**
```bash
brew tap azure/functions
brew install azure-functions-core-tools@4
```

**Windows (Chocolatey):**
```bash
choco install azure-functions-core-tools-4
```

**Windows/macOS/Linux (npm):**
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

**インストール確認：**
```bash
func --version
# 4.x.x が表示されることを確認
```

### ローカル環境セットアップ手順

#### 1. 依存関係のインストール

プロジェクトルートで全ワークスペースの依存関係をインストール：

```bash
npm install --workspaces
```

または、個別にインストール：

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd ../api
npm install
```

#### 2. 環境変数の設定

`api/local.settings.json` を作成し、以下の内容を設定：

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "CosmosDBConnectionString": "<your-cosmosdb-connection-string>"
  }
}
```

**注意**: `local.settings.json` は `.gitignore` に含まれているため、コミットされません。

#### 3. Azure Functions APIの起動

```bash
cd api
npm start
```

APIが起動すると以下のエンドポイントが利用可能になります：
- Health Check: `http://localhost:7071/api/health`
- Game State: `http://localhost:7071/api/game`

#### 4. フロントエンド開発サーバーの起動

別のターミナルで：

```bash
cd frontend
npm run dev
```

#### 5. 動作確認

ブラウザで以下にアクセス：
- フロントエンド: **http://localhost:5173**
- APIヘルスチェック: http://localhost:7071/api/health

**期待される動作:**
- タイマーアプリケーションが表示される
- プレイヤーカードが表示される
- タイマー操作（開始、停止、ターン切り替え）が動作する
- コンソールエラーが発生しない（フォールバックモード警告は正常）

#### プロジェクトルートからの同時起動

プロジェクトルートで両方を同時起動することもできます：

```bash
npm run dev
```

このコマンドは `concurrently` を使用して、フロントエンドとバックエンドを並行起動します。

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

## デプロイ環境

### Azure Static Web Apps設定

#### staticwebapp.config.json

プロジェクトルートの `staticwebapp.config.json` でAzure Static Web Appsの動作を設定しています。

**重要な設定項目:**

1. **MIMEタイプ設定** (必須)
   ```json
   "mimeTypes": {
     ".json": "application/json",
     ".js": "application/javascript",
     ".mjs": "application/javascript"
   }
   ```

   JavaScriptモジュールが正しく読み込まれるために必須です。これがないと、ブラウザがホワイトアウト（空白ページ）になります。

2. **API ルーティング**
   ```json
   "routes": [
     {
       "route": "/api/*",
       "allowedRoles": ["anonymous"]
     }
   ]
   ```

3. **ナビゲーションフォールバック**
   ```json
   "navigationFallback": {
     "rewrite": "/index.html",
     "exclude": ["/api/*", "/*.{css,scss,js,png,gif,ico,jpg,svg}"]
   }
   ```

#### 環境変数の設定

デプロイ環境では、Azure CLIで環境変数を設定します：

```bash
az staticwebapp appsettings set \
  --name <your-app-name> \
  --resource-group <your-resource-group> \
  --setting-names CosmosDBConnectionString="<connection-string>"
```

### GitHub Actionsによる自動デプロイ

#### セットアップ手順

1. **Azure Static Web Appsリソースを作成**
   - Azure Portalで新しいStatic Web Appsを作成
   - デプロイトークンを取得

2. **GitHub Secretsに認証情報を追加**
   - GitHubリポジトリの Settings → Secrets → Actions
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` を追加

3. **自動デプロイの仕組み**
   - `main` ブランチへのpush時に自動トリガー
   - GitHub Actionsワークフロー: `.github/workflows/azure-static-web-apps-orange-stone-066c2d600.yml`

#### デプロイフロー

```
git push origin main
    ↓
GitHub Actions triggered
    ↓
1. フロントエンドビルド (Vite)
   - TypeScriptコンパイル
   - アセットバンドル生成
    ↓
2. バックエンドビルド (Azure Functions)
   - TypeScriptコンパイル
   - 依存関係インストール
    ↓
3. Azure Static Web Appsへデプロイ
   - 静的ファイル配信
   - Azure Functionsデプロイ
    ↓
4. デプロイ完了
   - URL: https://orange-stone-066c2d600.3.azurestaticapps.net/
```

#### デプロイ後の確認

デプロイが成功したら、以下を確認：

1. **アプリケーション動作確認**
   - デプロイURLにアクセス
   - ホワイトアウトが発生しないこと
   - コンソールエラーがないこと

2. **APIエンドポイント確認**
   - `/api/health` → `{"status":"ok", "cosmosDbConfigured":true}`
   - `/api/game` → ゲーム状態JSONが返ること

3. **GitHub Actionsログ確認**
   - リポジトリの Actions タブでワークフロー実行ログを確認
   - ビルドエラーがないこと

## 仕様書

詳細な仕様は `.kiro/specs/multiplayer-game-timer/` 以下を参照:

- `requirements.md` - 要件定義
- `design.md` - 技術設計
- `tasks.md` - 実装タスク

## ライセンス

ISC

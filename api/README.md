# TickTackFour API - Azure Functions Backend

Azure Functions + Cosmos DB Table APIによるバックエンドAPI。

## セットアップ

### 1. 依存関係のインストール

```bash
cd api
npm install
```

### 2. Cosmos DB接続文字列の設定

`local.settings.json`ファイルに Cosmos DB接続文字列を設定します：

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "CosmosDBConnectionString": "<Azure PortalからコピーしたCosmos DB接続文字列>"
  }
}
```

**接続文字列の取得方法:**
1. Azure Portalを開く
2. Cosmos DBアカウントに移動
3. 「設定」→「キー」を選択
4. 「プライマリ接続文字列」または「セカンダリ接続文字列」をコピー

**接続文字列の形式例:**
```
DefaultEndpointsProtocol=https;AccountName=your-account-name;AccountKey=your-account-key==;TableEndpoint=https://your-account-name.table.cosmos.azure.com:443/
```

### 3. TypeScriptビルド

```bash
npm run build
```

### 4. ローカル開発サーバー起動

```bash
npm start
```

## テスト

### ユニットテスト実行

```bash
npm test
```

### カバレッジ付きテスト

```bash
npm run test:coverage
```

### 監視モード

```bash
npm run test:watch
```

## プロジェクト構造

```
api/
├── src/
│   ├── services/        # ビジネスロジック
│   │   ├── cosmosClient.ts        # Cosmos DB接続クライアント
│   │   └── __tests__/             # サービステスト
│   ├── models/          # データモデルと型定義
│   └── functions/       # Azure Functions HTTPトリガー
├── host.json            # Azure Functions ホスト設定
├── local.settings.json  # ローカル環境変数（Gitignore対象）
├── tsconfig.json        # TypeScript設定
├── jest.config.js       # Jest設定
└── package.json         # 依存関係とスクリプト
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `CosmosDBConnectionString` | Cosmos DB Table API接続文字列 | はい |
| `AzureWebJobsStorage` | Azure Functions Storage（ローカル開発時は空文字列可） | いいえ |
| `FUNCTIONS_WORKER_RUNTIME` | Functions実行環境（node固定） | はい |

## トラブルシューティング

### Cosmos DB接続エラー

**エラーメッセージ:** `CosmosDBConnectionString environment variable is not set`

**解決方法:**
1. `local.settings.json`に接続文字列が設定されているか確認
2. 接続文字列が空文字列になっていないか確認
3. Azure Functions Core Toolsを再起動

### テスト実行エラー

**エラーメッセージ:** `Cannot find module '@azure/data-tables'`

**解決方法:**
```bash
npm install
```

## 開発ワークフロー

1. 機能追加時はTDD（Test-Driven Development）を実践
   - RED: テストを書く（失敗）
   - GREEN: 最小限の実装（成功）
   - REFACTOR: リファクタリング

2. コミット前にテストとビルドを実行
   ```bash
   npm test
   npm run build
   ```

3. コード品質基準
   - テストカバレッジ: 80%以上
   - TypeScript strict mode準拠
   - 全テスト成功必須

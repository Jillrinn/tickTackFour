# 環境変数とシークレット設定ガイド

本ドキュメントでは、マルチプレイヤー・ゲームタイマーアプリケーションに必要な環境変数とシークレットの設定方法を説明します。

## 環境変数の構成

本アプリケーションでは、**3つの環境**で環境変数を管理します。

| 環境 | 用途 | 設定場所 |
|------|------|---------|
| ローカル開発環境 | 開発・テスト用 | `api/local.settings.json` |
| GitHub Actions | CI/CDパイプライン用 | GitHub Secrets |
| Azure本番環境 | 本番デプロイ用 | Azure Static Web Appsアプリケーション設定 |

---

## 1. ローカル開発環境の設定

### 1.1 `api/local.settings.json`の作成

Azure Functionsをローカルで実行するための設定ファイルです。

**ファイル場所**: `api/local.settings.json`

**内容**:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureSignalRConnectionString": "[SignalR接続文字列]",
    "CosmosDBConnectionString": "[Cosmos DB接続文字列]"
  }
}
```

### 1.2 接続文字列の取得方法

#### Cosmos DB接続文字列

Azure CLIで取得:
```bash
az cosmosdb keys list \
  --name cosmos-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

または、**Azure Portal**で取得:
1. Azure Portal → Cosmos DBアカウント
2. 「設定」→「キー」
3. 「プライマリ接続文字列」をコピー

**形式**:
```
AccountEndpoint=https://cosmos-multiplayer-timer.documents.azure.com:443/;AccountKey=xxxxx==;
```

#### SignalR Service接続文字列

Azure CLIで取得:
```bash
az signalr key list \
  --name signalr-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --query "primaryConnectionString" \
  --output tsv
```

または、**Azure Portal**で取得:
1. Azure Portal → SignalR Serviceリソース
2. 「設定」→「キー」
3. 「プライマリ接続文字列」をコピー

**形式**:
```
Endpoint=https://signalr-multiplayer-timer.service.signalr.net;AccessKey=xxxxx;Version=1.0;
```

### 1.3 セキュリティ注意事項

**重要**: `api/local.settings.json`はGitにコミットしないでください。

確認:
```bash
# .gitignoreに含まれているか確認
cat api/.gitignore | grep local.settings.json
```

出力が`local.settings.json`を含んでいれば問題ありません。

---

## 2. GitHub Secretsの設定

GitHub Actionsで使用するシークレットを設定します。

### 2.1 GitHub Secretsへのアクセス

1. GitHubリポジトリにアクセス
   - `https://github.com/[your-username]/tickTackFour`

2. **Settings** タブをクリック

3. 左メニューから **Secrets and variables** → **Actions** を選択

4. **New repository secret** をクリック

### 2.2 必要なシークレット一覧

以下の3つのシークレットを設定します。

#### シークレット1: `AZURE_STATIC_WEB_APPS_API_TOKEN`

**用途**: Azure Static Web Appsへのデプロイ認証

**取得方法**:

Azure CLIで取得:
```bash
az staticwebapp secrets list \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --query "properties.apiKey" \
  --output tsv
```

または、**Azure Portal**で取得:
1. Azure Portal → Static Web Appsリソース
2. 「概要」→「デプロイトークンの管理」
3. トークンをコピー

**設定方法**:
1. GitHub Secrets画面で **New repository secret** をクリック
2. **Name**: `AZURE_STATIC_WEB_APPS_API_TOKEN`
3. **Secret**: 取得したAPIトークンを貼り付け
4. **Add secret** をクリック

---

#### シークレット2: `COSMOSDB_CONNECTION_STRING`

**用途**: Cosmos DBへの接続（CI/CDテスト用、オプション）

**取得方法**: 前述のCosmos DB接続文字列取得方法と同じ

**設定方法**:
1. GitHub Secrets画面で **New repository secret** をクリック
2. **Name**: `COSMOSDB_CONNECTION_STRING`
3. **Secret**: Cosmos DB接続文字列を貼り付け
4. **Add secret** をクリック

**注意**:
- 本番環境ではAzure Static Web Appsのアプリケーション設定から読み込むため、GitHub Secretsへの設定は**テスト用途のみ**です。
- セキュリティ上、GitHub Secretsには設定せず、Azure側のみで管理することも可能です。

---

#### シークレット3: `SIGNALR_CONNECTION_STRING`

**用途**: SignalR Serviceへの接続（CI/CDテスト用、オプション）

**取得方法**: 前述のSignalR Service接続文字列取得方法と同じ

**設定方法**:
1. GitHub Secrets画面で **New repository secret** をクリック
2. **Name**: `SIGNALR_CONNECTION_STRING`
3. **Secret**: SignalR接続文字列を貼り付け
4. **Add secret** をクリック

**注意**:
- 本番環境ではAzure Static Web Appsのアプリケーション設定から読み込むため、GitHub Secretsへの設定は**テスト用途のみ**です。

---

### 2.3 GitHub Secretsの確認

設定完了後、以下のシークレットが表示されていることを確認します。

| シークレット名 | 必須 | 用途 |
|--------------|------|------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | ✅ 必須 | Azure Static Web Appsデプロイ |
| `COSMOSDB_CONNECTION_STRING` | ⚠️ オプション | CI/CDテスト（本番はAzure設定） |
| `SIGNALR_CONNECTION_STRING` | ⚠️ オプション | CI/CDテスト（本番はAzure設定） |

---

## 3. Azure本番環境の設定

Azure Static Web Apps Managed Functionsに環境変数を設定します。

### 3.1 Azure CLIでの設定

#### 方法1: 個別に設定

```bash
# Cosmos DB接続文字列を設定
az staticwebapp appsettings set \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --setting-names CosmosDBConnectionString="[Cosmos DB接続文字列]"

# SignalR接続文字列を設定
az staticwebapp appsettings set \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --setting-names AzureSignalRConnectionString="[SignalR接続文字列]"

# Functions Worker Runtimeを設定
az staticwebapp appsettings set \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --setting-names FUNCTIONS_WORKER_RUNTIME="node"
```

#### 方法2: まとめて設定（推奨）

```bash
az staticwebapp appsettings set \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --setting-names \
    CosmosDBConnectionString="[Cosmos DB接続文字列]" \
    AzureSignalRConnectionString="[SignalR接続文字列]" \
    FUNCTIONS_WORKER_RUNTIME="node"
```

### 3.2 Azure Portalでの設定

1. **Azure Portal**にアクセス
   - https://portal.azure.com

2. **Static Web Appsリソースを開く**
   - リソースグループ: `rg-multiplayer-timer`
   - リソース: `swa-multiplayer-timer`

3. **左メニューから「構成」を選択**

4. **「アプリケーション設定」タブをクリック**

5. **「+ 追加」をクリックして以下を設定**

| 名前 | 値 |
|------|-----|
| `CosmosDBConnectionString` | [Cosmos DB接続文字列] |
| `AzureSignalRConnectionString` | [SignalR接続文字列] |
| `FUNCTIONS_WORKER_RUNTIME` | `node` |

6. **「保存」をクリック**

### 3.3 設定の確認

```bash
# 設定された環境変数を確認
az staticwebapp appsettings list \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer
```

**期待される出力**:
```json
{
  "properties": {
    "CosmosDBConnectionString": "AccountEndpoint=https://...",
    "AzureSignalRConnectionString": "Endpoint=https://...",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

---

## 4. 環境変数の優先順位

Azure Static Web Apps Managed Functionsでは、以下の優先順位で環境変数が読み込まれます。

1. **Azure Static Web Appsアプリケーション設定**（最優先）
2. `api/local.settings.json`（ローカル開発時のみ）
3. システム環境変数

本番環境では**Azureアプリケーション設定**が使用されるため、ローカル設定ファイルの影響を受けません。

---

## 5. セキュリティベストプラクティス

### 5.1 接続文字列の管理

✅ **推奨事項**:
- GitHub Secretsは暗号化されて保存される
- Azureアプリケーション設定も暗号化されて保存される
- `api/local.settings.json`は必ず`.gitignore`に含める

❌ **禁止事項**:
- ハードコードしない（コード内に直接書かない）
- 公開リポジトリにコミットしない
- ログに出力しない

### 5.2 定期的なローテーション

接続文字列は定期的に再生成することを推奨します。

**頻度**: 3ヶ月ごと

**手順**:
1. Azure Portalで新しいキーを生成
2. GitHub SecretsとAzureアプリケーション設定を更新
3. 古いキーを無効化

### 5.3 アクセス制御

- **GitHub Secrets**: リポジトリ管理者のみアクセス可能
- **Azure設定**: Azure RBACでアクセス制御（最小権限の原則）

---

## 6. トラブルシューティング

### 問題1: ローカル環境でAPI呼び出しが失敗する

**症状**: `401 Unauthorized`または接続エラー

**原因**: `api/local.settings.json`の接続文字列が不正

**対処**:
1. Azureから最新の接続文字列を取得
2. `api/local.settings.json`を更新
3. Azure Functions Core Toolsを再起動
   ```bash
   cd api
   npm start
   ```

---

### 問題2: GitHub Actionsデプロイが失敗する

**症状**: デプロイステップでエラー

**原因**: `AZURE_STATIC_WEB_APPS_API_TOKEN`が不正または期限切れ

**対処**:
1. Azure Portalで新しいデプロイトークンを生成
2. GitHub Secretsを更新
3. ワークフローを再実行

---

### 問題3: 本番環境でCosmos DBへの接続が失敗する

**症状**: API呼び出しで500エラー

**原因**: Azureアプリケーション設定の接続文字列が不正

**対処**:
1. Azure CLIで設定を確認
   ```bash
   az staticwebapp appsettings list \
     --name swa-multiplayer-timer \
     --resource-group rg-multiplayer-timer
   ```
2. 接続文字列を再設定
3. Static Web Appsを再起動（不要な場合が多いが、念のため）
   ```bash
   az staticwebapp restart \
     --name swa-multiplayer-timer \
     --resource-group rg-multiplayer-timer
   ```

---

## 7. 環境変数チェックリスト

デプロイ前に以下を確認してください。

### ローカル開発環境
- [ ] `api/local.settings.json`にCosmos DB接続文字列を設定
- [ ] `api/local.settings.json`にSignalR接続文字列を設定
- [ ] `api/local.settings.json`が`.gitignore`に含まれている
- [ ] ローカルでAzure Functionsが正常に起動する

### GitHub Actions
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN`シークレットを設定
- [ ] （オプション）`COSMOSDB_CONNECTION_STRING`シークレットを設定
- [ ] （オプション）`SIGNALR_CONNECTION_STRING`シークレットを設定
- [ ] GitHub Actionsワークフローが正常に実行される

### Azure本番環境
- [ ] Azureアプリケーション設定に`CosmosDBConnectionString`を設定
- [ ] Azureアプリケーション設定に`AzureSignalRConnectionString`を設定
- [ ] Azureアプリケーション設定に`FUNCTIONS_WORKER_RUNTIME=node`を設定
- [ ] 設定がAzure Portalで確認できる

---

## 8. 参考情報

### 環境変数の命名規則

本プロジェクトでは以下の命名規則を採用しています。

- **Azure接続文字列**: `[ServiceName]ConnectionString`形式
  - 例: `CosmosDBConnectionString`, `AzureSignalRConnectionString`
- **Azure Functions設定**: Azureデフォルト形式
  - 例: `FUNCTIONS_WORKER_RUNTIME`, `AzureWebJobsStorage`

### 関連ドキュメント

- [Azure Static Web Apps環境変数](https://learn.microsoft.com/ja-jp/azure/static-web-apps/application-settings)
- [Azure Functions環境変数](https://learn.microsoft.com/ja-jp/azure/azure-functions/functions-how-to-use-azure-function-app-settings)
- [GitHub Secretsドキュメント](https://docs.github.com/ja/actions/security-guides/encrypted-secrets)

---

## まとめ

本ドキュメントに従って環境変数を設定することで、以下が実現されます。

✅ ローカル開発環境でAzureサービスに接続可能
✅ GitHub ActionsでCI/CD自動デプロイが実行可能
✅ Azure本番環境でアプリケーションが正常動作
✅ セキュアな接続文字列管理が実現

次のステップ: [Azureデプロイメント手順書](./AZURE_DEPLOYMENT.md)に従ってデプロイを実行してください。

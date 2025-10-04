# Azure デプロイメント手順書

本ドキュメントでは、マルチプレイヤー・ゲームタイマーアプリケーションをAzure無料層サービスにデプロイする手順を説明します。

## 前提条件

- Azureアカウント（無料アカウント可）
- Azure CLI（最新版）
- GitHubアカウント
- Node.js 20以上

## アーキテクチャ概要

本アプリケーションは以下のAzure無料層サービスを使用します：

- **Azure Static Web Apps (Free Tier)**: フロントエンド静的コンテンツホスティング + Managed Functions
- **Azure SignalR Service (Free Tier)**: リアルタイム双方向通信
- **Azure Cosmos DB (Free Tier)**: ゲーム状態の永続化（Table API）

## デプロイ手順

### ステップ1: Azure Cosmos DB Free Tierアカウント作成

#### 1.1 Azure Portalでリソースグループ作成

```bash
# Azure CLIでログイン
az login

# リソースグループ作成（リージョン: Japan East推奨）
az group create \
  --name rg-multiplayer-timer \
  --location japaneast
```

#### 1.2 Cosmos DBアカウント作成（Table API）

```bash
# Cosmos DBアカウント作成（Free Tierを有効化）
az cosmosdb create \
  --name cosmos-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --locations regionName=japaneast \
  --capabilities EnableTable \
  --enable-free-tier true
```

**重要**:
- `--enable-free-tier true`により1000 RU/s + 25GBが完全無料
- Azureアカウントごとに1つまでFree Tierアカウント作成可能

#### 1.3 テーブル作成

```bash
# GameStatesテーブル作成
az cosmosdb table create \
  --account-name cosmos-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --name GameStates \
  --throughput 400
```

#### 1.4 接続文字列取得

```bash
# 接続文字列取得（後でGitHub Secretsに設定）
az cosmosdb keys list \
  --name cosmos-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv
```

**出力例**:
```
AccountEndpoint=https://cosmos-multiplayer-timer.documents.azure.com:443/;AccountKey=xxxxx==;
```

この接続文字列を**安全に保管**してください。

---

### ステップ2: Azure SignalR Service Free Tierインスタンス作成

#### 2.1 SignalR Serviceインスタンス作成

```bash
# SignalR Service作成（Free Tier）
az signalr create \
  --name signalr-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --location japaneast \
  --sku Free_F1 \
  --unit-count 1 \
  --service-mode Serverless
```

**重要**:
- `--sku Free_F1`: 無料層（同時接続20、メッセージ2万/日）
- `--service-mode Serverless`: Azure Functions統合用

#### 2.2 接続文字列取得

```bash
# 接続文字列取得（後でGitHub Secretsに設定）
az signalr key list \
  --name signalr-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --query "primaryConnectionString" \
  --output tsv
```

**出力例**:
```
Endpoint=https://signalr-multiplayer-timer.service.signalr.net;AccessKey=xxxxx;Version=1.0;
```

この接続文字列を**安全に保管**してください。

---

### ステップ3: Azure Static Web Appsリソース作成

#### 3.1 GitHubリポジトリとの連携

1. **Azure Portalにアクセス**
   - https://portal.azure.com

2. **Static Web Appsリソース作成**
   - 「リソースの作成」→「Static Web Apps」を検索
   - 「作成」をクリック

3. **基本設定**
   - **サブスクリプション**: 使用するサブスクリプション選択
   - **リソースグループ**: `rg-multiplayer-timer`
   - **名前**: `swa-multiplayer-timer`
   - **プランの種類**: `Free`
   - **リージョン**: `East Asia`（日本に最も近いリージョン）

4. **デプロイの詳細**
   - **ソース**: `GitHub`
   - **GitHubアカウント**: 認証してリポジトリ選択
   - **組織**: あなたのGitHubアカウント
   - **リポジトリ**: `tickTackFour`
   - **ブランチ**: `main`

5. **ビルドの詳細**
   - **ビルドのプリセット**: `React`
   - **アプリの場所**: `/frontend`
   - **APIの場所**: `/api`
   - **出力先**: `dist`

6. **確認と作成**
   - 設定を確認して「作成」をクリック

#### 3.2 自動生成されるGitHub Actions確認

Static Web Apps作成時、自動的にGitHub Actionsワークフローが生成されます。

- 場所: `.github/workflows/azure-static-web-apps-*.yml`
- 内容: フロントエンドビルド + Managed Functionsデプロイ

**既存のワークフロー**（`.github/workflows/azure-static-web-apps.yml`）と統合する場合は、自動生成されたファイルを削除し、既存ファイルを使用します。

#### 3.3 Azure Static Web Apps APIトークン取得

```bash
# APIトークン取得（GitHub Secretsに設定）
az staticwebapp secrets list \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --query "properties.apiKey" \
  --output tsv
```

**出力例**:
```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

このAPIトークンを**安全に保管**してください。

---

### ステップ4: 環境変数とシークレット設定

#### 4.1 GitHub Secretsに接続文字列を設定

1. **GitHubリポジトリにアクセス**
   - `https://github.com/[your-username]/tickTackFour`

2. **Settingsタブ → Secrets and variables → Actions**

3. **以下のシークレットを追加**

| シークレット名 | 値 | 説明 |
|--------------|-----|------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | ステップ3.3で取得したAPIトークン | Static Web Appsデプロイ用 |
| `COSMOSDB_CONNECTION_STRING` | ステップ1.4で取得した接続文字列 | Cosmos DB接続用 |
| `SIGNALR_CONNECTION_STRING` | ステップ2.2で取得した接続文字列 | SignalR Service接続用 |

#### 4.2 Azure Static Web Appsのアプリケーション設定

Azure Managed Functionsに環境変数を設定します。

```bash
# Cosmos DB接続文字列を設定
az staticwebapp appsettings set \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --setting-names CosmosDBConnectionString="[ステップ1.4の接続文字列]"

# SignalR接続文字列を設定
az staticwebapp appsettings set \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --setting-names AzureSignalRConnectionString="[ステップ2.2の接続文字列]"

# Functions Worker Runtimeを設定
az staticwebapp appsettings set \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --setting-names FUNCTIONS_WORKER_RUNTIME="node"
```

**Azure Portalでの設定方法**:
1. Static Web Appsリソースを開く
2. 「構成」→「アプリケーション設定」
3. 「+ 追加」で以下を設定:
   - `CosmosDBConnectionString`: [Cosmos DB接続文字列]
   - `AzureSignalRConnectionString`: [SignalR接続文字列]
   - `FUNCTIONS_WORKER_RUNTIME`: `node`

---

### ステップ5: CI/CDパイプラインの構築

#### 5.1 自動生成されたGitHub Actionsワークフローの確認

Azure Static Web Apps作成時に自動生成されたワークフローファイルを確認します。

**ファイル場所**: `.github/workflows/azure-static-web-apps-zealous-bush-0f0767e00.yml`

**重要**: 自動生成されたワークフローの`output_location`が`build`になっている場合、`dist`に修正してください（Viteのビルド出力先）。

```yaml
# 修正前（自動生成）
output_location: "build"  # ❌

# 修正後
output_location: "dist"   # ✅
```

**完全な設定例**:
```yaml
app_location: "/frontend"
api_location: "/api"
output_location: "dist"
```

#### 5.2 デプロイトリガー

- **自動デプロイ**: `main`ブランチへのpushで自動実行
- **プレビュー環境**: PRオープン時に自動プレビュー環境作成

#### 5.3 デプロイ実行

```bash
# 変更をコミットしてpush
git add .
git commit -m "設定: Azure Static Web Appsデプロイ設定完了"
git push origin main
```

GitHub Actionsが自動実行されます。

---

### ステップ6: デプロイ確認

#### 6.1 GitHub Actionsの実行確認

1. GitHubリポジトリの「Actions」タブを開く
2. 最新のワークフロー実行を確認
3. すべてのステップが成功していることを確認

#### 6.2 アプリケーションURLの取得

```bash
# デプロイされたURLを取得
az staticwebapp show \
  --name swa-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --query "defaultHostname" \
  --output tsv
```

**出力例**:
```
swa-multiplayer-timer.azurestaticapps.net
```

#### 6.3 動作確認

1. **ブラウザでアクセス**
   - `https://swa-multiplayer-timer.azurestaticapps.net`

2. **基本機能テスト**
   - プレイヤー表示（4人デフォルト）が正常に表示されるか
   - ターン開始ボタンをクリックしてタイマーが動作するか
   - 別のデバイス/ブラウザタブでアクセスして同期を確認

3. **API動作確認**
   - ブラウザの開発者ツール → Networkタブ
   - `/api/game`エンドポイントが正常にレスポンスを返すか
   - SignalR接続が確立されているか（WebSocketまたはLong Polling）

---

## トラブルシューティング

### 問題1: デプロイが失敗する

**症状**: GitHub Actionsが失敗する

**原因と対処**:
- `AZURE_STATIC_WEB_APPS_API_TOKEN`が正しく設定されているか確認
- ワークフローファイルの`app_location`、`api_location`、`output_location`が正しいか確認

### 問題2: APIエンドポイントが404エラー

**症状**: `/api/*`にアクセスすると404エラー

**原因と対処**:
- `api/`フォルダ配下に`host.json`と`package.json`が存在するか確認
- Azure Static Web Appsのアプリケーション設定で環境変数が正しく設定されているか確認
- Managed Functionsのビルドが成功しているかGitHub Actionsログを確認

### 問題3: SignalR接続が確立されない

**症状**: リアルタイム同期が動作しない

**原因と対処**:
- `AzureSignalRConnectionString`が正しく設定されているか確認
- SignalR Serviceのサービスモードが`Serverless`になっているか確認
- ブラウザの開発者ツールでSignalR接続エラーを確認

### 問題4: Cosmos DBへの書き込みが失敗

**症状**: ゲーム状態が保存されない

**原因と対処**:
- `CosmosDBConnectionString`が正しく設定されているか確認
- Cosmos DBの`GameStates`テーブルが作成されているか確認
- Azure Portalで接続文字列を再取得して設定し直す

---

## コスト管理

### 無料枠の確認

| サービス | 無料枠 | 超過時の課金 |
|---------|--------|------------|
| Azure Static Web Apps | 250MB、月100GB帯域 | 従量課金 |
| Azure SignalR Service | 同時接続20、メッセージ2万/日 | 従量課金 |
| Azure Cosmos DB | 1000 RU/s + 25GB | 従量課金 |

**本アプリケーションの使用量見積もり**:
- Static Web Apps: 約10MB（問題なし）
- SignalR: 1秒更新で約5.5時間/日（問題なし）
- Cosmos DB: 約2.5 RU/s（問題なし）

### コスト監視

1. **Azure Cost Managementを有効化**
   - Azure Portal → Cost Management + Billing
   - 予算アラートを設定（例: 月$1以上で通知）

2. **使用状況の定期確認**
   - SignalR Service: Azure Portal → リソース → メトリック
   - Cosmos DB: Azure Portal → リソース → メトリック

---

## セキュリティ考慮事項

### 接続文字列の管理

- **GitHub Secrets**: 絶対にハードコードしない
- **ローカル環境**: `api/local.settings.json`は`.gitignore`に含める
- **定期的なローテーション**: 3ヶ月ごとに接続文字列を再生成

### ネットワークセキュリティ

- **HTTPS強制**: Azure Static Web Apps標準で有効
- **CORS設定**: 必要に応じて`staticwebapp.config.json`で設定
- **Rate Limiting**: Azure Functions標準機能（100リクエスト/分/IP）

---

## 次のステップ

- [ ] カスタムドメインの設定（オプション）
- [ ] Application Insightsの統合（監視・ログ）
- [ ] E2Eテストの自動化（Playwright）
- [ ] パフォーマンステストの実施（k6）

---

## 参考リンク

- [Azure Static Web Apps公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/static-web-apps/)
- [Azure SignalR Service公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/azure-signalr/)
- [Azure Cosmos DB Table API公式ドキュメント](https://learn.microsoft.com/ja-jp/azure/cosmos-db/table/)
- [GitHub Actions公式ドキュメント](https://docs.github.com/ja/actions)

# デプロイメント検証ガイド

本ドキュメントでは、Azure Static Web Appsへのデプロイメントが正常に完了したことを検証する手順を説明します。

## 前提条件

- [Azureデプロイメント手順書](./AZURE_DEPLOYMENT.md)に従ってAzureリソースを作成済み
- [環境変数設定ガイド](./ENVIRONMENT_SETUP.md)に従ってシークレットを設定済み
- GitHub Actionsワークフローが実行済み

---

## 1. GitHub Actionsの実行確認

### 1.1 ワークフロー実行ログの確認

1. **GitHubリポジトリの「Actions」タブにアクセス**
   - `https://github.com/[your-username]/tickTackFour/actions`

2. **最新のワークフロー実行を確認**
   - ワークフロー名: `Azure Static Web Apps CI/CD`
   - ステータス: ✅ 成功（緑色のチェックマーク）

3. **詳細ログを確認**
   - ワークフロー実行をクリック
   - `Build and Deploy Job`を展開
   - すべてのステップが成功していることを確認

### 1.2 期待されるステップと出力

#### ステップ1: Checkout

```
Run actions/checkout@v3
✓ Fetching the repository
✓ Determining the checkout info
```

#### ステップ2: Build And Deploy

```
Run Azure/static-web-apps-deploy@v1
✓ Detecting oryx build
✓ Building frontend
✓ Building API
✓ Uploading build output
✓ Deployment complete
```

**重要な出力**:
- `App location: /frontend` ✅
- `API location: /api` ✅
- `Output location: dist` ✅
- `Build succeeded` ✅
- `Deployment succeeded` ✅

### 1.3 エラーが発生した場合

#### エラー1: `azure_static_web_apps_api_token is invalid`

**原因**: GitHub Secretsの`AZURE_STATIC_WEB_APPS_API_TOKEN`が不正

**対処**:
1. Azureから新しいAPIトークンを取得
   ```bash
   az staticwebapp secrets list \
     --name swa-multiplayer-timer \
     --resource-group rg-multiplayer-timer \
     --query "properties.apiKey" \
     --output tsv
   ```
2. GitHub Secretsを更新
3. ワークフローを再実行

#### エラー2: `Frontend build failed`

**原因**: フロントエンドのビルドエラー

**対処**:
1. ローカルでビルドを実行して確認
   ```bash
   cd frontend
   npm run build
   ```
2. エラーを修正
3. コミットしてプッシュ

#### エラー3: `API build failed`

**原因**: Azure Functions APIのビルドエラー

**対処**:
1. ローカルでビルドを実行して確認
   ```bash
   cd api
   npm run build
   ```
2. エラーを修正
3. コミットしてプッシュ

---

## 2. デプロイされたアプリケーションの動作確認

### 2.1 アプリケーションURLの取得

#### 方法1: Azure CLI

```bash
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

#### 方法2: Azure Portal

1. Azure Portal → Static Web Appsリソース
2. 「概要」→「URL」をコピー

### 2.2 フロントエンドの表示確認

1. **ブラウザでアクセス**
   - `https://swa-multiplayer-timer.azurestaticapps.net`

2. **期待される表示**
   - ✅ ページが正常に読み込まれる
   - ✅ 4人のプレイヤーがデフォルトで表示される
   - ✅ タイマー値が`00:00`形式で表示される
   - ✅ 「ターン開始」ボタンが表示される
   - ✅ 「リセット」「モード切替」ボタンが表示される

3. **ブラウザ開発者ツールで確認**
   - F12キーで開発者ツールを開く
   - **Console**タブ: エラーがないことを確認
   - **Network**タブ: すべてのリソースが200 OKでロードされることを確認

### 2.3 API動作確認

#### テスト1: ゲーム状態取得API

1. **ブラウザ開発者ツール → Networkタブ**
2. **ページをリロード**
3. **`/api/game`リクエストを確認**

**期待されるレスポンス**:
- ステータス: `200 OK`
- レスポンスボディ（例）:
  ```json
  {
    "players": [
      { "id": "player-1", "name": "プレイヤー1", "elapsedTimeSeconds": 0, "initialTimeSeconds": 600, "isActive": false },
      { "id": "player-2", "name": "プレイヤー2", "elapsedTimeSeconds": 0, "initialTimeSeconds": 600, "isActive": false },
      { "id": "player-3", "name": "プレイヤー3", "elapsedTimeSeconds": 0, "initialTimeSeconds": 600, "isActive": false },
      { "id": "player-4", "name": "プレイヤー4", "elapsedTimeSeconds": 0, "initialTimeSeconds": 600, "isActive": false }
    ],
    "activePlayerId": null,
    "isPaused": false,
    "timerMode": "count-up"
  }
  ```

#### テスト2: ターン切り替えAPI

1. **「プレイヤー1」のターン開始ボタンをクリック**
2. **開発者ツール → Networkタブで`/api/switchTurn`を確認**

**期待されるレスポンス**:
- ステータス: `200 OK`
- レスポンスボディ:
  ```json
  {
    "success": true,
    "state": {
      "activePlayerId": "player-1",
      "players": [ ... ]
    }
  }
  ```

#### テスト3: SignalR接続確認

1. **開発者ツール → Networkタブ**
2. **「WS」（WebSocket）フィルターを有効化**
3. **SignalR接続を確認**

**期待される表示**:
- WebSocket接続: `wss://swa-multiplayer-timer.azurestaticapps.net/api`
- ステータス: `101 Switching Protocols`（接続成功）

---

## 3. リアルタイム同期の検証

### 3.1 複数デバイス同期テスト

1. **デバイス1（PCブラウザ）**
   - アプリケーションURLにアクセス
   - プレイヤー1のターン開始ボタンをクリック

2. **デバイス2（スマートフォンまたは別ブラウザタブ）**
   - 同じURLにアクセス
   - **期待される動作**: プレイヤー1のタイマーがリアルタイムで動いていることを確認

3. **デバイス1でターン切り替え**
   - プレイヤー2のターン開始ボタンをクリック

4. **デバイス2で確認**
   - **期待される動作**: プレイヤー1が停止し、プレイヤー2のタイマーが開始される

### 3.2 同期遅延の測定

1. **デバイス1でターン切り替え実行**
2. **デバイス2で反映されるまでの時間を測定**

**期待される遅延**:
- ✅ **1秒以内**（設計要件）

### 3.3 接続安定性テスト

1. **デバイス1でネットワークを一時的に切断**
   - ブラウザ開発者ツール → Networkタブ → Offline設定

2. **ネットワークを再接続**

3. **期待される動作**:
   - SignalRが自動再接続される
   - 最新のゲーム状態が同期される
   - タイマー値が正しく復元される

---

## 4. Azureリソースの動作確認

### 4.1 Cosmos DBデータ確認

#### Azure Portalでの確認

1. **Azure Portal → Cosmos DBアカウント**
2. **「データエクスプローラー」を開く**
3. **「Tables」→「GameStates」を展開**
4. **エンティティを確認**

**期待されるエンティティ**:
- **PartitionKey**: `game`
- **RowKey**: `current`
- **StateJson**: JSON文字列（ゲーム状態）
- **Timestamp**: 最終更新日時

#### Azure CLIでの確認

```bash
# GameStatesテーブルのエンティティを取得
az cosmosdb table query \
  --account-name cosmos-multiplayer-timer \
  --resource-group rg-multiplayer-timer \
  --name GameStates
```

### 4.2 SignalR Serviceメトリクス確認

1. **Azure Portal → SignalR Serviceリソース**
2. **「メトリック」を開く**
3. **確認項目**:
   - **接続数**: 現在の接続数を確認（上限20）
   - **メッセージ数**: 1日のメッセージ送信数を確認（上限2万）

**期待される値**:
- 接続数: 1〜20（アクセス中のクライアント数）
- メッセージ数: < 20,000/日

### 4.3 Static Web Appsメトリクス確認

1. **Azure Portal → Static Web Appsリソース**
2. **「メトリック」を開く**
3. **確認項目**:
   - **リクエスト数**: API呼び出し数
   - **データ転送**: 帯域幅使用量

**期待される値**:
- リクエスト数: アクセス状況に応じて変動
- データ転送: < 100GB/月（無料枠内）

---

## 5. パフォーマンス検証

### 5.1 ページ読み込み速度

#### Lighthouse CI（推奨）

1. **ブラウザ開発者ツール → Lighthouseタブ**
2. **「分析」を実行**
3. **確認項目**:
   - **Performance**: ≥ 90点
   - **First Contentful Paint**: < 2秒
   - **Time to Interactive**: < 3秒

#### 手動測定

1. **ブラウザをシークレットモードで開く**
2. **開発者ツール → Networkタブ**
3. **「DOMContentLoaded」時間を確認**

**期待される値**:
- ✅ < 2秒（設計目標）

### 5.2 API応答時間

1. **開発者ツール → Networkタブ**
2. **`/api/game`リクエストの「Time」を確認**

**期待される値**:
- ✅ P95 < 500ms（設計目標）

---

## 6. エラーハンドリングの検証

### 6.1 無効な入力のテスト

#### テスト1: プレイヤー数バリデーション

1. **ブラウザ開発者ツール → Console**
2. **以下のコマンドを実行**:
   ```javascript
   fetch('/api/updatePlayers', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ playerCount: 10 }) // 無効な値（6超過）
   }).then(r => r.json()).then(console.log)
   ```

**期待されるレスポンス**:
- ステータス: `400 Bad Request`
- レスポンスボディ:
  ```json
  {
    "error": "プレイヤー数は4〜6人の範囲で指定してください"
  }
  ```

#### テスト2: 不正なプレイヤーID

```javascript
fetch('/api/switchTurn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currentPlayerId: 'invalid-id', nextPlayerId: 'player-1' })
}).then(r => r.json()).then(console.log)
```

**期待されるレスポンス**:
- ステータス: `400 Bad Request`
- エラーメッセージ: "指定されたプレイヤーが見つかりません"

### 6.2 ネットワークエラーのテスト

1. **SignalR接続を強制切断**
   - 開発者ツール → Networkタブ → Offline設定

2. **UIに接続状態が表示されることを確認**
   - 「接続中...」または「再接続中...」の表示

3. **ネットワークを復旧**
   - Offline設定を解除

4. **自動再接続されることを確認**
   - SignalR接続が復旧
   - 最新のゲーム状態が同期される

---

## 7. レスポンシブデザインの検証

### 7.1 モバイル表示（スマートフォン）

1. **ブラウザ開発者ツール → デバイスツールバー**
2. **デバイス: iPhone 12 Pro（390px × 844px）を選択**
3. **確認項目**:
   - ✅ プレイヤー情報が縦スクロール可能な単列レイアウトで表示
   - ✅ ボタンが指でタップしやすいサイズ（最小44px × 44px）
   - ✅ タイマー値が読みやすいフォントサイズ
   - ✅ 横スクロールが発生しない

### 7.2 タブレット表示

1. **デバイス: iPad（768px × 1024px）を選択**
2. **確認項目**:
   - ✅ プレイヤー情報が2列グリッドレイアウトで表示
   - ✅ すべての要素が画面内に収まる

### 7.3 デスクトップ表示（PC）

1. **デバイス: Desktop（1920px × 1080px）を選択**
2. **確認項目**:
   - ✅ プレイヤー情報が3-4列グリッドレイアウトで表示
   - ✅ 十分な余白とレイアウトバランス

---

## 8. セキュリティ検証

### 8.1 HTTPS強制確認

1. **HTTPでアクセス**:
   - `http://swa-multiplayer-timer.azurestaticapps.net`

2. **期待される動作**:
   - ✅ 自動的にHTTPSにリダイレクトされる

### 8.2 Content Security Policyの確認

1. **開発者ツール → Networkタブ**
2. **HTMLレスポンスヘッダーを確認**

**期待されるヘッダー**:
```
content-security-policy: default-src https: 'unsafe-eval' 'unsafe-inline'; object-src 'none'
```

### 8.3 Rate Limitingの確認

1. **ブラウザConsoleで連続リクエストを実行**:
   ```javascript
   for (let i = 0; i < 150; i++) {
     fetch('/api/game').then(r => console.log(r.status))
   }
   ```

2. **期待される動作**:
   - 100リクエスト以降で`429 Too Many Requests`エラーが返る

---

## 9. 本番環境チェックリスト

デプロイメント完了前に以下を確認してください。

### 基本動作
- [ ] アプリケーションURLにアクセス可能
- [ ] 4人のプレイヤーがデフォルトで表示される
- [ ] タイマーが正常に動作する
- [ ] ターン切り替えが正常に動作する
- [ ] リセット機能が正常に動作する

### API動作
- [ ] `/api/game`が正常にレスポンスを返す
- [ ] `/api/switchTurn`が正常に動作する
- [ ] `/api/resetGame`が正常に動作する
- [ ] `/api/updatePlayers`が正常に動作する
- [ ] 無効な入力で適切なエラーレスポンスが返る

### リアルタイム同期
- [ ] SignalR接続が確立される
- [ ] 複数デバイス間で状態が同期される
- [ ] 同期遅延が1秒以内
- [ ] ネットワーク切断後の自動再接続が動作する

### Azureリソース
- [ ] Cosmos DBにゲーム状態が保存される
- [ ] SignalRメッセージ数が上限内（< 2万/日）
- [ ] Static Web Apps帯域幅が上限内（< 100GB/月）

### パフォーマンス
- [ ] ページ読み込み時間が2秒以内
- [ ] API応答時間がP95で500ms以内
- [ ] Lighthouse Performanceスコアが90点以上

### レスポンシブデザイン
- [ ] スマートフォン表示が正常（縦スクロール単列）
- [ ] タブレット表示が正常（2列グリッド）
- [ ] PC表示が正常（3-4列グリッド）

### セキュリティ
- [ ] HTTPS強制が有効
- [ ] Content Security Policyが設定済み
- [ ] Rate Limitingが動作する

---

## 10. トラブルシューティング

### 問題1: ページが表示されない（404エラー）

**原因**: デプロイが完了していない

**対処**:
1. GitHub Actionsログを確認
2. ビルドエラーがあれば修正してプッシュ
3. 5-10分待ってから再アクセス

### 問題2: APIが404エラー

**原因**: Managed Functionsがデプロイされていない

**対処**:
1. `api/`フォルダに`host.json`と`package.json`が存在するか確認
2. GitHub Actionsワークフローで`api_location: "/api"`が設定されているか確認
3. Azureアプリケーション設定で環境変数が設定されているか確認

### 問題3: SignalR接続が失敗する

**原因**: SignalR接続文字列が不正

**対処**:
1. Azureアプリケーション設定で`AzureSignalRConnectionString`を確認
2. SignalR Serviceがサーバーレスモードになっているか確認
3. ブラウザConsoleでエラーメッセージを確認

### 問題4: ゲーム状態が保存されない

**原因**: Cosmos DB接続文字列が不正

**対処**:
1. Azureアプリケーション設定で`CosmosDBConnectionString`を確認
2. Cosmos DBの`GameStates`テーブルが存在するか確認
3. Azure Portalで接続文字列を再取得して設定

---

## まとめ

本検証ガイドに従うことで、以下が確認できます。

✅ GitHub Actionsデプロイが成功
✅ フロントエンド・API・SignalRが正常動作
✅ リアルタイム同期が1秒以内で動作
✅ Azureリソースが無料枠内で動作
✅ パフォーマンス・セキュリティ要件を満たす

すべての検証項目が完了したら、本番環境としてユーザーに公開できます。

次のステップ: [本番環境動作確認ドキュメント](./PRODUCTION_READINESS.md)に従って最終チェックを実施してください。

# /kiro:validate-gap api-mode-ui-fixes 調査結果

## ユーザー報告
> プルダウンになっていないように思えます。確認してください

## 調査結果

### ✅ 正常に動作している部分

1. **フロントエンド実装**: datalistのHTML構造は完璧に実装されている
   - `<input list="player-name-history-api-{index}">`
   - `<datalist id="player-name-history-api-{index}">`
   - onFocusハンドラが正しく動作
   - ブラウザがcombobox（autocomplete="list"）として認識

2. **バックエンドエンドポイント実装**: 完全に実装済み
   - `getPlayerNames.ts`: GET /api/player-names
   - `savePlayerNames.ts`: POST /api/player-names
   - エラーハンドリング、バリデーション、40件制限実装済み

3. **エンドポイント登録**: 本セッションで修正完了 ✅
   - **問題**: `api/src/index.ts`に`getPlayerNames`と`savePlayerNames`のインポートが欠落
   - **修正**: 以下の2行を追加
     ```typescript
     import './functions/getPlayerNames';
     import './functions/savePlayerNames';
     ```
   - **検証**: `curl http://localhost:7071/api/player-names` → `[]` (200 OK) ✅

### ❌ ドロップダウンが表示されない根本原因

**Cosmos DB `PlayerNames`テーブルが存在しない**

#### 詳細
- GET /api/player-names: 200 OK、レスポンス `[]` (空配列)
- POST /api/player-names: 500エラー
  ```json
  {
    "error": "InternalServerError",
    "message": "プレイヤー名の保存に失敗しました",
    "details": "The specified resource does not exist."
  }
  ```

#### Cosmos DB状況
- **アカウント名**: `tick-tack-db`
- **リソースグループ**: `prdTickTackFour`
- **既存テーブル**: `GameState` のみ
- **欠落テーブル**: `PlayerNames` ← 作成が必要

#### テーブル作成試行結果
```bash
az cosmosdb table create \
  --account-name tick-tack-db \
  --resource-group prdTickTackFour \
  --name PlayerNames
```

**エラー**: RU/s制限超過
```
Your account is currently configured with a total throughput limit of 1000 RU/s.
This operation failed because it would have increased the total throughput to 1400 RU/s.
```

## 解決策

### オプション1: Cosmos DBテーブルを手動作成（推奨）

Azure Portalから以下の手順で作成：

1. **Azure Portal** にログイン
2. **tick-tack-db** Cosmos DBアカウントを開く
3. **Data Explorer** を選択
4. **New Table** をクリック
5. テーブル設定:
   - **Table name**: `PlayerNames`
   - **Throughput**: `Shared` または最小値（100 RU/s）を選択してRU/s制限を回避
6. **OK** をクリック

### オプション2: 既存GameStateテーブルのRU/sを削減

もし`GameState`テーブルが専用RU/sを持っている場合、それを削減して`PlayerNames`用のRU/sを確保：

```bash
# GameStateのRU/sを確認
az cosmosdb table throughput show \
  --account-name tick-tack-db \
  --resource-group prdTickTackFour \
  --name GameState

# RU/sを400に削減（例）
az cosmosdb table throughput update \
  --account-name tick-tack-db \
  --resource-group prdTickTackFour \
  --name GameState \
  --throughput 400
```

### オプション3: Cosmos DBアカウントのRU/s上限を引き上げる

Azureサポートに連絡して、アカウント全体のRU/s上限を1000 → 2000に引き上げる（有料プラン必要）

## 検証手順

`PlayerNames`テーブル作成後、以下の手順で動作確認：

### 1. テストデータ投入
```bash
curl -X POST http://localhost:7071/api/player-names \
  -H "Content-Type: application/json" \
  -d '{"names":["Alice","Bob","Charlie","David","Emma"]}'
```

### 2. データ確認
```bash
curl http://localhost:7071/api/player-names
```

期待するレスポンス:
```json
[
  {"name":"Alice","createdAt":"2025-10-25T..."},
  {"name":"Bob","createdAt":"2025-10-25T..."},
  ...
]
```

### 3. ブラウザでdatalist確認
1. http://localhost:5173 を開く
2. ゲームをリセット
3. プレイヤー名入力フィールドをクリック
4. datalistドロップダウンが表示され、Alice、Bob、Charlie等が選択肢として表示される ✅

## 実装完了状況

### ✅ 完了済み
- Task 5.3: プレイヤー名履歴をdatalistで表示（フロントエンド実装）
- バックエンドAPI実装（getPlayerNames.ts, savePlayerNames.ts）
- api/src/index.tsのインポート修正

### ⏳ 残作業
- Cosmos DB `PlayerNames`テーブルの作成（Azure Portal または CLI）
- テーブル作成後のE2Eテスト実行

## まとめ

**datalistの実装は完璧です。ドロップダウンが表示されない理由は、Cosmos DBに`PlayerNames`テーブルが存在せず、履歴データが空配列のためです。**

ユーザーがAzure Portalで`PlayerNames`テーブルを作成すれば、datalistのドロップダウン機能が正常に動作します。

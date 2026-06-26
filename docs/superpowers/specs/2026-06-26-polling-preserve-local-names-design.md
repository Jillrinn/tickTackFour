# ポーリングによるプレイヤー名上書き防止（Phase A）

作成日: 2026-06-26

## 背景・問題

通常モードでは `usePollingSync`（`GameTimer.tsx:77-88`）が1秒ごとに `GET /api/game` を実行し、
`serverGameState.updateFromServer(state)` を**引数なし**で呼び出して `serverState` 全体を上書きしている。

このため、ユーザーが設定欄でプレイヤー名を編集・保存しても、保存がバックエンドに反映される前に
次のポーリングが**古いプレイヤー名**を取得して `serverState.players[].name` を上書きし、
プレイヤーカード等の表示が元の名前に戻ってしまう（＝「名前の変更がうまくできない」症状）。

`updateFromServer` には編集中の名前を守る `editingPlayerIndex` 引数が存在するが、
ポーリング側から渡されていないため保護が機能していない。

## ゴールと段階方針

- **Phase A（本ドキュメント）**: 最小・安全な変更で名前バグを解消する。
  ポーリング由来の更新ではプレイヤー名をローカルの現在値で保持し、サーバー値で上書きしない。
- **Phase B（将来）**: 設定欄の値（名前・人数・モード等）を完全なローカルドラフト方式に作り変え、
  保存時にサーバー値と食い違っていたら競合エラーを表示する。本ドキュメントの対象外。

## Phase A 設計

### 変更方針

ポーリング経由の `updateFromServer` 呼び出し時は、`state.players[].name` をローカルの現在値で
置換してから反映する。タイマー系フィールド（`elapsedSeconds`・`activePlayerIndex`・
`turnStartedAt`・`isPaused`・`pausedAt` 等）はこれまで通りサーバー値で同期する。

### 実装詳細

1. `useServerGameState.ts` の `updateFromServer` に引数 `preserveLocalNames: boolean`（デフォルト `false`）を追加。
2. `preserveLocalNames === true` かつ `serverState !== null`（初回ではない）の場合、
   受信した `state.players[i].name` を `serverState.players[i].name`（同一indexのローカル名）で置換する。
   - indexが範囲外（人数差）の場合はサーバー名をそのまま採用（安全側）。
3. 初回（`serverState === null`）はサーバー名をそのまま採用する。
4. `GameTimer.tsx` のポーリングコールバック（`:79`）のみ `updateFromServer(state, true)` で呼び出す。
5. その他の `updateFromServer` 呼び出し（保存成功時 `:196`、409競合時 `:188`、`syncWithServer` 内 `:284`）は
   引数なし（`false`）のまま＝サーバー名を採用。保存直後は新しい名前が返るため正しい。

### 影響ファイル

- `frontend/src/hooks/useServerGameState.ts`
- `frontend/src/components/GameTimer.tsx`

## テスト（TDD）

`useServerGameState` 単体テスト（`__tests__/useServerGameState.test.ts`）に以下を追加:

1. `preserveLocalNames=true`: 既存ローカル名が保持され、サーバーの新しい名前で上書きされないこと。
2. `preserveLocalNames=true`: 名前以外（`elapsedSeconds` 等タイマー系）はサーバー値で更新されること。
3. 初回（`serverState===null`）で `preserveLocalNames=true` の場合はサーバー名を採用すること。
4. デフォルト（引数なし）は従来通りサーバー名を採用すること（リグレッション防止）。

## 非対象（Out of Scope）

- 設定欄のローカルドラフト化全般（人数・モード）
- 競合エラー表示（ETag不一致時のUI）
- ポーリング間隔やバックエンドの変更

# 実装タスク: reset-button-fix

## 概要

リセットボタン押下時にゲームが完全に停止状態になるよう、バックエンドのデフォルト状態生成ロジックを修正します。現在、APIモードでリセットボタンを押すと、状態はリセットされるものの即座に次のゲームが開始してしまう不具合があります。

**修正対象**: `api/src/models/gameState.ts`の`createDefaultGameState()`関数のLine 63-68（3行のみ）

**要件**: リセット後は「ゲーム未開始」状態（`isPaused: true`, `activePlayerIndex: -1`, `turnStartedAt: undefined`）にする

## Phase 1: バックエンド修正とユニットテスト

### 1. createDefaultGameState関数の停止状態設定を実装する

- [x] 1.1 リセット後の停止状態フラグを設定する
  - **ファイル**: api/src/models/gameState.ts
  - **修正箇所**: Line 63-68（createDefaultGameState関数内）
  - **変更内容**:
    - Line 63: `activePlayerIndex: 0` → `activePlayerIndex: -1`（アクティブプレイヤーなし）
    - Line 66: `isPaused: false` → `isPaused: true`（停止状態を明示）
    - Line 67: `turnStartedAt: new Date().toISOString()` → `turnStartedAt: undefined`（ターン未開始）
  - **根拠**: リセット後はゲームが停止状態であるべき（requirements.md Req 1.2-1.6, 2.1-2.3）
  - **既存機能への影響なし**: POST /api/resetは引き続きこの関数を呼び出すが、正しい停止状態を返すようになる
  - _Requirements: 1.2, 1.3, 1.6_

- [x] 1.2 createDefaultGameState関数のユニットテストを実装する
  - **ファイル**: api/src/models/__tests__/gameState.test.ts（新規作成）
  - **テストケース**:
    1. リセット後のisPausedフラグが`true`であることを検証
    2. リセット後のactivePlayerIndexが`-1`であることを検証
    3. リセット後のturnStartedAtが`undefined`であることを検証
    4. リセット後のpausedAtが`undefined`であることを検証
    5. 4人のプレイヤーが`accumulatedSeconds: 0`で初期化されることを検証
  - **実行**: `cd api && npm test -- gameState.test.ts`
  - **完了条件**: 全テストケースがパス
  - _Requirements: 1.1-1.6, 2.1_

### 2. POST /api/resetエンドポイントの統合テストを実装する

- [x] 2.1 リセットエンドポイントの正常系テストを実装する
  - **ファイル**: api/src/functions/__tests__/reset.test.ts（新規作成）
  - **テストケース**:
    1. 正しいETagでリセット呼び出し時、レスポンスの`isPaused`が`true`であることを検証
    2. 正しいETagでリセット呼び出し時、レスポンスの`activePlayerIndex`が`-1`であることを検証
    3. 正しいETagでリセット呼び出し時、レスポンスの`turnStartedAt`が`undefined`であることを検証
    4. レスポンスに新しいETagが含まれることを検証
  - **実行**: `cd api && npm test -- reset.test.ts`
  - **完了条件**: 全テストケースがパス
  - _Requirements: 1.1-1.6, 4.3, 5.2_

- [x] 2.2 リセットエンドポイントの異常系テストを実装する
  - **ファイル**: api/src/functions/__tests__/reset.test.ts
  - **テストケース**:
    1. 古いETagでリセット呼び出し時、409 Conflictが返されることを検証
    2. ETagが不正な場合、412 Precondition Failedが返されることを検証
  - **実行**: `cd api && npm test -- reset.test.ts`
  - **完了条件**: 全テストケースがパス
  - _Requirements: 5.3_

## Phase 2: フロントエンド統合テストとE2Eテスト

### 3. GameTimerコンポーネントとAPIの統合テストを実装する

- [ ] 3.1 リセットハンドラーとAPI統合のテストを実装する
  - **ファイル**: frontend/src/components/__tests__/GameTimer.resetIntegration.test.tsx（新規作成）
  - **テストケース**:
    1. APIモードでリセットボタン押下時、`resetGameApi(etag)`が呼び出されることを検証
    2. APIが`isPaused: true`, `activePlayerIndex: -1`を返した後、`syncWithServer()`が呼び出されることを検証
    3. プレイヤー名履歴保存機能が正しく動作することを検証（Task 8既存機能）
  - **実行**: `cd frontend && npm test -- GameTimer.resetIntegration.test.tsx`
  - **完了条件**: 全テストケースがパス
  - _Requirements: 3.1-3.4, 4.1, 4.3_

- [ ] 3.2 リセット後のタイマー停止確認テストを実装する
  - **ファイル**: frontend/src/components/__tests__/GameTimer.resetIntegration.test.tsx
  - **テストケース**:
    1. APIから`isPaused: true`の状態を取得後、useGameTimerが停止することを検証
    2. APIから`activePlayerIndex: -1`の状態を取得後、useGameTimerが停止することを検証
    3. リセット後、5秒間待機してもタイマーが進まないことを検証
  - **実行**: `cd frontend && npm test -- GameTimer.resetIntegration.test.tsx`
  - **完了条件**: 全テストケースがパス
  - _Requirements: 2.1-2.3, 3.1-3.4_

### 4. APIモードでのリセット機能のE2Eテストを実装する

- [ ] 4.1 リセット後の停止状態表示のE2Eテストを実装する
  - **ファイル**: e2e/specs/game-controls.spec.ts（既存ファイルに追加）
  - **テストケース**:
    1. ゲームを開始してタイマーを動作させる
    2. リセットボタン押下
    3. ヘッダーに「ゲーム未開始」と表示されることを確認
    4. 全プレイヤーの時間が「00:00」にリセットされることを確認
    5. アクティブプレイヤーのハイライトが削除されることを確認
    6. 5秒間待機しても時間が進まないことを確認
  - **実行**: `npx playwright test game-controls.spec.ts`
  - **完了条件**: 全テストケースがパス（APIモード）
  - _Requirements: 2.1-2.3, 3.1-3.4_

- [ ] 4.2 リセット後の新規ゲーム開始のE2Eテストを実装する
  - **ファイル**: e2e/specs/game-controls.spec.ts
  - **テストケース**:
    1. リセット実行後、次のプレイヤーへボタンを押下
    2. アクティブプレイヤーが設定されることを確認
    3. タイマーが開始されることを確認（時間が進む）
    4. 「ゲーム未開始」表示が消えることを確認
  - **実行**: `npx playwright test game-controls.spec.ts`
  - **完了条件**: 全テストケースがパス（APIモード）
  - _Requirements: 1.1-1.6, 2.1-2.3_

- [ ] 4.3 フォールバックモードでのリセット機能のE2Eテストを実装する
  - **ファイル**: e2e/specs/game-controls.spec.ts
  - **テストケース**:
    1. API接続を無効化してフォールバックモードに切り替え
    2. リセットボタン押下時に正しく停止状態になることを確認
    3. 全プレイヤーの時間がリセットされることを確認
  - **実行**: `npx playwright test game-controls.spec.ts`
  - **完了条件**: 全テストケースがパス（フォールバックモード）
  - _Requirements: 4.2_

## Phase 3: 実装完了処理

### 5. 実装完了処理を実施する

- [ ] 5.1 全テスト結果の確認
  - 全てのバックエンドユニットテストが成功していることを確認（`cd api && npm test`）
  - 全てのフロントエンドユニットテストが成功していることを確認（`cd frontend && npm test`）
  - 全てのE2Eテストが成功していることを確認（`npx playwright test`）
  - エラーや予期しない動作が発生しないことを確認
  - _Requirements: All_

- [ ] 5.2 spec.json更新とコミット作成
  - spec.jsonのphaseを"implementation-done"に更新
  - tasks.mdの全タスクをチェック済み[x]に更新
  - 詳細なコミットメッセージを作成（実装内容、テスト結果含む）
  - Gitコミット作成（実装完了の最終コミット）
  - _Requirements: All_

## タスク実装ガイドライン

### TDD実装フロー
1. **RED**: テストケースを先に作成（失敗することを確認）
2. **GREEN**: 最小限の実装でテストをパス
3. **REFACTOR**: 必要に応じてリファクタリング

### 各タスク完了時の検証
- [ ] ユニットテストが全てパス（`npm test`）
- [ ] TypeScript型エラーなし
- [ ] ESLintエラーなし

### コミットメッセージテンプレート
```
Task [番号]完了: [タスク名]

## 実装内容
- [実装した機能の詳細]

## テスト結果
- 全[N]ユニットテストパス
- 全テスト（既存含む）パス、リグレッションなし

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

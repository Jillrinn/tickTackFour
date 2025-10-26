# 設計書

## 1. 概要

### 1.1 目的
マルチプレイヤーゲームタイマーのプレイヤー人数設定範囲を、現在の4-6人から2-6人に拡張します。これにより、少人数（2人または3人）でのゲームプレイを可能にし、より幅広い利用シーンに対応します。

### 1.2 ゴール
- プレイヤー人数選択ドロップダウンに2人と3人の選択肢を追加
- フロントエンド（フォールバックモード・通常モード）で2-6人のプレイヤー数をサポート
- バックエンドAPIで2-6人のプレイヤー数を受け入れ、バリデーション
- 既存の全機能（タイマー、同期、プレイヤー名永続化等）を2-3人でも正常動作
- ゲーム開始後のプレイヤー人数変更を禁止（既存の制約を維持）

### 1.3 非ゴール
- UIレイアウトの大幅な変更（現在のレスポンシブレイアウトを維持）
- バックエンド側でのプレイヤー人数変更APIの新規作成（既存のupdateGame APIを使用）
- 1人プレイのサポート（2人以上のマルチプレイヤー前提）
- 7人以上のプレイヤー数サポート（6人が上限）

## 2. 技術選定の妥当性

### 2.1 既存アーキテクチャとの整合性
本機能は既存システムの**拡張**であり、新規技術スタックの導入は不要です。以下の既存パターンに従います：

#### フロントエンド
- **React 19.1.1 + TypeScript 5.9**: 既存のコンポーネントとhookを修正
- **Vite 7.1**: ビルドツールはそのまま使用
- **Dual-mode architecture**:
  - フォールバックモード: `useGameState`（インメモリー状態管理）
  - 通常モード: `useServerGameState`（API連携 + ポーリング同期）

#### バックエンド
- **Azure Functions**: 既存のupdateGame APIを修正
- **Cosmos DB Table API**: スキーマ変更不要（playerCountフィールドは既存）

### 2.2 定数ベースのバリデーション設計
プレイヤー人数の範囲を定数として管理し、以下のレイヤーで一貫性を保ちます：

```typescript
// frontend/src/types/GameState.ts
export const PLAYER_COUNT_MIN = 2; // 4 → 2 に変更
export const PLAYER_COUNT_MAX = 6; // 変更なし
```

この定数を使用する箇所：
- フロントエンド: `GameStateValidator.validatePlayerCount()`
- バックエンド: `updateGame.ts`のバリデーションロジック
- テスト: ユニットテスト・E2Eテストの境界値テスト

## 3. コンポーネント詳細設計

### 3.1 フロントエンド: UI層

#### 3.1.1 GameTimer.tsx - プレイヤー人数ドロップダウン
**ファイル**: `frontend/src/components/GameTimer.tsx`
**対象行**: lines 611-613

**変更前**:
```tsx
<option value={4}>4人</option>
<option value={5}>5人</option>
<option value={6}>6人</option>
```

**変更後**:
```tsx
<option value={2}>2人</option>
<option value={3}>3人</option>
<option value={4}>4人</option>
<option value={5}>5人</option>
<option value={6}>6人</option>
```

**デフォルト値**: 4人を維持（requirements.mdの要件1.5に準拠）

#### 3.1.2 プレイヤーカード表示のレスポンシブ対応
**既存実装**: GameTimer.tsxは既にプレイヤー配列の長さに応じて動的にカードを生成
**変更**: 不要（players.map()で自動的に2-6人分のカードを表示）

**検証事項**:
- スマートフォン表示: 2-3人分のカードが縦スクロールで正しく表示されるか
- タブレット表示: 2列グリッドレイアウトで正しく表示されるか
- PC表示: 横並びレイアウトで正しく表示されるか

### 3.2 フロントエンド: ロジック層

#### 3.2.1 GameState.ts - 定数とバリデーション
**ファイル**: `frontend/src/types/GameState.ts`

**変更箇所1**: プレイヤー人数定数（lines 48-49）
```typescript
// 変更前
export const PLAYER_COUNT_MIN = 4;
export const PLAYER_COUNT_MAX = 6;

// 変更後
export const PLAYER_COUNT_MIN = 2;
export const PLAYER_COUNT_MAX = 6;
```

**変更箇所2**: バリデーションメソッド（line 72-76）
```typescript
// 既存実装はそのまま（定数を使用しているため自動的に2-6人対応）
static validatePlayerCount(count: number): boolean {
  return count >= PLAYER_COUNT_MIN && count <= PLAYER_COUNT_MAX;
}
```

**変更箇所3**: エラーメッセージ（line 100）
```typescript
// 変更前
errors.push(`プレイヤー数は${PLAYER_COUNT_MIN}〜${PLAYER_COUNT_MAX}人の範囲でなければなりません`);
// → 自動的に「プレイヤー数は2〜6人の範囲でなければなりません」に変更される
```

#### 3.2.2 useGameState.ts - プレイヤー配列管理
**ファイル**: `frontend/src/hooks/useGameState.ts`

**対象**: `setPlayerCount()`関数（lines 65-98）

**既存実装の確認**:
- プレイヤー追加ロジック: `count > currentCount`の場合、`createDefaultPlayer()`で新規プレイヤーを生成
- プレイヤー削除ロジック: `count < currentCount`の場合、配列を`slice(0, count)`で切り詰め
- 検証: `GameStateValidator.validatePlayerCount(count)`を使用（定数変更で自動的に2-6人対応）

**変更**: 不要（既存のロジックが2-6人の範囲で正常動作）

**検証事項**:
- 2人設定時: プレイヤー配列が2要素に削減されるか
- 3人設定時: プレイヤー配列が3要素に削減されるか
- 4→2人変更時: プレイヤー3, 4が削除されるか
- 2→4人変更時: プレイヤー3, 4が追加されるか

#### 3.2.3 useServerGameState.ts - APIモード対応
**ファイル**: `frontend/src/hooks/useServerGameState.ts`

**対象**: バックエンドから取得したゲーム状態の処理

**既存実装の確認**:
- `serverState`はバックエンドのGameStateをそのまま使用
- プレイヤー配列長は`serverState.players.length`に依存
- バリデーションはバックエンド側で実施

**変更**: 不要（バックエンドAPIが2-6人を受け入れれば自動的に対応）

### 3.3 バックエンド: APIバリデーション

#### 3.3.1 updateGame.ts - プレイヤー数バリデーション
**ファイル**: `api/src/functions/updateGame.ts`

**変更箇所**: lines 65-76

**変更前**:
```typescript
if (playerCount < 4 || playerCount > 6) {
  return {
    status: 400,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: 'BadRequest',
      message: 'プレイヤー数は4人から6人の範囲で指定してください'
    })
  };
}
```

**変更後**:
```typescript
if (playerCount < 2 || playerCount > 6) {
  return {
    status: 400,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: 'BadRequest',
      message: 'プレイヤー数は2人から6人の範囲で指定してください'
    })
  };
}
```

#### 3.3.2 gameState.ts - プレイヤー追加ロジック
**ファイル**: `api/src/functions/updateGame.ts`

**対象**: プレイヤー追加処理（lines 79-89）

**既存実装の確認**:
```typescript
if (playerCount > currentPlayerCount) {
  // プレイヤーを追加
  const playersToAdd = playerCount - currentPlayerCount;
  for (let i = 0; i < playersToAdd; i++) {
    const newId = currentPlayerCount + i + 1;
    newState.players.push({
      id: newId,
      name: `Player ${newId}`,
      accumulatedSeconds: 0
    });
  }
}
```

**変更**: 不要（2人からの増加でも正常動作）

**検証事項**:
- 2人→4人変更時: Player 3, Player 4が追加されるか
- 3人→6人変更時: Player 4, Player 5, Player 6が追加されるか

#### 3.3.3 gameState.ts - コメント修正
**ファイル**: `api/src/models/gameState.ts`

**変更箇所**: line 14

**変更前**:
```typescript
playerCount: number; // プレイヤー数（4-6）
```

**変更後**:
```typescript
playerCount: number; // プレイヤー数（2-6）
```

### 3.4 テスト層

#### 3.4.1 ユニットテスト: バリデーション境界値テスト
**ファイル**: `frontend/src/types/__tests__/GameState.test.ts`

**変更箇所**: validatePlayerCountテストケース（lines 28-35）

**変更前**:
```typescript
it('should return false for player counts below 4', () => {
  expect(GameStateValidator.validatePlayerCount(3)).toBe(false);
  expect(GameStateValidator.validatePlayerCount(2)).toBe(false);
  expect(GameStateValidator.validatePlayerCount(0)).toBe(false);
});
```

**変更後**:
```typescript
it('should return true for 2 and 3 players', () => {
  expect(GameStateValidator.validatePlayerCount(2)).toBe(true);
  expect(GameStateValidator.validatePlayerCount(3)).toBe(true);
});

it('should return false for player counts below 2', () => {
  expect(GameStateValidator.validatePlayerCount(1)).toBe(false);
  expect(GameStateValidator.validatePlayerCount(0)).toBe(false);
});
```

**追加テストケース**:
```typescript
it('should return true for all valid player counts (2-6)', () => {
  expect(GameStateValidator.validatePlayerCount(2)).toBe(true);
  expect(GameStateValidator.validatePlayerCount(3)).toBe(true);
  expect(GameStateValidator.validatePlayerCount(4)).toBe(true);
  expect(GameStateValidator.validatePlayerCount(5)).toBe(true);
  expect(GameStateValidator.validatePlayerCount(6)).toBe(true);
});
```

#### 3.4.2 ユニットテスト: useGameState.setPlayerCount()
**ファイル**: `frontend/src/hooks/__tests__/useGameState.inputValidation.test.ts`

**変更箇所**: validatePlayerCountテストケース（lines 36-42）

**変更前**:
```typescript
it('should return false for below minimum (3 players)', () => {
  const { result } = renderHook(() => useGameState());
  expect(result.current.validatePlayerCount(3)).toBe(false);
});
```

**変更後**:
```typescript
it('should return true for minimum (2 players)', () => {
  const { result } = renderHook(() => useGameState());
  expect(result.current.validatePlayerCount(2)).toBe(true);
});

it('should return false for below minimum (1 player)', () => {
  const { result } = renderHook(() => useGameState());
  expect(result.current.validatePlayerCount(1)).toBe(false);
});
```

**追加テストケース**:
```typescript
describe('setPlayerCount - 2-3人対応', () => {
  it('should set player count to 2', () => {
    const { result } = renderHook(() => useGameState());
    act(() => {
      result.current.setPlayerCount(2);
    });
    expect(result.current.gameState.players).toHaveLength(2);
  });

  it('should set player count to 3', () => {
    const { result } = renderHook(() => useGameState());
    act(() => {
      result.current.setPlayerCount(3);
    });
    expect(result.current.gameState.players).toHaveLength(3);
  });

  it('should reduce from 4 to 2 players', () => {
    const { result } = renderHook(() => useGameState());
    act(() => {
      result.current.setPlayerCount(4);
    });
    act(() => {
      result.current.setPlayerCount(2);
    });
    expect(result.current.gameState.players).toHaveLength(2);
    expect(result.current.gameState.players[0].id).toBe('player-1');
    expect(result.current.gameState.players[1].id).toBe('player-2');
  });
});
```

#### 3.4.3 バックエンドユニットテスト: updateGame API
**ファイル**: `api/src/functions/__tests__/updateGame.test.ts`

**追加テストケース**:
```typescript
describe('POST /api/updateGame - プレイヤー数変更 (2-6人対応)', () => {
  it('should accept 2 players', async () => {
    const response = await request(app)
      .post('/api/updateGame')
      .send({ etag: 'test-etag', playerCount: 2 });
    expect(response.status).toBe(200);
    expect(response.body.playerCount).toBe(2);
    expect(response.body.players).toHaveLength(2);
  });

  it('should accept 3 players', async () => {
    const response = await request(app)
      .post('/api/updateGame')
      .send({ etag: 'test-etag', playerCount: 3 });
    expect(response.status).toBe(200);
    expect(response.body.playerCount).toBe(3);
    expect(response.body.players).toHaveLength(3);
  });

  it('should reject 1 player', async () => {
    const response = await request(app)
      .post('/api/updateGame')
      .send({ etag: 'test-etag', playerCount: 1 });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('2人から6人の範囲');
  });

  it('should reject 7 players', async () => {
    const response = await request(app)
      .post('/api/updateGame')
      .send({ etag: 'test-etag', playerCount: 7 });
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('2人から6人の範囲');
  });
});
```

#### 3.4.4 E2Eテスト: プレイヤー人数変更フロー
**ファイル**: `e2e/specs/player-count-range.spec.ts`（新規作成）

**テストシナリオ**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('プレイヤー人数範囲拡張 (2-6人)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display 2-6 player options in dropdown', async ({ page }) => {
    const dropdown = page.locator('[data-testid="player-count-dropdown"]');
    await expect(dropdown).toBeVisible();

    const options = await dropdown.locator('option').allTextContents();
    expect(options).toEqual(['2人', '3人', '4人', '5人', '6人']);
  });

  test('should default to 4 players', async ({ page }) => {
    const dropdown = page.locator('[data-testid="player-count-dropdown"]');
    await expect(dropdown).toHaveValue('4');
  });

  test('should change to 2 players and display 2 player cards', async ({ page }) => {
    const dropdown = page.locator('[data-testid="player-count-dropdown"]');
    await dropdown.selectOption('2');

    const playerCards = page.locator('[data-testid^="player-card-"]');
    await expect(playerCards).toHaveCount(2);
  });

  test('should change to 3 players and display 3 player cards', async ({ page }) => {
    const dropdown = page.locator('[data-testid="player-count-dropdown"]');
    await dropdown.selectOption('3');

    const playerCards = page.locator('[data-testid^="player-card-"]');
    await expect(playerCards).toHaveCount(3);
  });

  test('should preserve player names when reducing from 4 to 2', async ({ page }) => {
    // 4人のプレイヤー名を設定
    await page.fill('[data-testid="player-name-1"]', 'Alice');
    await page.fill('[data-testid="player-name-2"]', 'Bob');
    await page.fill('[data-testid="player-name-3"]', 'Charlie');
    await page.fill('[data-testid="player-name-4"]', 'Dave');

    // 2人に変更
    const dropdown = page.locator('[data-testid="player-count-dropdown"]');
    await dropdown.selectOption('2');

    // Alice と Bob は残る
    await expect(page.locator('[data-testid="player-name-1"]')).toHaveValue('Alice');
    await expect(page.locator('[data-testid="player-name-2"]')).toHaveValue('Bob');

    // Charlie と Dave のカードは消える
    await expect(page.locator('[data-testid="player-card-3"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="player-card-4"]')).not.toBeVisible();
  });

  test('should disable player count dropdown after game starts', async ({ page }) => {
    const dropdown = page.locator('[data-testid="player-count-dropdown"]');
    const startButton = page.locator('[data-testid="start-button"]');

    // ゲーム開始前は有効
    await expect(dropdown).toBeEnabled();

    // ゲーム開始
    await startButton.click();

    // ゲーム開始後は無効
    await expect(dropdown).toBeDisabled();
  });

  test('should work with all timer features in 2-player mode', async ({ page }) => {
    // 2人モードに設定
    const dropdown = page.locator('[data-testid="player-count-dropdown"]');
    await dropdown.selectOption('2');

    // ゲーム開始
    const startButton = page.locator('[data-testid="start-button"]');
    await startButton.click();

    // アクティブプレイヤー表示確認
    await expect(page.locator('[data-testid="active-player-indicator"]')).toBeVisible();

    // ターン切り替え
    const switchButton = page.locator('[data-testid="switch-turn-button"]');
    await switchButton.click();

    // タイマーが動作していることを確認（経過時間が0秒より大きい）
    const turnTime = page.locator('[data-testid="turn-time"]');
    await expect(turnTime).not.toHaveText('00:00');

    // 一時停止
    const pauseButton = page.locator('[data-testid="pause-button"]');
    await pauseButton.click();
    await expect(pauseButton).toHaveText('再開');

    // 再開
    await pauseButton.click();
    await expect(pauseButton).toHaveText('一時停止');

    // リセット
    const resetButton = page.locator('[data-testid="reset-button"]');
    await resetButton.click();

    // ドロップダウンが再度有効になる
    await expect(dropdown).toBeEnabled();
  });
});
```

## 4. データフローとインターフェース

### 4.1 フロントエンド: プレイヤー人数変更フロー

#### フォールバックモード（インメモリー）
```
User selects player count in dropdown
  ↓
GameTimer.handlePlayerCountChange(playerCount: number)
  ↓
fallbackState.setPlayerCount(playerCount)
  ↓
useGameState.setPlayerCount(playerCount)
  ↓
GameStateValidator.validatePlayerCount(playerCount) → true/false
  ↓ (if true)
setGameState(prev => {
  players: prev.players.slice(0, playerCount) または
          [...prev.players, ...新規プレイヤー]
})
  ↓
GameTimer再レンダリング → プレイヤーカード数が変更される
```

#### 通常モード（API連携）
```
User selects player count in dropdown
  ↓
GameTimer.handlePlayerCountChange(playerCount: number)
  ↓
updateGame(etag, { playerCount })
  ↓
POST /api/updateGame { etag, playerCount }
  ↓
Backend: validatePlayerCount(2-6) → 200 OK または 400 BadRequest
  ↓ (if 200 OK)
updateEtag(result.etag)
  ↓
usePollingSync: 5秒後にGET /api/game
  ↓
serverState更新 → GameTimer再レンダリング
```

### 4.2 バックエンド: プレイヤー数更新フロー
```
POST /api/updateGame { etag, playerCount: 2 }
  ↓
updateGame.ts: バリデーション (playerCount < 2 || playerCount > 6)
  ↓ (if valid)
getGameState() → 現在のゲーム状態取得
  ↓
プレイヤー配列調整:
  - playerCount > currentPlayerCount → プレイヤー追加
  - playerCount < currentPlayerCount → プレイヤー削除
  ↓
retryUpdateWithETag(newState, clientETag) → 楽観的ロック更新
  ↓
200 OK { ...newState, etag }
```

## 5. セキュリティ・パフォーマンス・制約事項

### 5.1 セキュリティ
- **バリデーション**: フロントエンドとバックエンドの両方でプレイヤー数を検証（2-6人の範囲）
- **楽観的ロック**: ETagを使用した競合検出（既存機能を維持）
- **入力サニタイゼーション**: プレイヤー名は既存のバリデーションを維持

### 5.2 パフォーマンス
- **影響**: 最小限（定数変更とドロップダウンオプション追加のみ）
- **メモリ**: 2-3人モードではプレイヤー配列が小さくなるため、メモリ使用量が微減
- **ネットワーク**: ポーリング同期の頻度は変わらず（5秒間隔を維持）

### 5.3 制約事項
- **ゲーム開始後の変更禁止**: 既存の制約を維持（ゲーム進行中はプレイヤー人数変更不可）
- **最小プレイヤー数**: 2人（1人プレイは非対応）
- **最大プレイヤー数**: 6人（7人以上は非対応）
- **レスポンシブレイアウト**: 既存のCSSがそのまま動作することを前提（2-3人でも見た目の崩れなし）

## 6. テスト戦略

### 6.1 ユニットテスト
**対象コンポーネント**:
- `GameStateValidator.validatePlayerCount()`: 境界値テスト（1, 2, 3, 6, 7人）
- `useGameState.setPlayerCount()`: 2-3人設定時の動作確認
- `updateGame API`: 2-6人のバリデーションと400エラーレスポンス

**実行タイミング**: 各タスク完了時に`npm test`で検証

### 6.2 E2Eテスト
**シナリオ**:
1. ドロップダウンに2-6人の選択肢が表示される
2. デフォルト値が4人である
3. 2人選択時に2枚のプレイヤーカードが表示される
4. 3人選択時に3枚のプレイヤーカードが表示される
5. 4→2人変更時にプレイヤー1-2の名前が保持される
6. ゲーム開始後はドロップダウンが無効化される
7. 2人モードで全タイマー機能（ターン切り替え、一時停止、リセット）が動作する

**実行タイミング**: 全実装完了後、`npx playwright test`で検証

### 6.3 手動テスト
**検証項目**:
- スマートフォン（375x667px）で2-3人表示の視認性確認
- タブレット（768x1024px）で2列グリッドレイアウト確認
- PC（1920x1080px）で横並びレイアウト確認
- Chrome DevToolsでAPIリクエスト/レスポンスの確認
  - POST /api/updateGame { playerCount: 2 } → 200 OK
  - GET /api/game → players配列が2要素

## 7. マイグレーション・互換性

### 7.1 データ移行
**不要**: Cosmos DBのスキーマ変更なし（既存のplayerCountフィールドをそのまま使用）

### 7.2 既存ユーザーへの影響
- **デフォルト値**: 4人のまま（要件1.5に準拠）
- **既存ゲーム状態**: 4-6人のゲーム状態はそのまま動作
- **新規機能**: 2-3人の選択肢が追加されるのみ

### 7.3 ロールバック
**手順**:
1. `PLAYER_COUNT_MIN`を4に戻す
2. ドロップダウンから2人・3人の選択肢を削除
3. バックエンドのバリデーションを`playerCount < 4`に戻す

**影響**: 2-3人で作成されたゲーム状態は、ロールバック後にバリデーションエラーとなる（要注意）

## 8. 運用・監視

### 8.1 ログ・エラー監視
**バックエンド**:
- `POST /api/updateGame`のバリデーションエラー（playerCount < 2 または > 6）をログ記録
- Application Insights等で400エラーの頻度を監視

**フロントエンド**:
- `console.error`でバリデーションエラーを記録（開発環境のみ）

### 8.2 メトリクス
**追跡項目**:
- プレイヤー人数の分布（2人: X%, 3人: Y%, 4人: Z%, 5人: W%, 6人: V%）
- 2-3人モードでのゲーム完了率
- 2-3人モードでのエラー発生率

## 9. 実装順序

### Phase 1: フロントエンド定数・バリデーション変更
1. `PLAYER_COUNT_MIN`を2に変更
2. ユニットテスト（GameState.test.ts, useGameState.inputValidation.test.ts）を更新
3. `npm test`で検証

### Phase 2: UI変更
1. GameTimer.tsxのドロップダウンに2人・3人の選択肢を追加
2. ブラウザで手動確認（フォールバックモード）

### Phase 3: バックエンドAPI変更
1. updateGame.tsのバリデーションを修正
2. gameState.tsのコメントを修正
3. バックエンドユニットテストを追加
4. `npm test`（APIディレクトリ）で検証

### Phase 4: 統合テスト
1. 開発サーバー起動（`npm run dev`）
2. Chrome DevToolsで通常モードのAPI連携を確認
3. 2人・3人でのゲーム動作を手動テスト

### Phase 5: E2Eテスト
1. E2Eテストシナリオを作成（player-count-range.spec.ts）
2. `npx playwright test`で全シナリオ検証

### Phase 6: 最終検証
1. レスポンシブレイアウト確認（スマートフォン、タブレット、PC）
2. 全受入基準（requirements.md）の検証
3. spec.jsonをphase: "implementation-done"に更新

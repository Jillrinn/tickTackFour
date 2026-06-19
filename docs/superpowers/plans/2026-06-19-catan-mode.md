# カタンモード（ターン順序バリアント）実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ゲームに「カタンモード」を追加する。フェーズ1は蛇腹順（4人なら 1→2→3→4→3→2→1）、終了後に自動でフェーズ2（通常順、プレイヤー1から仕切り直し）へ移行し、現在のフェーズをヘッダーにバッジ表示する。

**Architecture:** ターン順序を「現在のターン番号 `turnNumber`」と「人数」から決まる純粋関数で算出する（案1）。`turnNumber` と `gameMode` を状態に追加し、フロント（フォールバックモード `useGameState`）とバックエンド（`switchTurn`）の両方に同一の純粋関数を持たせる（共有パッケージが無いため二重実装＋両方にユニットテスト）。通常モードの既存ロジックには手を入れず、カタンモードのときだけ純粋関数で次手番を決める。

**Tech Stack:** React + TypeScript（フロント, vitest）、Azure Functions + TypeScript（API, jest）、Cosmos DB Table API、Playwright（E2E）。

## カタン順序の定義（全タスク共通の真実）

人数 `N`、ターン番号 `t`（0始まり。ゲーム開始の最初の手番が `t=0`）とする。

- フェーズ1の長さ `L1 = 2N - 1`
- `getCatanPlayerIndex(t, N)`:
  - `t < L1`（フェーズ1）: `t < N ? t : (2N - 2 - t)`
  - `t >= L1`（フェーズ2）: `(t - L1) % N`
- `getCatanPhase(t, N)`: `t < L1 ? 1 : 2`

検証例（N=4, L1=7）: t=0..6 → index 0,1,2,3,2,1,0（= プレイヤー1,2,3,4,3,2,1）。t=7 → (7-7)%4=0 → プレイヤー1（フェーズ2開始＝仕切り直し）。t=8 → 1 → プレイヤー2。

## Global Constraints

- 新機能はフォールバックモード（`useGameState`）と通常/APIモード（`switchTurn`＋`useServerGameState`）の**両方**で実装する（CLAUDE.md「UI/バックエンド分離」ルール）。
- カタンモードのオン/オフは設定カードのトグルで切り替え、**ゲーム開始後は変更不可**（`isGameStarted` で `disabled`）。タイマーモードと同じ扱い。
- カタンモード中は**カードクリックによる手番ジャンプ（`targetPlayerIndex`／フォールバックの「アクティブに設定」）を無効化**する。次へボタンのみで進行し、`turnNumber` を唯一の真実に保つ。
- プレイヤー人数は 2〜6 人。`getCatanPlayerIndex` は全人数で破綻しないこと。
- TDD（RED → GREEN → 必要ならREFACTOR）。1タスク1コミット、`git add` は関連ファイルのみ明示指定（`-A`/`.` 禁止）。
- コミットメッセージは日本語。末尾に `Co-Authored-By` 行を付ける（CLAUDE.mdテンプレート準拠）。
- 既存の永続データ（`gameMode`/`turnNumber` を持たないエンティティ）を読んでも壊れないよう、`fromEntity` でデフォルト（`'normal'` / `0`）を補完する。

---

## Phase A: 共有ターン順序ロジック（純粋関数）

### Task 1: バックエンド ターン順序ユーティリティ

**Files:**
- Create: `api/src/services/turnSequence.ts`
- Test: `api/src/services/__tests__/turnSequence.test.ts`

**Interfaces:**
- Produces:
  - `getCatanPhase1Length(playerCount: number): number`
  - `getCatanPlayerIndex(turnNumber: number, playerCount: number): number`
  - `getCatanPhase(turnNumber: number, playerCount: number): 1 | 2`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// api/src/services/__tests__/turnSequence.test.ts
import { getCatanPlayerIndex, getCatanPhase, getCatanPhase1Length } from '../turnSequence';

describe('turnSequence (catan)', () => {
  it('4人: フェーズ1は 1,2,3,4,3,2,1 の順（index 0..3,2,1,0）', () => {
    const seq = [0, 1, 2, 3, 4, 5, 6].map(t => getCatanPlayerIndex(t, 4));
    expect(seq).toEqual([0, 1, 2, 3, 2, 1, 0]);
  });

  it('4人: フェーズ2はプレイヤー1から仕切り直し（t=7→0, t=8→1）', () => {
    expect(getCatanPlayerIndex(7, 4)).toBe(0);
    expect(getCatanPlayerIndex(8, 4)).toBe(1);
    expect(getCatanPlayerIndex(11, 4)).toBe(0);
  });

  it('phase1の長さは 2N-1', () => {
    expect(getCatanPhase1Length(4)).toBe(7);
    expect(getCatanPhase1Length(2)).toBe(3);
    expect(getCatanPhase1Length(6)).toBe(11);
  });

  it('getCatanPhase はL1境界で1→2に切り替わる（N=4: t=6→1, t=7→2）', () => {
    expect(getCatanPhase(0, 4)).toBe(1);
    expect(getCatanPhase(6, 4)).toBe(1);
    expect(getCatanPhase(7, 4)).toBe(2);
  });

  it('2人: フェーズ1は 1,2,1（index 0,1,0）', () => {
    expect([0, 1, 2].map(t => getCatanPlayerIndex(t, 2))).toEqual([0, 1, 0]);
    expect(getCatanPlayerIndex(3, 2)).toBe(0); // phase2 start
  });

  it('6人: フェーズ1は index 0..5,4,3,2,1,0', () => {
    const seq = Array.from({ length: 11 }, (_, t) => getCatanPlayerIndex(t, 6));
    expect(seq).toEqual([0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd api && npx jest src/services/__tests__/turnSequence.test.ts`
Expected: FAIL（`Cannot find module '../turnSequence'`）

- [ ] **Step 3: 最小実装**

```typescript
// api/src/services/turnSequence.ts
/**
 * カタンモードのターン順序を算出する純粋関数群。
 * フェーズ1: 蛇腹順（昇順→折り返し1回→降順）。フェーズ2: 通常順（プレイヤー0から仕切り直し）。
 */

/** フェーズ1の総ターン数（2N-1） */
export function getCatanPhase1Length(playerCount: number): number {
  return 2 * playerCount - 1;
}

/** ターン番号tにおけるアクティブプレイヤーのindex */
export function getCatanPlayerIndex(turnNumber: number, playerCount: number): number {
  const l1 = getCatanPhase1Length(playerCount);
  if (turnNumber < l1) {
    // フェーズ1: 蛇腹
    return turnNumber < playerCount ? turnNumber : 2 * playerCount - 2 - turnNumber;
  }
  // フェーズ2: 通常順、プレイヤー0から仕切り直し
  return (turnNumber - l1) % playerCount;
}

/** ターン番号tにおけるフェーズ（1 or 2） */
export function getCatanPhase(turnNumber: number, playerCount: number): 1 | 2 {
  return turnNumber < getCatanPhase1Length(playerCount) ? 1 : 2;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd api && npx jest src/services/__tests__/turnSequence.test.ts`
Expected: PASS（全6ケース）

- [ ] **Step 5: コミット**

```bash
git add api/src/services/turnSequence.ts api/src/services/__tests__/turnSequence.test.ts
git commit -m "$(cat <<'EOF'
カタンモード: バックエンド ターン順序純粋関数を追加

## 実装内容
- api/src/services/turnSequence.ts を新規作成
- getCatanPlayerIndex / getCatanPhase / getCatanPhase1Length を実装
- フェーズ1=蛇腹順（2N-1ターン）、フェーズ2=通常順（プレイヤー0仕切り直し）

## テスト結果
- turnSequence.test.ts 全6ケースパス（2/4/6人、フェーズ境界含む）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: フロントエンド ターン順序ユーティリティ

**Files:**
- Create: `frontend/src/utils/turnSequence.ts`
- Test: `frontend/src/utils/__tests__/turnSequence.test.ts`

**Interfaces:**
- Produces: `getCatanPlayerIndex`, `getCatanPhase`, `getCatanPhase1Length`（Task 1 と同一シグネチャ）

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// frontend/src/utils/__tests__/turnSequence.test.ts
import { describe, it, expect } from 'vitest';
import { getCatanPlayerIndex, getCatanPhase, getCatanPhase1Length } from '../turnSequence';

describe('turnSequence (catan)', () => {
  it('4人: フェーズ1は index 0,1,2,3,2,1,0', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(t => getCatanPlayerIndex(t, 4))).toEqual([0, 1, 2, 3, 2, 1, 0]);
  });

  it('4人: フェーズ2はプレイヤー1から（t=7→0, t=8→1）', () => {
    expect(getCatanPlayerIndex(7, 4)).toBe(0);
    expect(getCatanPlayerIndex(8, 4)).toBe(1);
  });

  it('getCatanPhase はN=4で t=6→1, t=7→2', () => {
    expect(getCatanPhase(6, 4)).toBe(1);
    expect(getCatanPhase(7, 4)).toBe(2);
  });

  it('getCatanPhase1Length は 2N-1', () => {
    expect(getCatanPhase1Length(4)).toBe(7);
  });

  it('2人: index 0,1,0', () => {
    expect([0, 1, 2].map(t => getCatanPlayerIndex(t, 2))).toEqual([0, 1, 0]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd frontend && npx vitest run src/utils/__tests__/turnSequence.test.ts`
Expected: FAIL（モジュール未定義）

- [ ] **Step 3: 最小実装**

```typescript
// frontend/src/utils/turnSequence.ts
/**
 * カタンモードのターン順序を算出する純粋関数群（バックエンド api/src/services/turnSequence.ts と同一ロジック）。
 */
export function getCatanPhase1Length(playerCount: number): number {
  return 2 * playerCount - 1;
}

export function getCatanPlayerIndex(turnNumber: number, playerCount: number): number {
  const l1 = getCatanPhase1Length(playerCount);
  if (turnNumber < l1) {
    return turnNumber < playerCount ? turnNumber : 2 * playerCount - 2 - turnNumber;
  }
  return (turnNumber - l1) % playerCount;
}

export function getCatanPhase(turnNumber: number, playerCount: number): 1 | 2 {
  return turnNumber < getCatanPhase1Length(playerCount) ? 1 : 2;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd frontend && npx vitest run src/utils/__tests__/turnSequence.test.ts`
Expected: PASS（全5ケース）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/utils/turnSequence.ts frontend/src/utils/__tests__/turnSequence.test.ts
git commit -m "$(cat <<'EOF'
カタンモード: フロントエンド ターン順序純粋関数を追加

## 実装内容
- frontend/src/utils/turnSequence.ts を新規作成（バックエンドと同一ロジック）
- getCatanPlayerIndex / getCatanPhase / getCatanPhase1Length を実装

## テスト結果
- turnSequence.test.ts 全5ケースパス

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase B: バックエンド状態モデルと永続化

### Task 3: GameState 型と永続化に gameMode/turnNumber を追加

**Files:**
- Modify: `api/src/models/gameState.ts`（`Player`は変更なし。`GameState`/`GameStateEntity`/`createDefaultGameState`/`toEntity`/`fromEntity`）
- Test: `api/src/models/__tests__/gameState.test.ts`

**Interfaces:**
- Produces: `GameState` に `gameMode: 'normal' | 'catan'` と `turnNumber: number` を追加。`createDefaultGameState()` は `gameMode: 'normal'`, `turnNumber: 0` を含む。

- [ ] **Step 1: 失敗するテストを書く**（既存ファイルへ追記）

```typescript
// api/src/models/__tests__/gameState.test.ts へ追記
import { createDefaultGameState, toEntity, fromEntity } from '../gameState';
import type { GameStateEntity } from '../gameState';

describe('gameMode / turnNumber 永続化', () => {
  it('createDefaultGameState は gameMode=normal, turnNumber=0 を持つ', () => {
    const s = createDefaultGameState();
    expect(s.gameMode).toBe('normal');
    expect(s.turnNumber).toBe(0);
  });

  it('toEntity → fromEntity で gameMode/turnNumber が往復する', () => {
    const s = createDefaultGameState();
    s.gameMode = 'catan';
    s.turnNumber = 5;
    const entity = { ...toEntity(s), etag: 'x' } as GameStateEntity;
    const restored = fromEntity(entity);
    expect(restored.gameMode).toBe('catan');
    expect(restored.turnNumber).toBe(5);
  });

  it('旧データ（gameMode/turnNumber 無し）は normal/0 に補完される', () => {
    const legacy = {
      partitionKey: 'game', rowKey: 'default', etag: 'x',
      playerCount: 4,
      players: JSON.stringify([{ id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 }]),
      activePlayerIndex: -1, timerMode: 'countup', countdownSeconds: 60, isPaused: true
    } as unknown as GameStateEntity;
    const restored = fromEntity(legacy);
    expect(restored.gameMode).toBe('normal');
    expect(restored.turnNumber).toBe(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd api && npx jest src/models/__tests__/gameState.test.ts`
Expected: FAIL（`gameMode` が型に無い / `undefined`）

- [ ] **Step 3: 実装**（`api/src/models/gameState.ts`）

`GameState` インターフェースに追記（`pausedAt?` の下）:

```typescript
  pausedAt?: string; // ISO8601タイムスタンプ
  gameMode: 'normal' | 'catan'; // ゲーム順序モード（通常 / カタン）
  turnNumber: number; // 現在のアクティブ手番の通し番号（ゲーム開始の最初の手番が0）
```

`GameStateEntity` インターフェースに追記（`pausedAt?` の下）:

```typescript
  pausedAt?: string;
  gameMode?: string; // 'normal' | 'catan'（旧データには存在しない）
  turnNumber?: number; // 現在の手番通し番号（旧データには存在しない）
```

`createDefaultGameState()` の return に追記:

```typescript
    turnStartedAt: undefined,
    pausedAt: undefined,
    gameMode: 'normal',
    turnNumber: 0
```

`toEntity()` の return に追記:

```typescript
    turnStartedAt: state.turnStartedAt,
    pausedAt: state.pausedAt,
    gameMode: state.gameMode,
    turnNumber: state.turnNumber
```

`fromEntity()` の return に追記（デフォルト補完あり）:

```typescript
    turnStartedAt: entity.turnStartedAt,
    pausedAt: entity.pausedAt,
    gameMode: (entity.gameMode as 'normal' | 'catan') ?? 'normal',
    turnNumber: entity.turnNumber ?? 0
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd api && npx jest src/models/__tests__/gameState.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add api/src/models/gameState.ts api/src/models/__tests__/gameState.test.ts
git commit -m "$(cat <<'EOF'
カタンモード: GameStateにgameMode/turnNumberを追加し永続化対応

## 実装内容
- GameState/GameStateEntityにgameMode・turnNumberを追加
- createDefaultGameStateで normal/0 を初期化
- toEntity/fromEntityで往復、旧データはnormal/0に補完

## テスト結果
- gameState.test.ts 追加3ケース＋既存パス

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase C: バックエンドAPI

### Task 4: switchTurn にカタン順序ロジックを実装

**Files:**
- Modify: `api/src/functions/switchTurn.ts`
- Test: `api/src/functions/__tests__/switchTurn.test.ts`

**Interfaces:**
- Consumes: `getCatanPlayerIndex`（Task 1）, `GameState`（Task 3）
- 振る舞い: `gameMode==='catan'` のとき、ターン切替で `turnNumber` を +1 し、次手番indexを `getCatanPlayerIndex(turnNumber, playerCount)` で決定。`targetPlayerIndex` は無視。初期状態からの開始時は `turnNumber=0`, index=0。

- [ ] **Step 1: 失敗するテストを書く**（既存テストのモック方式に合わせて追記。下記はモック前提の一例。既存ファイルの `getGameState`/`updateGameState` モック構造に合わせること）

```typescript
// api/src/functions/__tests__/switchTurn.test.ts へ追記
// 既存ファイル冒頭の jest.mock('../../services/gameStateService') と同じモックを利用する想定
import { switchTurn } from '../switchTurn';
import { getGameState, updateGameState } from '../../services/gameStateService';

const mockGetGameState = getGameState as jest.MockedFunction<typeof getGameState>;
const mockUpdateGameState = updateGameState as jest.MockedFunction<typeof updateGameState>;

function makeReq(body: unknown) {
  return { text: async () => JSON.stringify(body) } as any;
}
const ctx = {} as any;

describe('switchTurn カタンモード', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateGameState.mockImplementation(async (state) => ({ state, etag: 'new-etag' }));
  });

  it('カタン: 進行中の切替で turnNumber+1 し蛇腹順で次indexを決める（4人, t=3→index2）', async () => {
    mockGetGameState.mockResolvedValue({
      state: {
        playerCount: 4,
        players: [
          { id: 1, name: 'P1', accumulatedSeconds: 0 },
          { id: 2, name: 'P2', accumulatedSeconds: 0 },
          { id: 3, name: 'P3', accumulatedSeconds: 0 },
          { id: 4, name: 'P4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 3, timerMode: 'countup', countdownSeconds: 60,
        isPaused: false, turnStartedAt: new Date().toISOString(),
        gameMode: 'catan', turnNumber: 3
      },
      etag: 'etag-1'
    } as any);

    const res = await switchTurn(makeReq({ etag: 'etag-1' }), ctx);
    const saved = mockUpdateGameState.mock.calls[0][0];
    expect(saved.turnNumber).toBe(4);
    expect(saved.activePlayerIndex).toBe(2); // getCatanPlayerIndex(4,4)=2
    expect(res.status).toBe(200);
  });

  it('カタン: targetPlayerIndex は無視される', async () => {
    mockGetGameState.mockResolvedValue({
      state: {
        playerCount: 4,
        players: [
          { id: 1, name: 'P1', accumulatedSeconds: 0 },
          { id: 2, name: 'P2', accumulatedSeconds: 0 },
          { id: 3, name: 'P3', accumulatedSeconds: 0 },
          { id: 4, name: 'P4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0, timerMode: 'countup', countdownSeconds: 60,
        isPaused: false, turnStartedAt: new Date().toISOString(),
        gameMode: 'catan', turnNumber: 0
      },
      etag: 'etag-1'
    } as any);

    await switchTurn(makeReq({ etag: 'etag-1', targetPlayerIndex: 3 }), ctx);
    const saved = mockUpdateGameState.mock.calls[0][0];
    expect(saved.turnNumber).toBe(1);
    expect(saved.activePlayerIndex).toBe(1); // ジャンプ無視、蛇腹のt=1=index1
  });

  it('カタン: 初期状態からの開始は turnNumber=0, index=0', async () => {
    mockGetGameState.mockResolvedValue({
      state: {
        playerCount: 4,
        players: [
          { id: 1, name: 'P1', accumulatedSeconds: 0 },
          { id: 2, name: 'P2', accumulatedSeconds: 0 },
          { id: 3, name: 'P3', accumulatedSeconds: 0 },
          { id: 4, name: 'P4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: -1, timerMode: 'countup', countdownSeconds: 60,
        isPaused: true, gameMode: 'catan', turnNumber: 0
      },
      etag: 'etag-1'
    } as any);

    await switchTurn(makeReq({ etag: 'etag-1' }), ctx);
    const saved = mockUpdateGameState.mock.calls[0][0];
    expect(saved.activePlayerIndex).toBe(0);
    expect(saved.turnNumber).toBe(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd api && npx jest src/functions/__tests__/switchTurn.test.ts`
Expected: FAIL（turnNumber未設定 / index不一致）

- [ ] **Step 3: 実装**（`api/src/functions/switchTurn.ts`）

冒頭の import に追記:

```typescript
import { getCatanPlayerIndex } from '../services/turnSequence';
```

`hasTarget` 定義をカタン時は無効化するよう変更（`const currentState = result.state;` の後にある行）:

```typescript
    // targetPlayerIndex指定時のバリデーションと「アクティブ本人なら何もしない」処理
    // カタンモードでは手番ジャンプを許可しない（蛇腹順を厳密に保つ）ためtargetを無視
    const hasTarget =
      targetPlayerIndex !== undefined &&
      targetPlayerIndex !== null &&
      currentState.gameMode !== 'catan';
```

初期状態ブロック（`if (isInitialState)`）の `newState` を変更:

```typescript
    if (isInitialState) {
      // 初期状態からのゲーム開始処理。
      // カタン: turnNumber=0, index=getCatanPlayerIndex(0,N)=0
      // 通常: target指定があればその人、なければ先頭(0)
      const startIndex =
        currentState.gameMode === 'catan'
          ? getCatanPlayerIndex(0, currentState.playerCount)
          : hasTarget
          ? targetPlayerIndex
          : 0;
      newState = {
        ...currentState,
        activePlayerIndex: startIndex,
        isPaused: false,
        turnStartedAt: new Date().toISOString(),
        turnNumber: 0,
        players: currentState.players
      };
    } else {
```

通常切替ブロック（`else` 内）の `nextPlayerIndex` 算出を変更:

```typescript
      // 行き先の決定
      // カタン: turnNumber+1 → 蛇腹/通常順を純粋関数で算出（target無視）
      // 通常: target指定があればジャンプ、なければ次へ循環
      const nextTurnNumber = currentState.turnNumber + 1;
      const nextPlayerIndex =
        currentState.gameMode === 'catan'
          ? getCatanPlayerIndex(nextTurnNumber, currentState.playerCount)
          : hasTarget
          ? targetPlayerIndex
          : (currentState.activePlayerIndex + 1) % currentState.playerCount;

      newState = {
        ...currentState,
        players: updatedPlayers,
        activePlayerIndex: nextPlayerIndex,
        turnNumber: nextTurnNumber,
        turnStartedAt: new Date().toISOString()
      };
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd api && npx jest src/functions/__tests__/switchTurn.test.ts`
Expected: PASS（追加3ケース＋既存ケース）

- [ ] **Step 5: コミット**

```bash
git add api/src/functions/switchTurn.ts api/src/functions/__tests__/switchTurn.test.ts
git commit -m "$(cat <<'EOF'
カタンモード: switchTurnに蛇腹順ロジックを実装

## 実装内容
- gameMode==='catan'時はturnNumber+1し純粋関数で次indexを決定
- カタン中はtargetPlayerIndex（手番ジャンプ）を無視
- 初期状態からの開始はturnNumber=0,index=0

## テスト結果
- switchTurn.test.ts 追加3ケース＋既存パス、リグレッションなし

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: updateGame に gameMode 更新を追加

**Files:**
- Modify: `api/src/functions/updateGame.ts`
- Test: `api/src/functions/__tests__/updateGame.test.ts`

**Interfaces:**
- 振る舞い: リクエストボディの `gameMode`（`'normal'|'catan'`）を受け取り検証して `newState.gameMode` に反映。不正値は400。

- [ ] **Step 1: 失敗するテストを書く**（既存テストのモック構造に合わせて追記）

```typescript
// api/src/functions/__tests__/updateGame.test.ts へ追記
describe('updateGame gameMode', () => {
  it('gameMode=catan を保存する', async () => {
    // 既存テストの beforeEach で getGameState/updateGameState がモックされている前提
    const res = await callUpdateGame({ etag: 'etag-1', gameMode: 'catan' });
    const saved = getLastSavedState(); // 既存ヘルパーが無ければ mockUpdateGameState.mock.calls[0][0] を参照
    expect(saved.gameMode).toBe('catan');
    expect(res.status).toBe(200);
  });

  it('不正な gameMode は400', async () => {
    const res = await callUpdateGame({ etag: 'etag-1', gameMode: 'invalid' });
    expect(res.status).toBe(400);
  });
});
```

> 注: 既存ファイルにヘルパー（`callUpdateGame`/`getLastSavedState`）が無い場合は、同ファイル先頭で使われているモック呼び出しパターン（`mockUpdateGameState.mock.calls[0][0]` 等）をそのまま使ってアサートすること。`makeReq` 相当のリクエスト生成も既存パターンに合わせる。

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd api && npx jest src/functions/__tests__/updateGame.test.ts`
Expected: FAIL（gameMode未保存 / 400にならない）

- [ ] **Step 3: 実装**（`api/src/functions/updateGame.ts`）

分割代入に `gameMode` を追加:

```typescript
    const { playerCount, timerMode, countdownSeconds, playerNames, gameMode } = body;
```

「何も更新内容が指定されていない」判定に `gameMode === undefined` を追加:

```typescript
    if (playerCount === undefined && timerMode === undefined &&
        countdownSeconds === undefined && playerNames === undefined &&
        gameMode === undefined) {
```

タイマーモード処理ブロックの直後に gameMode 処理を追加:

```typescript
    // ゲームモード変更のバリデーションと処理
    if (gameMode !== undefined) {
      if (gameMode !== 'normal' && gameMode !== 'catan') {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'ゲームモードはnormalまたはcatanを指定してください'
          })
        };
      }
      newState.gameMode = gameMode;
    }
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd api && npx jest src/functions/__tests__/updateGame.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add api/src/functions/updateGame.ts api/src/functions/__tests__/updateGame.test.ts
git commit -m "$(cat <<'EOF'
カタンモード: updateGameでgameMode更新に対応

## 実装内容
- updateGameでgameMode（normal|catan）を受け取り検証・保存
- 不正値は400 BadRequest

## テスト結果
- updateGame.test.ts 追加2ケース＋既存パス

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: APIレスポンスに gameMode と phase を含める

**Files:**
- Modify: `api/src/models/apiTypes.ts`
- Modify: `api/src/services/gameStateResponse.ts`
- Test: `api/src/services/__tests__/gameStateResponse.test.ts`（無ければ新規作成）

**Interfaces:**
- Produces: `GameStateWithTime` に `gameMode: string` と `phase: number`（0=通常, 1|2=カタン）を追加。`toGameStateWithTime` がそれらを算出して返す。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// api/src/services/__tests__/gameStateResponse.test.ts（新規 or 追記）
import { toGameStateWithTime } from '../gameStateResponse';
import { createDefaultGameState } from '../../models/gameState';

describe('toGameStateWithTime gameMode/phase', () => {
  it('通常モードは gameMode=normal, phase=0', () => {
    const state = createDefaultGameState();
    state.activePlayerIndex = 0;
    const res = toGameStateWithTime(state, 'etag-1');
    expect(res.gameMode).toBe('normal');
    expect(res.phase).toBe(0);
  });

  it('カタン: turnNumber=6, 4人 は phase=1', () => {
    const state = createDefaultGameState();
    state.gameMode = 'catan';
    state.turnNumber = 6;
    state.activePlayerIndex = 0;
    expect(toGameStateWithTime(state, 'e').phase).toBe(1);
  });

  it('カタン: turnNumber=7, 4人 は phase=2', () => {
    const state = createDefaultGameState();
    state.gameMode = 'catan';
    state.turnNumber = 7;
    state.activePlayerIndex = 0;
    expect(toGameStateWithTime(state, 'e').phase).toBe(2);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd api && npx jest src/services/__tests__/gameStateResponse.test.ts`
Expected: FAIL（`gameMode`/`phase` がレスポンスに無い）

- [ ] **Step 3: 実装**

`api/src/models/apiTypes.ts` の `GameStateWithTime` に追記:

```typescript
  turnStartedAt: string | null;
  pausedAt: string | null;
  gameMode: string;       // 'normal' | 'catan'
  phase: number;          // 0=通常モード, 1|2=カタンのフェーズ
```

`api/src/services/gameStateResponse.ts` を変更（import追加と算出）:

```typescript
import { GameState } from '../models/gameState';
import { GameStateWithTime } from '../models/apiTypes';
import { calculateAllPlayerTimes } from './timeCalculation';
import { getCatanPhase } from './turnSequence';
```

return 直前で phase を算出し、return に追記:

```typescript
  const phase = state.gameMode === 'catan'
    ? getCatanPhase(state.turnNumber, state.playerCount)
    : 0;

  return {
    players,
    activePlayerIndex: state.activePlayerIndex,
    timerMode: state.timerMode,
    countdownSeconds: state.countdownSeconds,
    isPaused: state.isPaused,
    etag,
    turnStartedAt: state.turnStartedAt || null,
    pausedAt: state.pausedAt || null,
    gameMode: state.gameMode,
    phase
  };
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd api && npx jest src/services/__tests__/gameStateResponse.test.ts`
Expected: PASS

- [ ] **Step 5: バックエンド全体テスト＆コミット**

Run: `cd api && npx jest`
Expected: 全テストPASS（リグレッションなし）

```bash
git add api/src/models/apiTypes.ts api/src/services/gameStateResponse.ts api/src/services/__tests__/gameStateResponse.test.ts
git commit -m "$(cat <<'EOF'
カタンモード: APIレスポンスにgameMode/phaseを追加

## 実装内容
- GameStateWithTimeにgameMode・phaseを追加
- toGameStateWithTimeでphaseを算出（通常=0, カタン=1|2）

## テスト結果
- gameStateResponse.test.ts 追加3ケース、api全テストパス

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase D: フロントエンド状態（型・フォールバックモード）

### Task 7: フロントエンド型に gameMode/turnNumber/phase を追加

**Files:**
- Modify: `frontend/src/types/GameState.ts`
- Test: 型変更のみのため専用テスト不要（後続タスクのコンパイル/テストで担保）

**Interfaces:**
- Produces:
  - `export type GameMode = 'normal' | 'catan'`
  - `export const DEFAULT_GAME_MODE: GameMode = 'normal'`
  - `GameState` に `gameMode: GameMode`, `turnNumber: number`
  - `GameStateWithTime` に `gameMode: string`, `phase: number`

- [ ] **Step 1: 実装**（`frontend/src/types/GameState.ts`）

`TimerMode` 型定義の近くに追記:

```typescript
/**
 * ゲーム順序モード
 * - normal: 通常の循環順
 * - catan: フェーズ1=蛇腹順、フェーズ2=通常順（カタンの初期配置風）
 */
export type GameMode = 'normal' | 'catan';

/** デフォルトのゲームモード */
export const DEFAULT_GAME_MODE: GameMode = 'normal';
```

`GameState` インターフェースに追記（`pausedAt` の下）:

```typescript
  pausedAt: Date | null;
  gameMode: GameMode; // ゲーム順序モード
  turnNumber: number; // 現在のアクティブ手番の通し番号（開始の最初の手番が0）
```

`GameStateWithTime` インターフェースに追記（`pausedAt` の下）:

```typescript
  pausedAt: string | null;
  gameMode: string;  // 'normal' | 'catan'
  phase: number;     // 0=通常, 1|2=カタンのフェーズ
```

- [ ] **Step 2: 型チェック**

Run: `cd frontend && npx tsc --noEmit`
Expected: `useGameState.ts`/`GameTimer.tsx` 等で「gameMode/turnNumber が無い」型エラーが出る（後続タスクで解消）。**この時点では型エラーが残ってよい**ためコミットは Task 8 とまとめる。

> 注: Task 7 単体ではビルドが通らない。Task 8（フォールバック実装）まで完了してからコミットする。

---

### Task 8: useGameState（フォールバック）にカタン順序と setGameMode を実装

**Files:**
- Modify: `frontend/src/hooks/useGameState.ts`
- Test: `frontend/src/hooks/__tests__/useGameState.catanMode.test.ts`（新規）

**Interfaces:**
- Consumes: `getCatanPlayerIndex`（Task 2）, `GameMode`/`DEFAULT_GAME_MODE`（Task 7）
- Produces: hook 戻り値に `setGameMode(mode: GameMode): void` を追加。`switchToNextPlayer` がカタン時は `turnNumber` を進めて蛇腹順で次手番を決める。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// frontend/src/hooks/__tests__/useGameState.catanMode.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState カタンモード', () => {
  it('setGameModeでcatanに切替できる', () => {
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setGameMode('catan'));
    expect(result.current.gameState.gameMode).toBe('catan');
  });

  it('4人カタン: 開始→次へ で 1,2,3,4,3,2,1 の順に進む', () => {
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setGameMode('catan')); // 4人デフォルト
    const indices: number[] = [];
    // 開始（最初の手番 t=0）
    act(() => result.current.switchToNextPlayer());
    for (let i = 0; i < 7; i++) {
      const activeId = result.current.gameState.activePlayerId;
      indices.push(result.current.gameState.players.findIndex(p => p.id === activeId));
      act(() => result.current.switchToNextPlayer());
    }
    // t=0..6 のindex（最後のswitchでt=7=フェーズ2 index0へ移行）
    expect(indices).toEqual([0, 1, 2, 3, 2, 1, 0]);
  });

  it('通常モードは従来どおり循環（4人: 0,1,2,3,0）', () => {
    const { result } = renderHook(() => useGameState());
    const indices: number[] = [];
    act(() => result.current.switchToNextPlayer()); // 開始 index0
    for (let i = 0; i < 4; i++) {
      const activeId = result.current.gameState.activePlayerId;
      indices.push(result.current.gameState.players.findIndex(p => p.id === activeId));
      act(() => result.current.switchToNextPlayer());
    }
    expect(indices).toEqual([0, 1, 2, 3, 0]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd frontend && npx vitest run src/hooks/__tests__/useGameState.catanMode.test.ts`
Expected: FAIL（`setGameMode` 未定義 / 順序不一致）

- [ ] **Step 3: 実装**（`frontend/src/hooks/useGameState.ts`）

import を追加（先頭付近）:

```typescript
import type { GameState, Player, TimerMode, GameMode } from '../types/GameState';
import {
  DEFAULT_PLAYER_COUNT,
  DEFAULT_TIMER_MODE,
  DEFAULT_INITIAL_TIME_SECONDS,
  DEFAULT_GAME_MODE,
  GameStateValidator
} from '../types/GameState';
import { getCatanPlayerIndex } from '../utils/turnSequence';
```

`createDefaultGameState()` の return に追記:

```typescript
    lastUpdatedAt: new Date(),
    pausedAt: null,
    gameMode: DEFAULT_GAME_MODE,
    turnNumber: 0
```

`setPlayerCount` の return（人数変更時）に `turnNumber: 0` を追加:

```typescript
      return {
        ...prev,
        players: newPlayers,
        activePlayerId: null,
        isPaused: false,
        pausedAt: null,
        turnNumber: 0,
        lastUpdatedAt: new Date()
      };
```

`setTimerMode` の直後に `setGameMode` を追加:

```typescript
  /**
   * ゲームモードを設定（カタン/通常）。ゲーム開始前のみ呼ばれる想定。
   */
  const setGameMode = useCallback((mode: GameMode) => {
    setGameState((prev) => ({
      ...prev,
      gameMode: mode,
      turnNumber: 0,
      lastUpdatedAt: new Date()
    }));
  }, []);
```

`switchToNextPlayer` を次の実装に置き換え:

```typescript
  const switchToNextPlayer = useCallback(() => {
    setGameState((prev) => {
      const len = prev.players.length;
      const currentIndex = prev.activePlayerId
        ? prev.players.findIndex(p => p.id === prev.activePlayerId)
        : -1;

      // 開始（アクティブ未設定）なら最初の手番 t=0、それ以外は turnNumber+1
      const starting = currentIndex === -1;
      const nextTurnNumber = starting ? 0 : prev.turnNumber + 1;

      // カタン: 蛇腹/通常順を純粋関数で算出。通常: 従来の循環
      const nextIndex = prev.gameMode === 'catan'
        ? getCatanPlayerIndex(nextTurnNumber, len)
        : (starting ? 0 : (currentIndex + 1) % len);

      const nextPlayerId = prev.players[nextIndex].id;
      const now = new Date();
      return {
        ...prev,
        activePlayerId: nextPlayerId,
        turnNumber: nextTurnNumber,
        players: prev.players.map(p => ({
          ...p,
          isActive: p.id === nextPlayerId,
          turnStartedAt: p.id === nextPlayerId ? now : null,
          totalPausedDuration: p.id === nextPlayerId ? 0 : (p.totalPausedDuration ?? 0)
        })),
        lastUpdatedAt: now
      };
    });
  }, []);
```

`resetGame` の return に `turnNumber: 0` を追加（`gameMode` は `...prev` で維持される）:

```typescript
      activePlayerId: null,
      isPaused: true,
      pausedAt: null,
      turnNumber: 0,
      lastUpdatedAt: new Date()
```

return オブジェクトに `setGameMode` を追加:

```typescript
    setTimerMode,
    setGameMode,
    resetGame,
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd frontend && npx vitest run src/hooks/__tests__/useGameState.catanMode.test.ts`
Expected: PASS（3ケース）

- [ ] **Step 5: 型チェック＆既存hookテスト**

Run: `cd frontend && npx tsc --noEmit && npx vitest run src/hooks`
Expected: 型エラーなし（`GameTimer.tsx` は Task 9 で対応するため、もし `GameTimer` 関連の型エラーが出る場合は Task 9 完了まで残る）。hookテストはパス。

> 注: `GameTimer.tsx` が `gameMode`/`turnNumber` を未参照なら型エラーは出ない。出る場合は Task 9 とまとめてコミットする。

- [ ] **Step 6: コミット**

```bash
git add frontend/src/types/GameState.ts frontend/src/hooks/useGameState.ts frontend/src/hooks/__tests__/useGameState.catanMode.test.ts
git commit -m "$(cat <<'EOF'
カタンモード: フロント型とフォールバックモードのカタン順序を実装

## 実装内容
- GameState/GameStateWithTimeにgameMode/turnNumber/phase追加（型）
- useGameStateにsetGameModeを追加、switchToNextPlayerをカタン対応
- reset/人数変更でturnNumberを0にリセット

## テスト結果
- useGameState.catanMode.test.ts 3ケースパス、hook既存テストパス

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase E: フロントエンドUI（GameTimer）

### Task 9: カタンモード切替トグル＋フェーズバッジ＋カードジャンプ無効化

**Files:**
- Modify: `frontend/src/components/GameTimer.tsx`
- Modify: `frontend/src/components/GameTimer.css`
- Test: `frontend/src/components/__tests__/GameTimer.catanMode.test.tsx`（新規）

**Interfaces:**
- Consumes: `fallbackState.setGameMode`（Task 8）, `getCatanPhase`（Task 2）, `updateGame`（既存, Task 5でgameMode対応）, `serverState.gameMode`/`serverState.phase`（Task 6）
- 振る舞い:
  - 設定カードに「カタンモード」トグル（`data-testid="game-mode-toggle"`）。`disabled={isGameStarted}`。
  - カタンモード中かつゲーム進行中、ヘッダーにフェーズバッジ（`data-testid="phase-badge"`、テキスト「フェーズ1」/「フェーズ2」）。
  - カタンモード中はカードクリックジャンプを無効化（通常モードは従来どおり）。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// frontend/src/components/__tests__/GameTimer.catanMode.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GameTimer } from '../GameTimer';

// テスト環境ではフォールバックモード（VITEST）でレンダリングされる前提
describe('GameTimer カタンモードUI', () => {
  it('設定にカタンモードトグルが表示される', () => {
    render(<GameTimer />);
    expect(screen.getByTestId('game-mode-toggle')).toBeInTheDocument();
  });

  it('カタンON＋ゲーム開始でフェーズバッジ（フェーズ1）が表示される', () => {
    render(<GameTimer />);
    fireEvent.click(screen.getByTestId('game-mode-toggle')); // カタンON
    fireEvent.click(screen.getByTestId('start-game-button')); // 開始（t=0）
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toHaveTextContent('フェーズ1');
  });

  it('未開始ではフェーズバッジは表示されない', () => {
    render(<GameTimer />);
    fireEvent.click(screen.getByTestId('game-mode-toggle'));
    expect(screen.queryByTestId('phase-badge')).not.toBeInTheDocument();
  });
});
```

> 注: 既存の `GameTimer` テスト（`frontend/src/components/__tests__/`）のレンダリング方法（プロバイダ/ラッパの有無、`start-game-button` の `data-testid`）を確認し、それに合わせて import やラッパを調整すること。`start-game-button` は `GameTimer.tsx:525` に存在。

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd frontend && npx vitest run src/components/__tests__/GameTimer.catanMode.test.tsx`
Expected: FAIL（`game-mode-toggle` 未存在）

- [ ] **Step 3: 実装**（`frontend/src/components/GameTimer.tsx`）

(3-1) import に追加（先頭の import 群）:

```typescript
import { getCatanPhase } from '../utils/turnSequence';
```

(3-2) `isGameStarted` 定義の後あたりに、現在のモード/フェーズ算出を追加:

```typescript
  // カタンモード関連の表示用算出（フォールバック/通常モード両対応）
  const currentGameMode = (import.meta.env.VITEST || isInFallbackMode)
    ? fallbackState.gameState.gameMode
    : (serverGameState.serverState?.gameMode ?? 'normal');

  const currentPhase = (import.meta.env.VITEST || isInFallbackMode)
    ? getCatanPhase(fallbackState.gameState.turnNumber, fallbackState.gameState.players.length)
    : (serverGameState.serverState?.phase ?? 0);

  const isCatanMode = currentGameMode === 'catan';
```

(3-3) `handleTimerModeChange` の近くに `handleGameModeChange` を追加:

```typescript
  const handleGameModeChange = React.useCallback(async (checked: boolean) => {
    const mode = checked ? 'catan' : 'normal';
    if (import.meta.env.MODE === 'test' || isInFallbackMode) {
      fallbackState.setGameMode(mode);
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot change game mode');
      return;
    }
    const result = await updateGame(etag, { gameMode: mode });
    if (result && 'etag' in result) {
      updateEtag(result.etag);
      serverGameState.updateFromServer(result);
      clearConflictMessage();
    }
  }, [isInFallbackMode, etag, updateGame, fallbackState, updateEtag, clearConflictMessage, serverGameState]);
```

(3-4) ヘッダーにフェーズバッジを追加。`<div className="sticky-header-content" ...>` の直後（`sticky-header-info` の前）に挿入:

```tsx
            {isCatanMode && isGameActive && (
              <span className="phase-badge" data-testid="phase-badge">
                フェーズ{currentPhase}
              </span>
            )}
```

(3-5) 設定グリッドにカタンモードトグルを追加。プレイヤー人数ドロップダウンの `setting-item` の直後（プレイヤー名変更セクションの前）に挿入:

```tsx
              {/* カタンモード切替（ゲーム開始前のみ） */}
              <div className="setting-item">
                <label className="setting-label">カタンモード</label>
                <label className="toggle-switch-enhanced">
                  <input
                    type="checkbox"
                    checked={isCatanMode}
                    onChange={(e) => handleGameModeChange(e.target.checked)}
                    disabled={isGameStarted}
                    title={isGameStarted ? 'ゲーム開始後はカタンモードを変更できません' : ''}
                    data-testid="game-mode-toggle"
                    aria-label="カタンモード切替"
                  />
                  <span className="toggle-slider">
                    <span className="toggle-label-left">通常</span>
                    <span className="toggle-label-right">カタン</span>
                  </span>
                </label>
              </div>
```

(3-6) カタン中はカードジャンプを無効化。`handleSelectActivePlayer` の先頭にガードを追加:

```typescript
  const handleSelectActivePlayer = React.useCallback(async (playerIndex: number) => {
    if (isCatanMode) return; // カタンモードでは手番ジャンプ不可
    const activeIndex = serverGameState.serverState?.activePlayerIndex ?? -1;
```

`handleSelectActivePlayer` の依存配列に `isCatanMode` を追加:

```typescript
  }, [isCatanMode, etag, switchTurn, serverGameState, updateEtag, clearConflictMessage]);
```

`getCardClickProps` の先頭にもガードを追加（クリック不可にする）:

```typescript
  const getCardClickProps = React.useCallback((playerIndex: number, isActive: boolean, playerName: string) => {
    if (isActive || isCatanMode) return {};
```

その依存配列にも `isCatanMode` を追加（既存依存に合わせて末尾に追記）。

フォールバックモードのプレイヤーカードにある「アクティブに設定」ボタンの `disabled` にカタン条件を追加（`GameTimer.tsx:600` 付近の `disabled={isDisabled}`）:

```tsx
                        onClick={() => fallbackState.setActivePlayer(player.id)}
                        disabled={isDisabled || isCatanMode}
```

(3-7) `GameTimer.css` にバッジのスタイルを追加:

```css
/* カタンモード フェーズバッジ */
.phase-badge {
  display: inline-block;
  padding: 2px 10px;
  margin-right: 8px;
  border-radius: 12px;
  background-color: #2563eb;
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `cd frontend && npx vitest run src/components/__tests__/GameTimer.catanMode.test.tsx`
Expected: PASS（3ケース）

- [ ] **Step 5: 型チェック＋フロント全テスト**

Run: `cd frontend && npx tsc --noEmit && npx vitest run`
Expected: 型エラーなし、全テストPASS（リグレッションなし）

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/GameTimer.tsx frontend/src/components/GameTimer.css frontend/src/components/__tests__/GameTimer.catanMode.test.tsx
git commit -m "$(cat <<'EOF'
カタンモード: 設定トグル・フェーズバッジ・カードジャンプ無効化を実装

## 実装内容
- 設定カードにカタンモードトグル（開始前のみ変更可）
- ヘッダーにフェーズバッジ（カタン中かつ進行中のみ）
- カタンモード中はカードクリック/アクティブ設定による手番ジャンプを無効化
- フォールバック/通常モード両対応

## テスト結果
- GameTimer.catanMode.test.tsx 3ケースパス、frontend全テストパス

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase F: E2E と実装完了処理

### Task 10: E2Eテスト（カタンモードの順序とフェーズ表示）

**Files:**
- Create: `e2e/specs/catan-mode.spec.ts`
- 必要に応じて Modify: 既存 Page Object（`e2e/` 配下。`.sticky-header` セレクタ等）

**Interfaces:**
- Consumes: `data-testid="game-mode-toggle"`, `data-testid="start-game-button"`, `data-testid="phase-badge"`, `data-testid="next-player-btn"` 相当（既存の次へボタンの testid を確認）, プレイヤーカード `data-testid="player-card-N"`。

- [ ] **Step 1: 既存E2Eの起動方法とセレクタを確認**

Run: `ls e2e/specs && sed -n '1,60p' playwright.config.ts`
確認事項: ベースURL、`webServer` 設定、既存テストの `data-testid` 利用パターン（特に次へボタンとアクティブプレイヤー表示）。

- [ ] **Step 2: E2Eテストを書く**

```typescript
// e2e/specs/catan-mode.spec.ts
import { test, expect } from '@playwright/test';

test.describe('カタンモード', () => {
  test('カタンON→開始でフェーズ1バッジが表示され、蛇腹順に進む', async ({ page }) => {
    await page.goto('/');

    // カタンモードON（開始前）
    await page.getByTestId('game-mode-toggle').check();

    // ゲーム開始
    await page.getByTestId('start-game-button').click();

    // フェーズ1バッジ
    await expect(page.getByTestId('phase-badge')).toHaveText(/フェーズ1/);

    // ヘッダーの現在プレイヤー名が「プレイヤー1」相当であること
    await expect(page.locator('.sticky-header-player')).toContainText('プレイヤー1');
  });
});
```

> 注: アクティブプレイヤー名の確認方法・「次へ」ボタンの testid は既存テストに合わせる。フェーズ2への遷移（4人で7回「次へ」を押すと `フェーズ2` バッジになる）を検証するアサーションを、既存の次へボタン操作パターンが分かり次第追加すること。最低限、上記のフェーズ1表示と開始時プレイヤーは検証する。

- [ ] **Step 3: E2E実行**

Run: `npx playwright test e2e/specs/catan-mode.spec.ts`
Expected: PASS

- [ ] **Step 4: 全E2Eでリグレッション確認**

Run: `npx playwright test`
Expected: 既存E2EもPASS（リグレッションなし）

- [ ] **Step 5: コミット**

```bash
git add e2e/specs/catan-mode.spec.ts
git commit -m "$(cat <<'EOF'
E2Eテスト完了: カタンモード

## 実装内容
- e2e/specs/catan-mode.spec.ts を追加
- カタンON→開始でフェーズ1バッジ表示・開始プレイヤー検証

## テスト結果
- catan-mode.spec.ts パス、全E2Eパス（リグレッションなし）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: 全体テスト確認と完了コミット

- [ ] **Step 1: バックエンド全テスト**

Run: `cd api && npx jest`
Expected: 全PASS

- [ ] **Step 2: フロント全テスト＋型チェック＋lint**

Run: `cd frontend && npx tsc --noEmit && npx vitest run && npm run lint`
Expected: 型エラーなし、全テストPASS、lintエラーなし

- [ ] **Step 3: E2E全テスト**

Run: `npx playwright test`
Expected: 全PASS

- [ ] **Step 4: 最終コミット**（差分が残っていれば。例: lint修正など）

```bash
git add -p   # 関連差分のみ選択（-A/. は使わない）
git commit -m "$(cat <<'EOF'
実装完了: カタンモード（ターン順序バリアント）

## 実装完了サマリー
- フェーズ1=蛇腹順（2N-1ターン）、フェーズ2=通常順（プレイヤー1仕切り直し）
- 設定トグルで切替（開始前のみ）、ヘッダーにフェーズバッジ
- フォールバック/通常(API)モード両対応、カタン中は手番ジャンプ無効

## 全テスト結果
- api(jest) / frontend(vitest) / E2E(playwright) 全パス、リグレッションなし

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review（プラン作成者によるチェック結果）

- **仕様カバレッジ**: ①蛇腹順フェーズ1（Task 1,2,4,8）②フェーズ2通常順・プレイヤー1仕切り直し（純粋関数のphase2式）③フェーズ1終了で自動フェーズ2移行（`turnNumber` がL1を超えると自動でphase2、UI側の特別処理不要）④フェーズのヘッダー明示（Task 6,9）⑤開始前のみ切替（Task 9 `disabled={isGameStarted}`）⑥2〜6人対応（Task 1,2 のテスト）⑦両モード対応（フォールバック=Task 8、API=Task 4,6）。すべてタスクに対応済み。
- **プレースホルダ**: 実コード/実コマンドを記載。E2E（Task 10）と一部既存テストヘルパ参照箇所は「既存パターンに合わせる」注記付き（既存ファイルの構造に依存するため）。
- **型整合性**: `getCatanPlayerIndex(turnNumber, playerCount)` / `getCatanPhase` / `getCatanPhase1Length` のシグネチャはフロント・バック・全呼び出し箇所で一致。`gameMode`/`turnNumber`/`phase` のフィールド名は型定義・エンティティ・API・UI で統一。
- **設計判断**: カタンモード中の手番ジャンプ（`targetPlayerIndex`）は無効化（Global Constraints / Task 4,9）。`reset` は通常モードへ戻る（`createDefaultGameState` 準拠、バックエンド）／フォールバックは `gameMode` 維持で `turnNumber=0`。

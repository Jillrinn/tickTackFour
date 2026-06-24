# フォールバックモード撤去 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `GameTimer.tsx` の二重モード（フォールバック/通常）を撤去し、通常モード（バックエンドAPI＋ポーリング）単一経路へ単純化する。

**Architecture:** テストハーネス先行アプローチ。先に `useServerGameState` をモックする共通テストハーネスを作り、16個のコンポーネントテストをそこへ移行（この間フォールバックは温存しグリーン維持）。その後 `GameTimer.tsx` から `isInFallbackMode` / `import.meta.env.VITEST` / `MODE === 'test'` 分岐と警告UIを撤去し、最後にフック本体（`useGameState` / `useFallbackMode` /（確認後）`useGameTimer`）と専用テストを削除する。

**Tech Stack:** React 18 + TypeScript, Vitest + @testing-library/react, Playwright（E2E）

## Global Constraints

- パッケージ管理は `frontend/` 配下で `npm`。テストは `npm test`（Vitest, watchなしは `npm test -- --run`）。
- コミットメッセージは日本語。`git add -A` / `git add .` 禁止。関連ファイルのみ選択的にステージ。
- 設計の信頼できる情報源はバックエンド。フロントの状態変化検証は「APIが正しい引数で呼ばれたか」検証へ置換する。
- 既存の `GameStateWithTime` 型（`frontend/src/types/GameState.ts:68`）: `players: Array<{ name: string; elapsedSeconds: number }>`, `activePlayerIndex: number`, `timerMode: 'countup'|'countdown'`, `countdownSeconds: number`, `isPaused: boolean`, `etag: string`, `turnStartedAt: string|null`, `pausedAt: string|null`, `gameMode: string`, `phase: number`。
- `useServerGameState` の戻り値キー（`frontend/src/hooks/useServerGameState.ts:318-329`）: `serverState`, `displayTime`, `updateFromServer`, `formatTime`, `getLongestTimePlayer`, `getTotalGameTime`, `formatGameTime`, `getCurrentTurnTime`, `syncWithServer`, `updatePlayerNameOptimistic`。
- `useGameApi` の戻り値キー（`frontend/src/hooks/useGameApi.ts:47`）: `switchTurn`, `pauseGame`, `resumeGame`, `resetGame`, `updateGame`, `updatePlayerName`（いずれも `async`、第1引数は `etag: string`）。
- 設計ドキュメント: `docs/superpowers/specs/2026-06-23-remove-fallback-mode-design.md`。

---

## ファイル構成

**新規作成:**
- `frontend/src/test/createMockServerGameState.ts` — `useServerGameState` 戻り値のモックファクトリ。
- `frontend/src/test/renderGameTimer.tsx` — モック設定済みで `<GameTimer />` を描画するハーネス。

**改修:**
- `frontend/src/components/GameTimer.tsx` — 分岐・警告UI・`useGameTimer` 呼び出し撤去。
- `frontend/src/components/__tests__/GameTimer.*.test.tsx`（16ファイル）— 新ハーネスへ移行。
- `e2e/specs/player-name-persistence.spec.ts` — フォールバック非依存へ。

**削除:**
- `frontend/src/hooks/useGameState.ts`、`frontend/src/hooks/useFallbackMode.ts`、（確認後）`frontend/src/hooks/useGameTimer.ts`。
- `frontend/src/hooks/__tests__/useGameState.*.test.ts`（15）＋ `useFallbackMode.test.ts` ＋（フック削除時）`useGameTimer.test.ts`。

---

## Task 1: モックファクトリ `createMockServerGameState`

**Files:**
- Create: `frontend/src/test/createMockServerGameState.ts`
- Test: `frontend/src/test/__tests__/createMockServerGameState.test.ts`

**Interfaces:**
- Consumes: `GameStateWithTime`（`../types/GameState`）。
- Produces:
  - `createMockServerState(overrides?: Partial<GameStateWithTime>): GameStateWithTime`
  - `createMockServerGameState(overrides?: { serverState?: Partial<GameStateWithTime> | null; displayTime?: number; turnTime?: number }): MockServerGameState`
  - 戻り値型 `MockServerGameState` は `useServerGameState` の戻り値と同一キーを持ち、関数はすべて `vi.fn()`。

- [ ] **Step 1: 失敗するテストを書く**

```ts
// frontend/src/test/__tests__/createMockServerGameState.test.ts
import { describe, test, expect } from 'vitest';
import { createMockServerState, createMockServerGameState } from '../createMockServerGameState';

describe('createMockServerState', () => {
  test('既定で4人・未開始・カウントアップの状態を返す', () => {
    const s = createMockServerState();
    expect(s.players).toHaveLength(4);
    expect(s.activePlayerIndex).toBe(-1);
    expect(s.timerMode).toBe('countup');
    expect(s.isPaused).toBe(true);
    expect(typeof s.etag).toBe('string');
  });

  test('overridesで部分上書きできる', () => {
    const s = createMockServerState({ activePlayerIndex: 1, isPaused: false });
    expect(s.activePlayerIndex).toBe(1);
    expect(s.isPaused).toBe(false);
    expect(s.players).toHaveLength(4); // 既定維持
  });
});

describe('createMockServerGameState', () => {
  test('useServerGameStateと同じキーを持ち、関数はモックである', () => {
    const m = createMockServerGameState();
    expect(m.serverState).not.toBeNull();
    expect(typeof m.formatTime).toBe('function');
    expect(m.formatTime(65)).toBe('01:05');
    expect(typeof m.getLongestTimePlayer).toBe('function');
    expect(typeof m.syncWithServer).toBe('function');
  });

  test('serverState: null を渡せる（ゲーム未ロード相当）', () => {
    const m = createMockServerGameState({ serverState: null });
    expect(m.serverState).toBeNull();
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && npm test -- --run src/test/__tests__/createMockServerGameState.test.ts`
Expected: FAIL（モジュール未作成エラー）

- [ ] **Step 3: 最小実装を書く**

```ts
// frontend/src/test/createMockServerGameState.ts
import { vi } from 'vitest';
import type { GameStateWithTime } from '../types/GameState';

export interface MockServerGameState {
  serverState: GameStateWithTime | null;
  displayTime: number;
  updateFromServer: ReturnType<typeof vi.fn>;
  formatTime: (seconds: number) => string;
  getLongestTimePlayer: ReturnType<typeof vi.fn>;
  getTotalGameTime: ReturnType<typeof vi.fn>;
  formatGameTime: (seconds: number) => string;
  getCurrentTurnTime: ReturnType<typeof vi.fn>;
  syncWithServer: ReturnType<typeof vi.fn>;
  updatePlayerNameOptimistic: ReturnType<typeof vi.fn>;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatGameTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function createMockServerState(
  overrides: Partial<GameStateWithTime> = {}
): GameStateWithTime {
  const players = overrides.players ?? [
    { name: 'プレイヤー1', elapsedSeconds: 0 },
    { name: 'プレイヤー2', elapsedSeconds: 0 },
    { name: 'プレイヤー3', elapsedSeconds: 0 },
    { name: 'プレイヤー4', elapsedSeconds: 0 },
  ];
  return {
    players,
    activePlayerIndex: -1,
    timerMode: 'countup',
    countdownSeconds: 600,
    isPaused: true,
    etag: 'mock-etag',
    turnStartedAt: null,
    pausedAt: null,
    gameMode: 'normal',
    phase: 0,
    ...overrides,
    players,
  };
}

export function createMockServerGameState(
  overrides: {
    serverState?: Partial<GameStateWithTime> | null;
    displayTime?: number;
    turnTime?: number;
  } = {}
): MockServerGameState {
  const serverState =
    overrides.serverState === null
      ? null
      : createMockServerState(overrides.serverState ?? {});
  const longest =
    serverState && serverState.players.some((p) => p.elapsedSeconds > 0)
      ? (() => {
          const max = Math.max(...serverState.players.map((p) => p.elapsedSeconds));
          const idx = serverState.players.findIndex((p) => p.elapsedSeconds === max);
          return { ...serverState.players[idx], index: idx };
        })()
      : null;
  const total = serverState
    ? serverState.players.reduce((t, p) => t + p.elapsedSeconds, 0)
    : 0;
  return {
    serverState,
    displayTime: overrides.displayTime ?? 0,
    updateFromServer: vi.fn(),
    formatTime,
    getLongestTimePlayer: vi.fn(() => longest),
    getTotalGameTime: vi.fn(() => total),
    formatGameTime,
    getCurrentTurnTime: vi.fn(() => overrides.turnTime ?? 0),
    syncWithServer: vi.fn(async () => serverState),
    updatePlayerNameOptimistic: vi.fn(),
  };
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd frontend && npm test -- --run src/test/__tests__/createMockServerGameState.test.ts`
Expected: PASS（4テスト）

- [ ] **Step 5: コミット**

```bash
git add frontend/src/test/createMockServerGameState.ts frontend/src/test/__tests__/createMockServerGameState.test.ts
git commit -m "テストハーネス: useServerGameStateモックファクトリを追加"
```

---

## Task 2: 描画ハーネス `renderGameTimer`

**Files:**
- Create: `frontend/src/test/renderGameTimer.tsx`
- Test: `frontend/src/test/__tests__/renderGameTimer.test.tsx`

**Interfaces:**
- Consumes: `createMockServerGameState`（Task 1）、`GameTimer`（`../components/GameTimer`）。
- Produces:
  - `mockApi`: `{ switchTurn, pauseGame, resumeGame, resetGame, updateGame, updatePlayerName }` 各 `vi.fn()`（テストでスパイ）。
  - `renderGameTimer(options?: { serverState?: Partial<GameStateWithTime> | null; displayTime?: number; turnTime?: number }): RenderResult` — モックを設定して `<GameTimer />` を描画。
  - 各テストファイル先頭で必要な `vi.mock` 行（手順内に明記）。

- [ ] **Step 1: 失敗するテストを書く**

```tsx
// frontend/src/test/__tests__/renderGameTimer.test.tsx
import { describe, test, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderGameTimer, mockApi } from '../renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');

describe('renderGameTimer', () => {
  test('既定状態でGameTimerを描画できる', () => {
    renderGameTimer();
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();
  });

  test('serverStateを上書きして描画できる', () => {
    renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();
  });

  test('mockApiの各関数はモックである', () => {
    expect(typeof mockApi.switchTurn).toBe('function');
    expect(vi.isMockFunction(mockApi.switchTurn)).toBe(true);
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `cd frontend && npm test -- --run src/test/__tests__/renderGameTimer.test.tsx`
Expected: FAIL（`renderGameTimer` 未定義）

- [ ] **Step 3: 最小実装を書く**

> 注: `usePollingSync` はデフォルトエクスポートではなく名前付きエクスポート `usePollingSync`。`useGameApi` の `switchTurn` 等は成功時に最新 `serverState` を返す想定で `mockApi` に既定実装を与える。

```tsx
// frontend/src/test/renderGameTimer.tsx
import { vi } from 'vitest';
import { render, type RenderResult } from '@testing-library/react';
import type { GameStateWithTime } from '../types/GameState';
import { GameTimer } from '../components/GameTimer';
import { useServerGameState } from '../hooks/useServerGameState';
import { useGameApi } from '../hooks/useGameApi';
import { usePollingSync } from '../hooks/usePollingSync';
import { createMockServerGameState, createMockServerState } from './createMockServerGameState';

export const mockApi = {
  switchTurn: vi.fn(async () => createMockServerState()),
  pauseGame: vi.fn(async () => createMockServerState()),
  resumeGame: vi.fn(async () => createMockServerState()),
  resetGame: vi.fn(async () => createMockServerState()),
  updateGame: vi.fn(async () => createMockServerState()),
  updatePlayerName: vi.fn(async () => createMockServerState()),
};

export function renderGameTimer(options: {
  serverState?: Partial<GameStateWithTime> | null;
  displayTime?: number;
  turnTime?: number;
} = {}): RenderResult {
  Object.values(mockApi).forEach((fn) => fn.mockClear());

  vi.mocked(useServerGameState).mockReturnValue(createMockServerGameState(options));
  vi.mocked(useGameApi).mockReturnValue(mockApi as unknown as ReturnType<typeof useGameApi>);
  vi.mocked(usePollingSync).mockImplementation(() => undefined);

  return render(<GameTimer />);
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `cd frontend && npm test -- --run src/test/__tests__/renderGameTimer.test.tsx`
Expected: PASS（3テスト）

> この時点では `GameTimer.tsx` はまだ `import.meta.env.VITEST` 分岐で `fallbackState` を優先するため、`useServerGameState` モックは未使用でも描画は成立する（既定の `useGameState` が動く）。ハーネスは Task 12 の分岐撤去後に実効化する。描画が成立すればこのタスクはOK。

- [ ] **Step 5: コミット**

```bash
git add frontend/src/test/renderGameTimer.tsx frontend/src/test/__tests__/renderGameTimer.test.tsx
git commit -m "テストハーネス: renderGameTimer描画ヘルパーを追加"
```

---

## Task 3〜10: コンポーネントテスト16ファイルの移行

各ファイルで以下の**共通レシピ**を適用する。タスクは「ファイル群ごとに編集→当該テスト緑→コミット」の単位。

### 共通レシピ（全ファイル共通の機械的変換）

**A. 先頭のモックブロックを差し替える。** 旧:

```tsx
import { GameTimer } from '../GameTimer';
// フォールバックモードを強制（テスト用）
vi.mock('../../hooks/useFallbackMode', () => ({
  useFallbackMode: () => ({ isInFallbackMode: true, /* ... */ })
}));
```

新（`GameTimer` の直接 import と `render` 呼び出しは撤去し、ハーネス経由にする）:

```tsx
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
```

**B. `render(<GameTimer />)` を `renderGameTimer({ serverState: {...} })` に置換する。** その際、テストが前提にしている状態（アクティブプレイヤー、一時停止、経過秒、タイマーモード等）を `serverState` overrides で再現する。

**C. 「クリック後にインメモリー状態が変わる」アサーションは、`mockApi.<fn>` が期待引数で呼ばれた検証へ置換する。** 例:

```tsx
// 旧: クリック後に画面の秒数が増えることを検証していた
// 新:
fireEvent.click(screen.getByRole('button', { name: '次のプレイヤー' }));
expect(mockApi.switchTurn).toHaveBeenCalled();
```

**D. ファイル単体テストを実行して緑を確認 → コミット。**

Run（共通）: `cd frontend && npm test -- --run <該当ファイルパス>`

> **重要:** 各ファイルの具体的な `serverState` overrides と対象 `mockApi` 関数は、そのファイルの既存アサーションを読んで決定する。プレースホルダではなく、既存テストが今 `fallbackState` のどのメソッドを呼び/どの表示を検証しているかを 1:1 で写す。

### Task 3: 純描画テスト群A（4ファイル）

**Files (Modify):**
- `frontend/src/components/__tests__/GameTimer.uiSimplification.test.tsx`
- `frontend/src/components/__tests__/GameTimer.stickyHeader.test.tsx`
- `frontend/src/components/__tests__/GameTimer.buttonLayout.test.tsx`
- `frontend/src/components/__tests__/GameTimer.conditionalRendering.test.tsx`

- [ ] **Step 1:** 各ファイルに共通レシピ A・B を適用（既定 `serverState` で足りる純描画系。状態前提があるテストのみ overrides を付与）。
- [ ] **Step 2:** 実行: `cd frontend && npm test -- --run src/components/__tests__/GameTimer.uiSimplification.test.tsx src/components/__tests__/GameTimer.stickyHeader.test.tsx src/components/__tests__/GameTimer.buttonLayout.test.tsx src/components/__tests__/GameTimer.conditionalRendering.test.tsx` / Expected: PASS
- [ ] **Step 3:** コミット

```bash
git add frontend/src/components/__tests__/GameTimer.uiSimplification.test.tsx frontend/src/components/__tests__/GameTimer.stickyHeader.test.tsx frontend/src/components/__tests__/GameTimer.buttonLayout.test.tsx frontend/src/components/__tests__/GameTimer.conditionalRendering.test.tsx
git commit -m "テスト移行: 純描画テスト群AをrenderGameTimerハーネスへ移行"
```

### Task 4: 純描画テスト群B（プレイヤー名・人数、4ファイル）

**Files (Modify):**
- `frontend/src/components/__tests__/GameTimer.playerName.test.tsx`
- `frontend/src/components/__tests__/GameTimer.playerCountDropdown.test.tsx`
- `frontend/src/components/__tests__/GameTimer.playerNameHistory.test.tsx`
- `frontend/src/components/__tests__/GameTimer.playerNameHistory.responsive.test.tsx`

- [ ] **Step 1:** 共通レシピ A・B・C を適用。プレイヤー名変更系は `mockApi.updatePlayerName` 呼び出し検証へ置換。人数変更は `mockApi.updateGame` 呼び出し検証へ。`usePlayerNameHistory` を使うテストは既存のモック方針を維持。
- [ ] **Step 2:** 実行: `cd frontend && npm test -- --run src/components/__tests__/GameTimer.playerName.test.tsx src/components/__tests__/GameTimer.playerCountDropdown.test.tsx src/components/__tests__/GameTimer.playerNameHistory.test.tsx src/components/__tests__/GameTimer.playerNameHistory.responsive.test.tsx` / Expected: PASS
- [ ] **Step 3:** コミット

```bash
git add frontend/src/components/__tests__/GameTimer.playerName.test.tsx frontend/src/components/__tests__/GameTimer.playerCountDropdown.test.tsx frontend/src/components/__tests__/GameTimer.playerNameHistory.test.tsx frontend/src/components/__tests__/GameTimer.playerNameHistory.responsive.test.tsx
git commit -m "テスト移行: プレイヤー名・人数テスト群Bをハーネスへ移行"
```

### Task 5: タイマー表示テスト群（4ファイル）

**Files (Modify):**
- `frontend/src/components/__tests__/GameTimer.timerSync.test.tsx`
- `frontend/src/components/__tests__/GameTimer.timerModeToggle.test.tsx`
- `frontend/src/components/__tests__/GameTimer.timerModeUpdate.test.tsx`
- `frontend/src/components/__tests__/GameTimer.playerNameHistory.saveOnReset.test.tsx`

- [ ] **Step 1:** 共通レシピを適用。タイマー表示は `renderGameTimer({ serverState: { activePlayerIndex, players: [...elapsedSeconds] }, displayTime, turnTime })` で表示値を制御。タイマーモード切替は `mockApi.updateGame` 呼び出し検証へ。リセット時保存は `mockApi.resetGame` ＋ 名前履歴保存の検証へ。
- [ ] **Step 2:** 実行: `cd frontend && npm test -- --run src/components/__tests__/GameTimer.timerSync.test.tsx src/components/__tests__/GameTimer.timerModeToggle.test.tsx src/components/__tests__/GameTimer.timerModeUpdate.test.tsx src/components/__tests__/GameTimer.playerNameHistory.saveOnReset.test.tsx` / Expected: PASS
- [ ] **Step 3:** コミット

```bash
git add frontend/src/components/__tests__/GameTimer.timerSync.test.tsx frontend/src/components/__tests__/GameTimer.timerModeToggle.test.tsx frontend/src/components/__tests__/GameTimer.timerModeUpdate.test.tsx frontend/src/components/__tests__/GameTimer.playerNameHistory.saveOnReset.test.tsx
git commit -m "テスト移行: タイマー表示テスト群をハーネスへ移行"
```

### Task 6: 操作・統合テスト群（4ファイル）

**Files (Modify):**
- `frontend/src/components/__tests__/GameTimer.buttonStates.test.tsx`
- `frontend/src/components/__tests__/GameTimer.buttonResponseOptimization.test.tsx`
- `frontend/src/components/__tests__/GameTimer.integration.test.tsx`
- `frontend/src/components/__tests__/GameTimer.resetIntegration.test.tsx`

- [ ] **Step 1:** 共通レシピ A・B・C を適用。ボタン状態（disabled 等）は `serverState`（`activePlayerIndex` / `isPaused` / `elapsedSeconds`）で再現。操作結果は `mockApi.switchTurn` / `pauseGame` / `resumeGame` / `resetGame` の呼び出し・引数検証へ置換。`resetIntegration` の「`useGameTimer` 停止」系は、`serverState.isPaused: true` / `activePlayerIndex: -1` を与えてタイマー表示が増加しないことの検証へ読み替える（`useGameTimer` への直接依存は削除）。
- [ ] **Step 2:** 実行: `cd frontend && npm test -- --run src/components/__tests__/GameTimer.buttonStates.test.tsx src/components/__tests__/GameTimer.buttonResponseOptimization.test.tsx src/components/__tests__/GameTimer.integration.test.tsx src/components/__tests__/GameTimer.resetIntegration.test.tsx` / Expected: PASS
- [ ] **Step 3:** コミット

```bash
git add frontend/src/components/__tests__/GameTimer.buttonStates.test.tsx frontend/src/components/__tests__/GameTimer.buttonResponseOptimization.test.tsx frontend/src/components/__tests__/GameTimer.integration.test.tsx frontend/src/components/__tests__/GameTimer.resetIntegration.test.tsx
git commit -m "テスト移行: 操作・統合テスト群をハーネスへ移行"
```

### Task 7: 移行後の全コンポーネントテスト緑確認

- [ ] **Step 1:** 実行: `cd frontend && npm test -- --run src/components/__tests__/`
- [ ] **Step 2:** Expected: 全 `GameTimer.*` テスト PASS（この時点ではフォールバック本体は未削除だが、テストはハーネス経由でフォールバックに依存しない）。失敗があれば該当ファイルのレシピ適用漏れを修正。
- [ ] **Step 3:** （修正があれば）コミット

```bash
git commit -am "テスト移行: コンポーネントテストの移行漏れを修正"
```

---

## Task 11: `useGameTimer` の参照精査（削除可否の確定）

**Files:**
- Inspect: `frontend/src/components/GameTimer.tsx`, `frontend/src/components/__tests__/GameTimer.resetIntegration.test.tsx`, `frontend/src/hooks/__tests__/useGameTimer.test.ts`

- [ ] **Step 1:** 参照を洗う。

Run: `cd frontend && grep -rn "useGameTimer" src --include="*.ts" --include="*.tsx"`
Expected: `GameTimer.tsx`（呼び出し）と `useGameTimer.test.ts`（フック単体テスト）と `resetIntegration.test.tsx`（テスト名のみ）のみ。本番では `GameTimer.tsx` 以外から使われていないことを確認。

- [ ] **Step 2:** 結論を記録（コード変更なし）。本番参照が `GameTimer.tsx` のみなら、Task 12 で呼び出し撤去・Task 14 でフック＆テスト削除と確定。想定外の参照があれば、その箇所の扱いを本計画末尾の「留意」に追記してから進む。

> このタスクは調査のみ。コミット不要。

---

## Task 12: `GameTimer.tsx` からフォールバック分岐・警告UIを撤去

**Files:**
- Modify: `frontend/src/components/GameTimer.tsx`

- [ ] **Step 1: import とフック呼び出しを撤去**

`GameTimer.tsx` 冒頭の以下を削除:
```tsx
import { useGameState } from '../hooks/useGameState';
import { useFallbackMode } from '../hooks/useFallbackMode';
import { useGameTimer } from '../hooks/useGameTimer';
```
本体内の以下を削除:
- `const fallbackState = useGameState();`（63行付近）
- `const { isInFallbackMode, activateFallbackMode, deactivateFallbackMode } = useFallbackMode();`（75行付近）
- `useGameTimer( ... )` ブロック（170〜180行付近）

- [ ] **Step 2: 派生値を `serverGameState` 単一経路へ集約**

`(import.meta.env.VITEST || isInFallbackMode) ? fallbackState.X : serverGameState.Y` 形式を、すべて通常モード側（`serverGameState.Y` / `serverGameState.serverState?...`）に置換する。対象（行は目安）:
- `gameState`（123行）→ `serverGameState.serverState`
- `formatTime`（124行）→ `serverGameState.formatTime`
- `isPaused`（127行）→ `serverGameState.serverState?.isPaused ?? false`
- `isGameActive`（132行）→ `serverGameState.serverState ? serverGameState.serverState.activePlayerIndex !== -1 : false`
- `isGameStarted`（140行）→ 既存の通常モード分岐式に一本化
- `longestPlayer`（159行）→ `serverGameState.getLongestTimePlayer()`
- `timedOutPlayerId`（156行）→ `null`（通常モードに同等APIが無いため。タイムアウト通知UIが `timedOutPlayerId` のみに依存する場合は当該UIも削除）

- [ ] **Step 3: テスト分岐・警告UI・フォールバック専用描画を撤去**

- `import.meta.env.VITEST` / `import.meta.env.MODE === 'test'` を含む条件をすべて削除し、`else`（通常モード）側のみ残す。
- フォールバック警告UIブロック（`fallback-mode-warning` / `data-testid="fallback-warning"`、480〜490行付近）を削除。
- `(import.meta.env.MODE === 'test' || isInFallbackMode)` で分岐するプレイヤーカード描画（575〜600行付近）のフォールバック側を削除し、通常モード描画に一本化。
- `handlePollingError`（86〜93行）: `activateFallbackMode` 呼び出しを削除し、`console.warn` のログのみに変更。`usePollingSync` の成功コールバック内 `if (isInFallbackMode) deactivateFallbackMode();`（109〜111行）を削除。
- 1秒ティックの `setTotalGameTime` 更新（196〜200行）を `setTotalGameTime(serverGameState.getTotalGameTime())` のみに単純化。

- [ ] **Step 4: 型・lint チェック**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: エラー 0（`isInFallbackMode` / `fallbackState` / `VITEST` 等の未定義参照が残っていれば修正）

- [ ] **Step 5: 分岐撤去の確認**

Run: `cd frontend && grep -n "isInFallbackMode\|fallbackState\|import.meta.env.VITEST\|MODE === 'test'\|fallback-warning" src/components/GameTimer.tsx`
Expected: 0件

- [ ] **Step 6: 全コンポーネントテスト実行**

Run: `cd frontend && npm test -- --run src/components/__tests__/`
Expected: PASS（ハーネス移行済みのため通常モード単一経路で緑）。失敗時は該当テストの `serverState` overrides を調整。

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/GameTimer.tsx
git commit -m "リファクタ: GameTimerからフォールバック分岐・警告UIを撤去し通常モード単一経路化"
```

---

## Task 13: フォールバックフックの削除

**Files:**
- Delete: `frontend/src/hooks/useGameState.ts`, `frontend/src/hooks/useFallbackMode.ts`, `frontend/src/hooks/useGameTimer.ts`

- [ ] **Step 1: 残参照が無いことを確認**

Run: `cd frontend && grep -rn "useGameState\|useFallbackMode\|useGameTimer" src --include="*.ts" --include="*.tsx" | grep -v "__tests__"`
Expected: 0件（本番コードからの参照なし。テストの参照は Task 14 で削除）

- [ ] **Step 2: フックを削除**

```bash
git rm frontend/src/hooks/useGameState.ts frontend/src/hooks/useFallbackMode.ts frontend/src/hooks/useGameTimer.ts
```

- [ ] **Step 3: 型チェック**

Run: `cd frontend && npx tsc --noEmit`
Expected: エラー 0

- [ ] **Step 4: コミット**

```bash
git commit -m "削除: フォールバック専用フック(useGameState/useFallbackMode/useGameTimer)を撤去"
```

---

## Task 14: フォールバック専用テストの削除

**Files (Delete):**
- `frontend/src/hooks/__tests__/useFallbackMode.test.ts`
- `frontend/src/hooks/__tests__/useGameTimer.test.ts`
- `frontend/src/hooks/__tests__/useGameState.disableControls.test.ts`
- `frontend/src/hooks/__tests__/useGameState.formatGameTime.test.ts`
- `frontend/src/hooks/__tests__/useGameState.gameControl.test.ts`
- `frontend/src/hooks/__tests__/useGameState.inputValidation.test.ts`
- `frontend/src/hooks/__tests__/useGameState.longestPlayer.test.ts`
- `frontend/src/hooks/__tests__/useGameState.playerName.test.ts`
- `frontend/src/hooks/__tests__/useGameState.setActivePlayer.test.ts`
- `frontend/src/hooks/__tests__/useGameState.setPaused.test.ts`
- `frontend/src/hooks/__tests__/useGameState.test.ts`
- `frontend/src/hooks/__tests__/useGameState.timeoutNotification.test.ts`
- `frontend/src/hooks/__tests__/useGameState.totalGameTime.test.ts`
- `frontend/src/hooks/__tests__/useGameState.turnManagement.test.ts`
- `frontend/src/hooks/__tests__/useGameState.turnTime.test.ts`
- `frontend/src/hooks/__tests__/useGameState.uiFormat.test.ts`

- [ ] **Step 1: 削除**

```bash
git rm frontend/src/hooks/__tests__/useFallbackMode.test.ts frontend/src/hooks/__tests__/useGameTimer.test.ts frontend/src/hooks/__tests__/useGameState.*.test.ts
```

- [ ] **Step 2: 全ユニットテスト実行**

Run: `cd frontend && npm test -- --run`
Expected: 全 PASS（削除したテストへの依存が無いこと、残テストが緑であることを確認）

- [ ] **Step 3: コミット**

```bash
git commit -m "削除: フォールバック専用ユニットテスト(useGameState/useFallbackMode/useGameTimer)を撤去"
```

---

## Task 15: E2E `player-name-persistence.spec.ts` のフォールバック非依存化

**Files:**
- Modify: `e2e/specs/player-name-persistence.spec.ts`

**Interfaces:**
- Consumes: Playwright `page.route`（API モック）。
- Produces: フォールバック非依存の E2E（通常モードで動作）。

- [ ] **Step 1: フォールバック待機を撤去し、API モックを導入**

`page.waitForSelector('[data-testid="fallback-warning"]', ...)`（7箇所以上）をすべて削除する。バックエンド非依存のままにするため、各テストの冒頭で `/api/game` 等を `page.route` でモックして通常モードのUIを成立させる。例（最小形）:

```ts
await page.route('**/api/game', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { ETag: 'e2e-etag' },
    body: JSON.stringify({
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 0 },
        { name: 'プレイヤー2', elapsedSeconds: 0 },
        { name: 'プレイヤー3', elapsedSeconds: 0 },
        { name: 'プレイヤー4', elapsedSeconds: 0 },
      ],
      activePlayerIndex: -1, timerMode: 'countup', countdownSeconds: 600,
      isPaused: true, etag: 'e2e-etag', turnStartedAt: null, pausedAt: null,
      gameMode: 'normal', phase: 0,
    }),
  });
});
```

`fallback-warning` を待っていた箇所は、対象のプレイヤー名入力要素（`data-testid`）の表示待ちに置換する。プレイヤー名履歴 API（`/api/playerNames` 等）を使うテストは、そのエンドポイントも `page.route` でモックする。

- [ ] **Step 2: 当該 E2E を実行**

Run: `npx playwright test e2e/specs/player-name-persistence.spec.ts`
Expected: PASS

- [ ] **Step 3: `fallback-warning` 参照が消えたことを確認**

Run: `grep -rn "fallback-warning\|fallback" e2e/specs/player-name-persistence.spec.ts`
Expected: 0件

- [ ] **Step 4: コミット**

```bash
git add e2e/specs/player-name-persistence.spec.ts
git commit -m "E2E修正: player-name-persistenceをフォールバック非依存(APIモック)へ移行"
```

---

## Task 16: 最終検証

- [ ] **Step 1: 全ユニットテスト**

Run: `cd frontend && npm test -- --run`
Expected: 全 PASS

- [ ] **Step 2: 型・lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: エラー 0

- [ ] **Step 3: 撤去完了の機械的確認**

Run（リポジトリルート）:
```bash
grep -rn "isInFallbackMode\|fallbackState\|useFallbackMode\|useGameState\|VITEST" frontend/src --include="*.ts" --include="*.tsx"
ls frontend/src/hooks/useGameState.ts frontend/src/hooks/useFallbackMode.ts 2>&1
grep -rn "fallback-warning" e2e frontend/src 2>&1
```
Expected: 1行目=0件、2行目=`No such file`、3行目=0件。

- [ ] **Step 4: E2E 全体**

Run: `npx playwright test`
Expected: 全 PASS

- [ ] **Step 5: 完了コミット（差分があれば）**

```bash
git commit -am "検証: フォールバックモード撤去の最終確認（全テスト緑）"
```

---

## Self-Review 結果

- **Spec coverage:** 設計ドキュメント §2（削除インベントリ）→ Task 12〜14、§3（テスト戦略/ハーネス）→ Task 1〜7、§4（GameTimer 改修）→ Task 12、§5（エラーUX流用）→ Task 12 Step 3（`handlePollingError` ログ化）、§6（E2E）→ Task 15、§7（実装順序）→ 全タスクの並び、§9（完了条件）→ Task 16。全項目に対応タスクあり。
- **Placeholder scan:** コード提示が必要な手順には実コードを記載。テスト移行（Task 3〜6）は「各ファイルの既存アサーションを 1:1 で写す」ことを明示し、変換レシピ（A〜D）を具体コードで提示済み。
- **Type consistency:** `createMockServerState` / `createMockServerGameState` / `MockServerGameState` / `renderGameTimer` / `mockApi` のキー・シグネチャは Task 1・2 の定義と後続タスクの利用で一致。`GameStateWithTime` / `useServerGameState` / `useGameApi` のキーは Global Constraints の実シグネチャに準拠。

## 留意（実装中に確認）

- `timedOutPlayerId` とタイムアウト通知UI: 通常モードに同等表現が無い場合、UIごと撤去（Task 12 Step 2）。当該UIを参照するテストがあれば Task 5/6 で読み替える。
- `usePollingSync` の export 形態（名前付き想定）を Task 2 実装時に確認。デフォルトエクスポートなら `vi.mock` の取り回しを合わせる。

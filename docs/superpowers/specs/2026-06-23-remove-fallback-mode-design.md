# フォールバックモード撤去 設計ドキュメント

- **作成日**: 2026-06-23
- **対象ブランチ**: （新規）`feature/remove-fallback-mode` 推奨
- **目的**: コードの単純化。`GameTimer.tsx` に散在する `isInFallbackMode` 三項演算子（40箇所以上）と、テスト専用の `import.meta.env.VITEST` / `MODE === 'test'` 分岐を撤去し、通常モード（バックエンドAPI＋ポーリング）単一経路にする。
- **方針**: テストハーネス先行（常にグリーンを維持しながら段階的に撤去）

---

## 1. 背景と問題

### 現在の二重モード構成
- **フォールバックモード（Phase 1）**: `useGameState`（インメモリー状態管理、566行）＋ `useFallbackMode`（API失敗検出と切替）
- **通常モード（Phase 2）**: `useServerGameState`（API＋ポーリング同期）＋ `usePollingSync` ＋ `useGameApi`

### 問題点
1. `GameTimer.tsx`（749行）に `(import.meta.env.VITEST || isInFallbackMode) ? fallbackState.x : serverGameState.x` 形式の分岐が 40箇所以上散在し、可読性・保守性を著しく損ねている。
2. **テストがフォールバック経路に依存**している。テスト環境（`VITEST` / `MODE === 'test'`）では強制的に `fallbackState`（インメモリー実装）を使う設計になっており、「テスト経路＝フォールバック経路」として使い回されている。
3. 同じゲームロジックがフロント（`useGameState`）とバックエンドの両方に存在し、二重メンテナンスになっている（バックエンドが信頼できる情報源）。

### 撤去のスコープ判断
- 目的は **コードの単純化**。同時に、テストも撤去対象（フォールバック専用テストを残さず、API モックベースへ全面移行する）。
- フォールバックフック（`useGameState` / `useFallbackMode`）を **完全撤去**する。

---

## 2. 撤去対象インベントリ

### 削除する本番ファイル
| ファイル | 理由 |
| --- | --- |
| `frontend/src/hooks/useFallbackMode.ts` | フォールバック切替専用 |
| `frontend/src/hooks/useGameState.ts`（566行） | インメモリー状態管理。撤去対象 |
| `frontend/src/hooks/useGameTimer.ts` | フォールバック専用のタイマーティック駆動（通常モードは `useServerGameState` 内の `setInterval` が担う）。**実装時に他参照が無いことを最終確認**してから削除 |

### 改修する本番ファイル
- `frontend/src/components/GameTimer.tsx`（詳細は §4）

### 削除するテスト（フック直接テスト、15ファイル）
`useGameState` / `useFallbackMode` を直接対象にしたテストはフック削除に伴い削除する。

- `useFallbackMode.test.ts`
- `useGameState.disableControls.test.ts`
- `useGameState.formatGameTime.test.ts`
- `useGameState.gameControl.test.ts`
- `useGameState.inputValidation.test.ts`
- `useGameState.longestPlayer.test.ts`
- `useGameState.playerName.test.ts`
- `useGameState.setActivePlayer.test.ts`
- `useGameState.setPaused.test.ts`
- `useGameState.test.ts`
- `useGameState.timeoutNotification.test.ts`
- `useGameState.totalGameTime.test.ts`
- `useGameState.turnManagement.test.ts`
- `useGameState.turnTime.test.ts`
- `useGameState.uiFormat.test.ts`
- （加えて `useGameTimer.test.ts` は `useGameTimer` 削除時に削除）

> 補足: これらが検証していたゲームロジック（カウントアップ/ダウン、ターン切替、最長プレイヤー等）は、バックエンドの純粋関数テストでカバーされるべき範囲。フロント側からは撤去する。

### 移行するテスト（GameTimer コンポーネント、16ファイル）
新テストハーネス（§3）へ移行する。

`GameTimer.buttonLayout` / `buttonResponseOptimization` / `buttonStates` / `conditionalRendering` / `integration` / `playerCountDropdown` / `playerName` / `playerNameHistory` / `playerNameHistory.responsive` / `playerNameHistory.saveOnReset` / `resetIntegration` / `stickyHeader` / `timerModeToggle` / `timerModeUpdate` / `timerSync` / `uiSimplification`

### E2E
- `e2e/specs/player-name-persistence.spec.ts`: **わざとフォールバックモードを使って**バックエンド無しでプレイヤー名UIを検証している（`data-testid="fallback-warning"` を 7箇所以上で `waitForSelector`）。フォールバック撤去で破綻するため作り直しが必要（§6）。

---

## 3. テスト戦略（アーキテクチャの中核）

### 選定方針: `useServerGameState` をモック
`vi.mock` で `useServerGameState`（必要に応じて `useGameApi` / `usePollingSync`）をモックし、任意の `serverState` を流し込む。

**理由**:
- 現行 GameTimer テストの大半は「描画・ボタン状態・ドロップダウン」の検証で、`serverState` を制御できれば十分。
- ポーリング/ETag/非同期 fetch を実際に回す案（fetch モック / MSW）は決定論が崩れフレーキー化しやすい。目的はコード単純化であってテスト実環境化ではない。
- 「クリック後に状態が変わる」系は、**バックエンドが信頼できる情報源**という実アーキに合わせ「API が正しい引数で呼ばれたか」を検証する形へ置換する。

### 新規テストヘルパー
**`frontend/src/test/createMockServerGameState.ts`**
- `useServerGameState` の戻り値型に一致するオブジェクトを生成するファクトリ。
- 既定値（プレイヤー4人、`activePlayerIndex: -1`、`isPaused: true` 等）を持ち、引数で部分上書き可能。
- `formatTime` / `formatGameTime` / `getLongestTimePlayer` / `getTotalGameTime` / `getCurrentTurnTime` / `syncWithServer` / `updateFromServer` / `updatePlayerNameOptimistic` をスタブ化（`vi.fn()` ベース、必要に応じ実ロジック委譲）。

**`frontend/src/test/renderGameTimer.tsx`**
- `useServerGameState` / `useGameApi` / `usePollingSync` をモックした状態で `<GameTimer />` をレンダリングするヘルパー。
- モックの `serverState` とAPIスパイ（`switchTurn` / `pauseGame` / `resumeGame` / `resetGame` / `updateGame` / `updatePlayerName`）を呼び出し側へ返し、アサーションに使えるようにする。

### テスト書き換えの原則
- **描画系**: モック `serverState` を与えて要素・テキスト・`data-testid` を検証（変更最小）。
- **操作系**: ボタンクリック → 対応する `useGameApi` 関数が期待引数で呼ばれたことを検証（インメモリー状態の直接変化検証は廃止）。
- **タイマー表示系**: モック `serverState` ＋ `displayTime` / `getCurrentTurnTime` の戻り値を制御して表示文字列を検証。

---

## 4. GameTimer.tsx 改修詳細

1. **import 削除**: `useGameState`、`useFallbackMode`、`useGameTimer`。
2. **状態の単一化**:
   - `fallbackState` / `isInFallbackMode` / `activateFallbackMode` / `deactivateFallbackMode` を削除。
   - 派生値（`gameState` / `formatTime` / `isPaused` / `isGameActive` / `isGameStarted` / `longestPlayer` / `timedOutPlayerId` 等）を全て `serverGameState` 由来に集約。
   - `timedOutPlayerId`（フォールバック専用 `getTimedOutPlayerId`）は通常モードに無いため、当面 `null` 相当として扱い、タイムアウト通知UIの扱いは実装時に確認（バックエンド由来の表現が無ければUIごと撤去）。
3. **テスト分岐の撤去**: `import.meta.env.VITEST` / `import.meta.env.MODE === 'test'` を全削除。
4. **フォールバック警告UI削除**: `fallback-mode-warning` ブロック（`data-testid="fallback-warning"`）を削除。
5. **プレイヤーカード描画の単一化**: `(MODE === 'test' || isInFallbackMode)` で分岐していたフォールバック専用のプレイヤーカード描画（575〜600行付近）を削除し、通常モード描画に一本化。
6. **`useGameTimer` 呼び出しブロック削除**（170〜180行付近）。通常モードのタイマー表示は `useServerGameState` 内 `setInterval` が担う。
7. **エラーハンドラ変更**: `handlePollingError` はフォールバック起動をやめ、`console.warn` のログのみに変更。

---

## 5. エラー時UX（既存処理の流用）

現状、独立したエラーバナーUIは存在せず、「エラー処理＝フォールバック切替」だった。撤去後は既存の挙動を流用する:

- **静かに失敗＋自動リトライ**: `usePollingSync` は失敗してもクラッシュせず、5秒ごとに自動で再試行する。`syncWithServer` も失敗時は `null` を返して静かに失敗する。
- **直近状態の保持**: API失敗時は直近のサーバー状態を画面に保持し続ける（`serverState` は更新されないだけ）。
- **新規バナー追加なし**: 今回の撤去スコープでは新しいエラーUIは追加しない。専用のエラー表示が必要になった場合は別タスクとする。

---

## 6. E2E 対応

`e2e/specs/player-name-persistence.spec.ts` はフォールバックモードを前提に組まれている。以下のいずれかで作り直す（実装計画フェーズで選定）:

- **案1**: 実バックエンド（ローカル Functions ＋ Cosmos エミュレータ）を起動して通常モードで検証。
- **案2**: Playwright の `page.route` で `/api/game` 等をモックし、通常モードのまま検証。

いずれの場合も `fallback-warning` への `waitForSelector` は削除し、通常モードのUI要素を待機対象に置き換える。

---

## 7. 実装順序（テストハーネス先行）

撤去中も常にテストグリーンを維持するため、以下の順で進める:

1. **ハーネス整備**: `createMockServerGameState` / `renderGameTimer` を作成。
2. **テスト移行**: フォールバックがまだ有る状態で、16コンポーネントテストを新ハーネスへ移行（この時点で両経路ともグリーン）。
3. **本番撤去**: `GameTimer.tsx` から分岐・警告UI・`useGameTimer` 呼び出しを撤去し、通常モード単一経路化。
4. **フック削除**: `useGameState.ts` / `useFallbackMode.ts` /（確認後）`useGameTimer.ts` と、対応する15＋1フックテストを削除。
5. **E2E 作り直し**: `player-name-persistence.spec.ts` をフォールバック非依存へ。
6. **検証**: `npm test`（ユニット全パス）、`npx playwright test`（E2E全パス）、lint / 型チェック。

---

## 8. リスクと留意点

- **`timedOutPlayerId` / タイムアウト通知UI**: フォールバック専用 API に依存。通常モードに同等表現が無ければUIごと撤去となる（要件確認）。
- **`useGameTimer` の参照残**: `resetIntegration.test.tsx` がテスト名で `useGameTimer` に言及。実体は `serverGameState` のタイマー検証の可能性が高いが、削除前に参照を精査。
- **`totalGameTime` の更新経路**: 現状フォールバック/通常で分岐（197〜200行）。通常モードのみへ単純化する際、1秒ごとの `setTotalGameTime(serverGameState.getTotalGameTime())` が維持されることを確認。
- **テスト意味の変化**: 「状態変化検証」から「API呼び出し意図検証」へ移るため、一部テストは検証対象が変わる。リグレッション検知力が落ちないよう、API引数アサーションを厳密にする。

---

## 9. 完了条件（Definition of Done）

- `GameTimer.tsx` に `isInFallbackMode` / `import.meta.env.VITEST` / `MODE === 'test'` 分岐が 0 件。
- `useGameState.ts` / `useFallbackMode.ts` が存在しない（`useGameTimer.ts` は確認後）。
- 全ユニットテストがパス（フォールバック専用テストは削除済み）。
- 全E2Eテストがパス（`fallback-warning` 依存が 0 件）。
- lint / 型エラーなし。

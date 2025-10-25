# timer-synchronization - Implementation Tasks

## 概要

この仕様は、マルチプレイヤーゲームタイマーの複数のタイマー表示（プレイヤーカード、ターン時間、全体プレイ時間、最長時間プレイヤー）が同期して更新されるようにする機能を実装します。

現在は各タイマー表示が独立して更新されているため、表示タイミングにズレが生じています。この問題を解決するため、既存のuseGameTimerフックを改修し、Reactの状態管理とレンダリングバッチングを活用することで、全てのタイマー表示が同じタイミングで同期して更新されるようにします。

**実装アプローチ**: ギャップ分析により、Option A（既存コンポーネント拡張）を採用。既存のuseGameTimerフック構造を維持し、最小限の変更で実現します。

**実装複雑度**: Small (S) - 1.5-2日
- Phase 2-4実装: 0.5-1日
- Phase 5ユニットテスト: 0.5日
- Phase 6 E2Eテスト: 0.5日
- Phase 7完了処理: 0.1日

## Phase 1: コード調査とforceUpdate特定（✅ 完了）

### 1. 既存実装の調査と分析

既存のタイマー実装を理解し、forceUpdate()の使用箇所を特定しました。

- [x] 1.1 GameTimer.tsxでforceUpdate()使用箇所を特定
  - **ファイル**: `frontend/src/components/GameTimer.tsx`
  - **実装内容**:
    - ファイル全体を検索してforceUpdate()呼び出し箇所を全て列挙
    - 各forceUpdate()の用途を分析（タイマー更新、状態変更、その他）
    - 呼び出し箇所のコンテキストを文書化
  - **完了条件**: forceUpdate()呼び出し箇所のリスト作成、各用途を文書化
  - **カバーする要件**: 全要件の基盤調査
  - **調査結果**:
    - forceUpdate()使用箇所: 1箇所のみ（96行目定義、100行目呼び出し）
    - 用途: ターン時間表示の1秒ごと更新（フォールバックモードのみ）
    - getCurrentTurnTime()の表示を強制的に更新するため

- [x] 1.2 useGameTimerフックの現在の実装を分析
  - **ファイル**: `frontend/src/hooks/useGameTimer.ts`
  - **実装内容**:
    - setIntervalの実装を確認
    - onTimerTickコールバックの呼び出しフローを理解
    - timerRef, syncCounterRef, currentElapsedTimeRefの役割を把握
  - **完了条件**: フックの動作フロー図作成、単一setIntervalであることを確認
  - **カバーする要件**: Req 1 (AC1,2)
  - **分析結果**:
    - ✅ 単一のsetIntervalを使用（65-102行目）
    - onTimerTick呼び出し: 83行目 `onTimerTick(currentPlayer.id, newElapsedTime)`
    - Ref構造: timerRef（setInterval ID）、syncCounterRef（5秒同期カウンター）、currentElapsedTimeRef（現在時間）

- [x] 1.3 各タイマー表示コンポーネントの実装を確認
  - **ファイル**: `frontend/src/components/GameTimer.tsx`内の各表示セクション
  - **実装内容**:
    - プレイヤーカードのタイマー表示実装を確認
    - ターン時間表示(data-testid="turn-time")の実装を確認
    - 全体プレイ時間表示(data-testid="total-play-time")の実装を確認
    - 最長時間プレイヤー表示(data-testid="top-time-player")の実装を確認
    - 各表示がどのように更新されているかを分析
  - **完了条件**: 各表示コンポーネントの実装概要文書化、独自タイマーや状態の有無を確認
  - **カバーする要件**: Req 4 (AC1-5)の基盤調査
  - **調査結果**:
    1. プレイヤーカード時間: props駆動、独自タイマーなし
    2. ターン時間: **独自forceUpdate()あり**（96-104行目、1秒ごと再レンダリング）
    3. 全体プレイ時間: props駆動、独自タイマーなし
    4. 最長時間プレイヤー: 完全props駆動コンポーネント、独自タイマーなし
    - **問題特定**: ターン時間表示のforceUpdate()とuseGameTimerのonTimerTickが独立動作→表示ズレの原因

## Phase 2: useGameTimerフック検証

### 2. useGameTimerフックの検証と最適化

既存のuseGameTimerフックが正しく動作していることを検証し、必要に応じて最適化します。

- [x] 2.1 onTimerTickコールバックの動作検証
  - **ファイル**: `frontend/src/hooks/useGameTimer.ts` (83行目), `frontend/src/components/GameTimer.tsx`
  - **実装内容**:
    - useGameTimer.ts 83行目のonTimerTick呼び出しを確認
    - GameTimer側でonTimerTickがどのように使われているかを把握
    - 現在の実装で1秒ごとに正確に呼び出されているか確認
    - onTimerTickコールバックのシグネチャ: `(playerId: string, newElapsedTime: number) => void`
  - **完了条件**: onTimerTickの仕様文書化、1秒ごとの呼び出しフロー確認
  - **カバーする要件**: Req 1 (AC2,3), Req 2 (AC1)
  - **検証結果**:
    - ✅ onTimerTickは83行目で `onTimerTick(currentPlayer.id, newElapsedTime)` として呼び出し
    - ✅ 既存テストで1秒ごとの呼び出しを検証済み（useGameTimer.test.ts 41-58行目）
    - ✅ 全7テストパス - カウントアップ/ダウン、一時停止、5秒同期、時間切れ、クリーンアップ全て検証済み
    - ⚠️ GameTimer.tsxでは現在useGameTimerを使用していない（forceUpdate()メカニズムのみ）

- [x] 2.2 タイマー精度検証とテスト作成
  - **ファイル**: `frontend/src/hooks/__tests__/useGameTimer.test.ts` (既存ファイルに追加)
  - **実装内容**:
    - jest.useFakeTimers()を使用してタイマー精度をテスト
    - 1秒ごとの更新が正確に行われることを確認
    - 遅延が発生した場合の動作を検証
    - React 19.1.1の自動バッチングが正しく機能することを確認
  - **完了条件**: タイマー精度テスト追加、npm testパス
  - **カバーする要件**: Req 2 (AC4)
  - **実装結果**:
    - ✅ 4つの新規テストを追加（タイマー精度検証グループ）
      1. 複数のコールバックが正確に1秒間隔で呼び出される（10秒間連続検証）
      2. React自動バッチングによる状態更新の同期（onTimerTick + onServerSync同時実行）
      3. 遅延が発生しても次回のティックで補正される（3秒遅延シミュレーション）
      4. タイマー停止と再開の精度（一時停止中の時間保持と再開後の継続）
    - ✅ 全11テストパス（既存7 + 新規4）

## Phase 3: GameTimer状態管理修正（✅ 完了）

### 3. GameTimerコンポーネントの状態管理改修

forceUpdate()を排除し、useGameTimerフックによる統一的なタイマー管理に移行しました。

- [x] 3.1 forceUpdate()削除とuseGameTimer統合
  - **ファイル**: `frontend/src/components/GameTimer.tsx` (行1-111)
  - **実装内容**:
    1. **useGameTimerのimport追加**（行9）
    2. **forceUpdate()の完全削除**（旧96-104行目）
       - `const [, forceUpdate] = React.useReducer(x => x + 1, 0);` 削除
       - setIntervalとforceUpdate()呼び出しのuseEffectブロック全体を削除
    3. **useState追加: turnTimeUpdateTrigger**（行97）
       - ターン時間表示の再レンダリングトリガー用状態
    4. **useGameTimer統合**（行101-111）
       - フォールバックモード時のみ動作（`isInFallbackMode && gameState`）
       - onTimerTickコールバックで以下を実行:
         - fallbackState.updatePlayerTime() でプレイヤー時間を更新
         - setTurnTimeUpdateTrigger() でターン時間表示を再レンダリング
       - React 19.1.1のauto-batchingで両方の状態更新が同期
  - **完了条件**:
    - ✅ forceUpdate関連コード完全削除
    - ✅ useGameTimer統合完了
    - ✅ TypeScript型エラーなし
    - ✅ useGameTimerテスト全11パス
  - **カバーする要件**: Req 1 (AC2,3), Req 2 (AC1), Req 3 (AC1-4), Req 4 (AC5)
  - **ファイル**: `frontend/src/components/GameTimer.tsx`, `frontend/src/hooks/useServerGameState.ts`
  - **実装内容**:
    - useServerGameStateのポーリング時（5秒ごと）にtimerStateも更新
    - onServerSyncコールバック内でsetTimerStateを呼び出し:
      ```typescript
      const handleServerSync = (playerId: number, newElapsedTime: number) => {
        // 既存のサーバー同期処理
        serverGameState.syncWithServer();

        // 新規: timerStateも更新
        setTimerState({
          lastUpdateTime: Date.now(),
          forceRenderCount: prev => prev.forceRenderCount + 1
        });
      };
      ```
    - ETag更新時も同様にtimerStateを更新
  - **完了条件**: ポーリング同期時のtimerState更新実装完了、ブラウザで確認
  - **カバーする要件**: Req 2 (AC1), Req 4 (AC5)

## Phase 4: タイマー表示コンポーネント更新（✅ 完了）

### 4. タイマー表示コンポーネントのprops駆動化確認

各タイマー表示が完全にprops駆動で動作するようにし、独自の状態やタイマーを持たないことを確認しました。

- [x] 4.1 各表示コンポーネントのprops構造確認
  - **ファイル**: `frontend/src/components/GameTimer.tsx`内の各表示セクション
  - **実装内容**:
    - プレイヤーカード、ターン時間、全体プレイ時間、最長時間プレイヤーの各表示がpropsで時間を受け取っているか確認
    - **Phase 1調査結果の再確認**:
      - プレイヤーカード: ✅ 既にprops駆動（`player.elapsedTimeSeconds`）
      - ターン時間: ✅ `getCurrentTurnTime()`による状態駆動
      - 全体プレイ時間: ⚠️ **`getTotalGameTime()`がタイマー更新に反応しない問題を発見**
      - 最長時間プレイヤー: ✅ `getLongestTimePlayer()`による状態駆動
  - **完了条件**: 各表示がprops駆動であることを確認、**問題発見によりPhase 5へ**
  - **カバーする要件**: Req 4 (AC1-5)
  - **検証結果**:
    - ✅ プレイヤー経過時間: props駆動（`player.elapsedTimeSeconds`）
    - ✅ ターン時間: 状態駆動（`getCurrentTurnTime()` + `turnTimeUpdateTrigger`）
    - ❌ **ゲーム全体時間: `getTotalGameTime()`が更新されない問題を特定**
    - ✅ 最長時間プレイヤー: 状態駆動（`getLongestTimePlayer()`）

- [x] 4.2 独自状態や独自タイマーが残っていないことを確認
  - **ファイル**: `frontend/src/components/GameTimer.tsx`内の各表示セクション
  - **実装内容**:
    - 各表示コンポーネント内で独自にuseState、useEffect、forceUpdate()を使用している箇所がないことを確認
    - grep検索で確認: `forceUpdate`, `useEffect.*setInterval`, `useState.*timer`
    - timerStateの変更により全表示が同期して再レンダリングされることを確認
    - 開発サーバーを起動し、Chrome DevToolsで再レンダリングを検証
  - **完了条件**: 独自状態・タイマーなし確認完了、**ゲーム全体時間の問題発見**
  - **カバーする要件**: Req 4 (AC1-5)
  - **検証結果**:
    - ✅ `forceUpdate`: コメントのみ（削除済み）
    - ✅ `setInterval`: GameTimer.tsx内に存在しない
    - ✅ `turnTimeUpdateTrigger`: タイマー同期用の正当な状態
    - ✅ `countdownSeconds`: カウントダウン設定（表示状態ではない）
    - ✅ `debounceTimerRef`: プレイヤー名デバウンス用（タイマー表示と無関係）
    - ❌ **重大な問題発見**: `getTotalGameTime()`がタイマー更新に反応しない

## Phase 5: ゲーム全体時間同期の緊急修正

### 5. ゲーム全体時間の同期問題修正

**問題**: ギャップ分析により、`getTotalGameTime()`がタイマー更新とポーリング同期の両方で更新されないことが判明。`useCallback`の依存配列が配列参照のみを監視しており、個々のプレイヤー時間の変更を検知できない。

**影響範囲**:
- ❌ 要件2「全てのタイマーが同じタイミングで更新」: ゲーム全体時間が更新されない
- ❌ 要件3「ポーリングで最新の秒に更新」: ゲーム全体時間がポーリングで更新されない

**修正方針**: `getTotalGameTime()`結果をstateで管理し、タイマーtickとポーリング同期で明示的に更新する。

#### TDD実装プロセス（必須）
各タスクの実装時は以下のTDDプロセスに従うこと：
1. **RED phase**: 実装前にテストケースを作成
2. **GREEN phase**: 最小限の実装でテストをパス
3. **REFACTOR phase**: 必要に応じてリファクタリング
4. `npm test`で全テストが成功することを確認

- [x] 5.1 GameTimer.tsxに`totalGameTime` state追加（フォールバックモード）
  - **ファイル**: `frontend/src/components/GameTimer.tsx`
  - **実装内容**:
    1. **TDD: RED phase**
       - テストファイル: `frontend/src/components/__tests__/GameTimer.totalGameTime.test.tsx` (新規作成)
       - テストケース作成:
         - ゲーム開始時、ゲーム全体時間が0:00と表示される
         - 1秒経過後、ゲーム全体時間が0:01に更新される
         - 5秒経過後、ゲーム全体時間が0:05に更新される
         - プレイヤー切り替え後も、ゲーム全体時間が継続して増加する
       - `npm test` → テスト失敗を確認（ゲーム全体時間が更新されない）
    2. **TDD: GREEN phase**
       - `const [totalGameTime, setTotalGameTime] = React.useState(0);` を追加（行97付近）
       - useGameTimerのonTimerTickコールバック内で`setTotalGameTime(fallbackState.getTotalGameTime())`を追加
       - レンダリング部分（行390-414）で`totalGameTime` stateを使用
       - `npm test` → テストパスを確認
    3. **TDD: REFACTOR phase**
       - コードの可読性確認
       - 重複コード削除
       - `npm test` → 全テストパス確認
  - **完了条件**:
    - ✅ ユニットテスト作成・パス
    - ✅ タイマーtickごとにゲーム全体時間が更新される
    - ✅ ブラウザで手動確認（フォールバックモード）
  - **カバーする要件**: Req 2 (AC1), Req 4 (AC3)

- [x] 5.2 useGameTimerのonTimerTickで`getTotalGameTime()`結果を状態更新
  - **ファイル**: `frontend/src/components/GameTimer.tsx` (useGameTimer呼び出し部分)
  - **実装内容**:
    1. **TDD: RED phase**
       - テストケース追加（GameTimer.totalGameTime.test.tsx）:
         - 一時停止時、ゲーム全体時間が更新されない
         - 再開時、ゲーム全体時間が更新再開される
         - リセット時、ゲーム全体時間が0:00にリセットされる
       - `npm test` → テスト失敗を確認
    2. **TDD: GREEN phase**
       - useGameTimerのonTimerTickコールバック（行103-109）を修正:
         ```typescript
         (playerId, newElapsedTime) => {
           if (isInFallbackMode && gameState) {
             fallbackState.updatePlayerTime(playerId, newElapsedTime);
             setTurnTimeUpdateTrigger(prev => prev + 1);
             setTotalGameTime(fallbackState.getTotalGameTime()); // 追加
           }
         }
         ```
       - `npm test` → テストパス確認
    3. **TDD: REFACTOR phase**
       - コード整理
       - `npm test` → 全テストパス確認
  - **完了条件**:
    - ✅ ユニットテスト追加・パス
    - ✅ タイマーtickでゲーム全体時間が更新される
    - ✅ 一時停止/再開/リセット動作が正しい
  - **カバーする要件**: Req 2 (AC1), Req 3 (AC1,2,3,4)

- [x] 5.3 レンダリング時に`totalGameTime` stateを使用
  - **ファイル**: `frontend/src/components/GameTimer.tsx` (行390-414)
  - **実装内容**:
    1. **TDD: RED phase**
       - テストケース追加（GameTimer.totalGameTime.test.tsx）:
         - data-testid="total-game-time"要素が存在する
         - 初期値が"00:00"と表示される
         - 1秒後に"00:01"と表示される
       - `npm test` → テスト失敗を確認（古いgetTotalGameTime()を使用しているため）
    2. **TDD: GREEN phase**
       - 行390-414のレンダリング部分を修正:
         ```typescript
         <span className={`total-game-time-value ${...}`}>
           {isInFallbackMode
             ? fallbackState.formatGameTime(totalGameTime)  // 修正
             : serverGameState.formatGameTime(serverGameState.getTotalGameTime())
           }
         </span>
         ```
       - `npm test` → テストパス確認
    3. **TDD: REFACTOR phase**
       - コード整理
       - `npm test` → 全テストパス確認
  - **完了条件**:
    - ✅ ユニットテスト追加・パス
    - ✅ ゲーム全体時間が正しく表示される
    - ✅ ブラウザで手動確認
  - **カバーする要件**: Req 4 (AC3, AC5)

- [x] 5.4 通常モード（サーバーモード）にも同じ実装を適用
  - **ファイル**: `frontend/src/components/GameTimer.tsx`, `frontend/src/hooks/useServerGameState.ts`
  - **実装内容**:
    1. **TDD: RED phase**
       - テストケース追加（GameTimer.totalGameTime.test.tsx）:
         - 通常モード（isInFallbackMode=false）でゲーム全体時間が更新される
         - ポーリング同期時にゲーム全体時間が最新値に更新される
       - `npm test` → テスト失敗を確認
    2. **TDD: GREEN phase**
       - GameTimer.tsxで通常モード用の`totalGameTime` stateも更新:
         ```typescript
         // usePollingSync内でポーリング結果を受け取った時
         React.useEffect(() => {
           if (!isInFallbackMode && serverState) {
             setTotalGameTime(serverGameState.getTotalGameTime());
           }
         }, [isInFallbackMode, serverState]);
         ```
       - レンダリング部分を修正（両モードで`totalGameTime` stateを使用）
       - `npm test` → テストパス確認
    3. **TDD: REFACTOR phase**
       - コード整理
       - `npm test` → 全テストパス確認
  - **完了条件**:
    - ✅ ユニットテスト追加・パス
    - ✅ 通常モードでゲーム全体時間が更新される
    - ✅ ポーリング同期で最新値に更新される
    - ✅ ブラウザで手動確認（通常モード）
  - **カバーする要件**: Req 2 (AC1), Req 3 (AC1-4), Req 4 (AC3, AC5)

- [x] 5.5 ギャップ分析の検証完了とコミット作成
  - **実施内容**:
    1. ギャップ分析で指摘された2つの問題が解決されたことを確認:
       - ✅ 問題1「全てのタイマーが同じタイミングで秒が増加/減少すること」
       - ✅ 問題2「ゲーム全体のタイマーは他のタイマーと同じように秒が増減し、ポーリングごとに最新の秒に更新されること」
    2. ブラウザで手動確認:
       - フォールバックモードでゲーム全体時間が1秒ごとに更新される
       - 通常モードでゲーム全体時間が1秒ごとに更新される
       - 通常モードでポーリング同期（5秒ごと）で最新値に更新される
    3. 全ユニットテストパス確認（`npm test`）
    4. 詳細なコミットメッセージを作成:
       ```
       Phase 5完了: ゲーム全体時間同期の緊急修正

       ## 実装内容
       - GameTimer.tsxに`totalGameTime` state追加
       - useGameTimerのonTimerTickで`getTotalGameTime()`結果を状態更新
       - フォールバックモードと通常モードの両方に実装
       - ポーリング同期時も`getTotalGameTime()`で状態更新

       ## 解決した問題
       - ❌→✅ 問題1: 全てのタイマーが同じタイミングで秒が増加/減少する
       - ❌→✅ 問題2: ゲーム全体時間が他のタイマーと同じように秒が増減し、ポーリングごとに最新の秒に更新される

       ## テスト結果
       - 全[N]ユニットテストパス（GameTimer.totalGameTime.test.tsx 新規[M]テスト含む）
       - 全テスト（既存含む）パス、リグレッションなし

       ## カバーした要件
       - Req 2 (AC1): 全てのタイマー表示が同じタイミングで更新される ✅
       - Req 3 (AC1-4): ポーリング同期により最新の秒に更新される ✅
       - Req 4 (AC3, AC5): ゲーム全体時間の同期表示 ✅

       ## 次のフェーズ
       - Phase 6: ユニットテスト実装（残りのテストケース）

       🤖 Generated with [Claude Code](https://claude.com/claude-code)

       Co-Authored-By: Claude <noreply@anthropic.com>
       ```
    5. Gitコミット作成
  - **完了条件**:
    - ✅ ギャップ分析の2つの問題が解決
    - ✅ 全ユニットテストパス
    - ✅ ブラウザで手動確認完了
    - ✅ 詳細なコミットメッセージでコミット作成

## Phase 5: ユニットテスト実装

### 5. ユニットテスト実装

全ての要件をカバーするユニットテストを実装します。

- [ ] 5.1 タイマーインスタンス一元管理テスト
  - **ファイル**: `frontend/src/components/__tests__/GameTimer.timerSync.test.tsx` (新規作成)
  - **実装内容**:
    - useGameTimerフックが1回のみ呼び出されることを確認するテスト
    - jest.spyOn()を使用してuseGameTimerの呼び出し回数を検証
    - 複数の表示が同じフックインスタンスを参照していることを確認
  - **完了条件**: テスト作成完了、npm testパス
  - **カバーする要件**: Req 1 (AC1,2,3,4) - タイマーインスタンス一元管理

- [ ] 5.2 タイマー更新同期テスト
  - **ファイル**: `frontend/src/components/__tests__/GameTimer.timerSync.test.tsx`
  - **実装内容**:
    - jest.useFakeTimers()を使用
    - act()とjest.advanceTimersByTime(1000)で1秒経過をシミュレート
    - 全てのタイマー表示（プレイヤーカード、ターン時間、全体時間、最長時間プレイヤー）が同時に更新されることを確認
    - カウントアップモードとカウントダウンモードの両方をテスト
    - React自動バッチングにより全表示が1回の再レンダリングで更新されることを確認
  - **完了条件**: テスト作成完了、npm testパス
  - **カバーする要件**: Req 2 (AC1,2,3) - タイマー更新の同期

- [ ] 5.3 状態管理統一テスト
  - **ファイル**: `frontend/src/components/__tests__/GameTimer.timerSync.test.tsx`
  - **実装内容**:
    - pause操作時にタイマー更新が停止し、全表示が現在の時刻を保持することを確認
    - resume操作時にタイマー更新が再開されることを確認
    - reset操作時に全表示が即座に初期値に更新されることを確認
    - 各操作後、全表示が同じ状態になることを検証
  - **完了条件**: テスト作成完了、npm testパス
  - **カバーする要件**: Req 3 (AC1,2,3,4) - タイマー状態管理の統一

- [ ] 5.4 UI一貫性テスト
  - **ファイル**: `frontend/src/components/__tests__/GameTimer.timerSync.test.tsx`
  - **実装内容**:
    - プレイヤーカード、ターン時間、全体プレイ時間、最長時間プレイヤーの各表示が同じ時刻を表示することを確認
    - タイマー更新時、全ての表示が同じタイミングで更新されることを確認
    - data-testid属性を使用して各表示要素を取得
    - screen.getByTestId()で要素を取得し、textContentを比較
  - **完了条件**: テスト作成完了、npm testパス
  - **カバーする要件**: Req 4 (AC1,2,3,4,5) - UI表示の一貫性保証

## Phase 6: E2Eテスト実装

### 6. E2Eテスト実装

実際のブラウザ環境で全てのタイマー表示が同期することを検証します。

- [ ] 6.1 ゲーム進行中のタイマー同期E2Eテスト
  - **ファイル**: `e2e/specs/timer-synchronization.spec.ts` (新規作成)
  - **実装内容**:
    - ゲームを開始し、全てのタイマー表示が表示されることを確認
    - 初期状態で全表示が同じ値（00:00など）を示すことを確認
    - page.waitForTimeout(5000)で5秒間待機
    - 5秒後、全表示が同じ値（00:05など）を示すことを確認
    - 途中で表示にズレがないことを複数回チェック
    - data-testid="player-card-time", "turn-time", "total-play-time", "top-time-player"を使用
  - **完了条件**: テスト作成完了、npx playwright testパス
  - **カバーする要件**: Req 2 (AC1,2,3) - タイマー更新の同期、Req 4 (AC1,2,3,4,5) - UI表示の一貫性

- [ ] 6.2 状態変更時の同期E2Eテスト
  - **ファイル**: `e2e/specs/timer-synchronization.spec.ts`
  - **実装内容**:
    - ゲーム開始後、pauseボタンをクリック
    - 一時停止後、全表示が同じ時刻を保持し、更新されないことを確認
    - resumeボタンをクリック
    - 再開後、全表示が同期して更新再開することを確認
    - switchPlayerボタンをクリック
    - プレイヤー切り替え後も全表示が同期していることを確認
    - resetボタンをクリック
    - リセット後、全表示が即座に00:00にリセットされることを確認
  - **完了条件**: テスト作成完了、npx playwright testパス
  - **カバーする要件**: Req 3 (AC1,2,3,4) - タイマー状態管理の統一

## Phase 7: 実装完了処理

### 7. 実装完了処理を実施する

全ての実装とテストが完了した後、仕様を完了状態に更新します。

- [ ] 7.1 全テスト結果の確認
  - **実施内容**:
    - `npm test`を実行し、全てのユニットテストが成功することを確認
    - `npx playwright test`を実行し、全てのE2Eテストが成功することを確認
    - 実装した全機能が想定通りに動作することを確認
    - エラーや予期しない動作が発生しないことを確認
    - ブラウザで手動確認: 全てのタイマー表示が同期して更新されることを目視確認
  - **完了条件**: 全テストパス、手動確認完了、リグレッションなし

- [ ] 7.2 spec.json更新とコミット作成
  - **実施内容**:
    - `spec.json`のphaseを"implementation-done"に更新
    - tasks.mdの全タスクをチェック済み[x]に更新
    - 以下の情報を含む詳細なコミットメッセージを作成:
      - 実装内容のサマリー（forceUpdate削除、timerState追加、ポーリング同期対応）
      - カバーした全要件（Req 1-4、AC 1-17）
      - テスト結果（ユニットテスト数、E2Eテスト数）
      - 変更ファイル一覧
      - 実装複雑度: Small (S) - 実測時間
    - Gitコミットを作成（実装完了の最終コミット）
  - **完了条件**: spec.json更新、tasks.md全タスク完了、詳細なコミットメッセージでコミット作成

## 要件カバレッジマトリックス

| 要件 | 受入基準 | カバーするタスク |
|------|---------|-----------------|
| Req 1: タイマーインスタンス一元管理 | AC1: 単一タイマーインスタンス作成 | 1.2, 2.1, 5.1 |
| Req 1 | AC2: 全表示が同じインスタンス参照 | 3.1, 4.1, 5.1 |
| Req 1 | AC3: 同じタイマー値を提供 | 3.1, 5.1 |
| Req 1 | AC4: タイマー破棄時の全表示停止 | 2.2, 5.1, 7.1 |
| Req 2: タイマー更新の同期 | AC1: 1秒経過時の同時更新 | 2.1, 3.1, 3.2, 5.2, 6.1 |
| Req 2 | AC2: カウントアップ同期 | 5.2, 6.1 |
| Req 2 | AC3: カウントダウン同期 | 5.2, 6.1 |
| Req 2 | AC4: 遅延補正 | 2.2 |
| Req 3: タイマー状態管理の統一 | AC1: 一時停止時の更新停止 | 3.2, 5.3, 6.2 |
| Req 3 | AC2: 一時停止状態の時刻保持 | 5.3, 6.2 |
| Req 3 | AC3: 再開時の更新再開 | 5.3, 6.2 |
| Req 3 | AC4: リセット時の即座更新 | 5.3, 6.2 |
| Req 4: UI表示の一貫性保証 | AC1: プレイヤーカード同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC2: ターン時間同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC3: 全体プレイ時間同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC4: 最長時間プレイヤー同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC5: 全表示の同タイミング更新 | 3.1, 3.2, 3.3, 5.4, 6.1 |

**全17個の受入基準が適切にタスクにマッピングされています。**

## 実装上の注意事項

### ギャップ分析からの重要な洞察

**推奨アプローチ**: Option A - 既存コンポーネント拡張
- 最小限の変更で実現（削除: 9行、追加: 15行）
- 既存のuseGameTimerフック構造を維持
- Reactの宣言的UIパターンに統一
- 実装複雑度: Small (S) - 1.5-2日

**主要な変更点**:
1. forceUpdate()削除（96-104行目）
2. timerState追加（useState使用）
3. onTimerTickコールバック修正
4. ポーリング同期対応（useServerGameState）

### React 19.1.1 Auto-Batching

- React 19.1.1では、同一イベントループ内の複数のsetState呼び出しが自動的に1回の再レンダリングにバッチングされます
- これにより、onTimerTick内でtimerStateを更新すると、全ての子コンポーネント（タイマー表示）が同時に再レンダリングされます
- forceUpdate()パターンは不要になり、より宣言的で予測可能なコードになります

### forceUpdate()削除の重要性

- forceUpdate()は非推奨のパターンであり、Reactの宣言的な哲学に反します
- 複数のforceUpdate()呼び出しはバッチングされないため、表示のズレが発生します
- 単一のuseState更新に置き換えることで、React内部のバッチング機構により同期が保証されます

### テスト戦略

- **ユニットテスト**: コンポーネント単位でロジックを検証、高速で信頼性が高い
- **E2Eテスト**: 実際のブラウザで統合動作を検証、ユーザー体験に最も近い
- **両方のテストが必要**: ユニットテストで細部を保証し、E2Eテストで全体の同期を確認

### リスク要因と対策

**中リスク**:
1. React自動バッチングの動作検証
   - 対策: Phase 2でタイマー精度検証テストを実施
   - 影響: 低（最悪でも従来と同じ動作）

2. ポーリング同期タイミング
   - 対策: useServerGameStateのポーリングロジック検証（Task 3.3）
   - 影響: 低（既存のonServerSyncコールバック活用）

**低リスク**:
1. 既存テストのリグレッション
   - 対策: Phase 5で既存テストを全て実行
   - 影響: 極めて低（forceUpdate削除は内部実装のみ）

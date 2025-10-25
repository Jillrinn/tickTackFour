# timer-synchronization - Implementation Tasks

## 概要

この仕様は、マルチプレイヤーゲームタイマーの複数のタイマー表示（プレイヤーカード、ターン時間、全体プレイ時間、最長時間プレイヤー）が同期して更新されるようにする機能を実装します。

現在は各タイマー表示が独立して更新されているため、表示タイミングにズレが生じています。この問題を解決するため、単一のタイマーインスタンスと統一された状態管理を使用し、React 19.1.1のauto-batching機能を活用して全ての表示を同期させます。

## Phase 1: コード調査とforceUpdate特定

### 1. 既存実装の調査と分析

既存のタイマー実装を理解し、forceUpdate()の使用箇所を特定します。

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

- [ ] 2.1 onTimerTickコールバックの仕様確認
  - **ファイル**: `frontend/src/hooks/useGameTimer.ts`, `frontend/src/components/GameTimer.tsx`
  - **実装内容**:
    - onTimerTickコールバックが受け取るパラメータを確認
    - GameTimer側でonTimerTickがどのように使われているかを把握
    - 現在の実装で1秒ごとに正確に呼び出されているか確認
  - **完了条件**: onTimerTickの仕様文書化、呼び出しフロー理解
  - **カバーする要件**: Req 1 (AC2,3), Req 2 (AC1)

- [ ] 2.2 タイマー精度検証とテスト作成
  - **ファイル**: `frontend/src/hooks/__tests__/useGameTimer.test.ts` (既存ファイルに追加)
  - **実装内容**:
    - jest.useFakeTimers()を使用してタイマー精度をテスト
    - 1秒ごとの更新が正確に行われることを確認
    - 遅延が発生した場合の動作を検証
  - **完了条件**: タイマー精度テスト追加、npm testパス
  - **カバーする要件**: Req 2 (AC4)

## Phase 3: GameTimer状態管理修正

### 3. GameTimerコンポーネントの状態管理改修

forceUpdate()を排除し、単一のuseStateを使用した統一的な状態管理に移行します。

- [ ] 3.1 統合タイマー状態の設計と実装
  - **ファイル**: `frontend/src/components/GameTimer.tsx`
  - **実装内容**:
    - 新しいTypeScript型を定義: `interface TimerState { lastUpdateTime: number; forceRenderCount: number; }`
    - `const [timerState, setTimerState] = useState<TimerState>({ lastUpdateTime: 0, forceRenderCount: 0 })`を追加
    - onTimerTickコールバック内で`setTimerState({ lastUpdateTime: Date.now(), forceRenderCount: prev.forceRenderCount + 1 })`を実装
    - React 19.1.1のauto-batchingにより、同一イベントループ内の複数setState呼び出しが1回の再レンダリングにまとめられることを確認
  - **完了条件**: timerState実装完了、onTimerTick内で更新されることを確認
  - **カバーする要件**: Req 1 (AC2,3), Req 2 (AC1), Req 3 (AC1-4), Req 4 (AC5)

- [ ] 3.2 forceUpdate()呼び出しの全箇所特定
  - **ファイル**: `frontend/src/components/GameTimer.tsx`
  - **実装内容**:
    - Task 1.1の結果を再確認
    - 漏れがないことをダブルチェック
    - 各forceUpdate()をどのsetTimerState呼び出しに置き換えるか計画
  - **完了条件**: forceUpdate()置き換え計画の作成
  - **カバーする要件**: Req 2 (AC1), Req 3 (AC1-4)

- [ ] 3.3 forceUpdate()をtimerState更新に置き換え
  - **ファイル**: `frontend/src/components/GameTimer.tsx`
  - **実装内容**:
    - 全てのforceUpdate()呼び出しを`setTimerState(prev => ({ ...prev, forceRenderCount: prev.forceRenderCount + 1 }))`に置き換え
    - タイマー更新以外のforceUpdate()（例: pause/resume/reset時）も同様に置き換え
    - npm run devで開発サーバーを起動して動作確認
    - ブラウザで全てのタイマー表示が正常に更新されることを確認
  - **完了条件**: 全forceUpdate()削除完了、ブラウザで動作確認、型エラーなし
  - **カバーする要件**: Req 2 (AC1), Req 3 (AC1-4)

## Phase 4: タイマー表示コンポーネント更新

### 4. タイマー表示コンポーネントのprops駆動化

各タイマー表示が完全にprops駆動で動作するようにし、独自の状態やタイマーを持たないようにします。

- [ ] 4.1 各表示コンポーネントのprops構造確認
  - **ファイル**: `frontend/src/components/GameTimer.tsx`内の各表示セクション
  - **実装内容**:
    - プレイヤーカード、ターン時間、全体プレイ時間、最長時間プレイヤーの各表示がpropsで時間を受け取っているか確認
    - props変更で自動的に再レンダリングされる構造になっているか検証
    - 必要に応じてprops構造を改善
  - **完了条件**: 各表示がprops駆動であることを確認、必要な改善を実施
  - **カバーする要件**: Req 4 (AC1-5)

- [ ] 4.2 独自状態や独自タイマーの削除
  - **ファイル**: `frontend/src/components/GameTimer.tsx`内の各表示セクション
  - **実装内容**:
    - 各表示コンポーネント内で独自にuseState、useEffect、forceUpdate()を使用している箇所を特定
    - あれば全て削除し、完全にprops駆動のレンダリングに変更
    - timerStateの変更により自動的に全表示が再レンダリングされることを確認
  - **完了条件**: 独自状態・タイマー削除完了、ブラウザで動作確認
  - **カバーする要件**: Req 4 (AC1-5)

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
      - 実装内容のサマリー
      - カバーした全要件（Req 1-4、AC 1-17）
      - テスト結果（ユニットテスト数、E2Eテスト数）
      - 変更ファイル一覧
    - Gitコミットを作成（実装完了の最終コミット）
  - **完了条件**: spec.json更新、tasks.md全タスク完了、詳細なコミットメッセージでコミット作成

## 要件カバレッジマトリックス

| 要件 | 受入基準 | カバーするタスク |
|------|---------|-----------------|
| Req 1: タイマーインスタンス一元管理 | AC1: 単一タイマーインスタンス作成 | 1.2, 2.1, 5.1 |
| Req 1 | AC2: 全表示が同じインスタンス参照 | 3.1, 4.1, 5.1 |
| Req 1 | AC3: 同じタイマー値を提供 | 3.1, 5.1 |
| Req 1 | AC4: タイマー破棄時の全表示停止 | 2.2, 5.1, 7.1 |
| Req 2: タイマー更新の同期 | AC1: 1秒経過時の同時更新 | 2.1, 3.1, 3.3, 5.2, 6.1 |
| Req 2 | AC2: カウントアップ同期 | 5.2, 6.1 |
| Req 2 | AC3: カウントダウン同期 | 5.2, 6.1 |
| Req 2 | AC4: 遅延補正 | 2.2 |
| Req 3: タイマー状態管理の統一 | AC1: 一時停止時の更新停止 | 3.3, 5.3, 6.2 |
| Req 3 | AC2: 一時停止状態の時刻保持 | 5.3, 6.2 |
| Req 3 | AC3: 再開時の更新再開 | 5.3, 6.2 |
| Req 3 | AC4: リセット時の即座更新 | 5.3, 6.2 |
| Req 4: UI表示の一貫性保証 | AC1: プレイヤーカード同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC2: ターン時間同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC3: 全体プレイ時間同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC4: 最長時間プレイヤー同期表示 | 4.1, 4.2, 5.4, 6.1 |
| Req 4 | AC5: 全表示の同タイミング更新 | 3.1, 3.3, 5.4, 6.1 |

**全17個の受入基準が適切にタスクにマッピングされています。**

## 実装上の注意事項

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

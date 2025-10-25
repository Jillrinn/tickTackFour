# timer-synchronization - 実装ギャップ分析レポート（更新版）

生成日時: 2025-01-25
フェーズ: Implementation Gap Validation
言語: 日本語

## エグゼクティブサマリー

### 機能スコープ
複数のタイマー表示（プレイヤーカードの経過時間、ターン時間、全体プレイ時間、最長時間プレイヤー）の同期問題を解決し、全ての表示が1秒ごとに同期して更新されるようにする。

### ユーザー追加要求の分析
> 「私は、画面上のタイマーが全て同時に動いていることを期待していました。しかし、現状の実装はそうではないように思えます。経過時間と現在のターンとかは特に、同じタイミングで時間が変わっていないように見えます」

**技術的解釈**:
- ユーザーが指摘している「経過時間」: プレイヤーカードの`elapsedTimeSeconds`表示
- ユーザーが指摘している「現在のターン」: ターン時間表示（`getCurrentTurnTime()`）
- 問題: これら2つの表示が同じタイミングで更新されていない

### 根本原因の特定

**Phase 1調査の再検証により、以下の重大な問題が判明**:

#### 問題1: 2つの独立したsetIntervalが並行動作
現在のコードベースには、**2つの独立したタイマーインスタンス**が存在し、それぞれが独立して1秒ごとに動作しています：

1. **useGameState内のsetInterval** (`frontend/src/hooks/useGameState.ts: 269-317`)
   - 1秒ごとに`setGameState`を呼び出し
   - `player.elapsedTimeSeconds`を更新（カウントアップ/カウントダウン）
   - **影響範囲**: プレイヤーカードの経過時間表示
   - **更新メカニズム**: Reactの状態更新による再レンダリング

2. **GameTimer.tsx内のsetInterval** (`frontend/src/components/GameTimer.tsx: 96-104`)
   - 1秒ごとに`forceUpdate()`を呼び出し
   - コンポーネント全体を強制的に再レンダリング
   - `getCurrentTurnTime()`を再計算させる
   - **影響範囲**: ターン時間表示
   - **更新メカニズム**: forceUpdate()による強制再レンダリング

#### 問題2: タイマー実行タイミングのズレ
2つのsetIntervalは以下の理由で実行タイミングがズレます：

1. **開始タイミングの違い**:
   - useGameStateのuseEffectは`gameState.activePlayerId`と`gameState.isPaused`の変更時に再実行
   - GameTimer.tsxのuseEffectは`isInFallbackMode`、`isPaused`、`gameState?.activePlayerId`の変更時に再実行
   - 依存配列が異なるため、開始タイミングがズレる可能性が高い

2. **JavaScript実行環境の特性**:
   - setInterval(callback, 1000)は、正確に1000msごとに実行される保証がない
   - ブラウザの負荷、他のタスク、イベントループの状態により、実行タイミングが数ms～数十msズレる
   - 2つの独立したsetIntervalは、それぞれ独自のタイミングでドリフトする

3. **再レンダリングメカニズムの違い**:
   - useGameStateのsetInterval: `setGameState`によるReactの標準的な状態更新
   - GameTimerのsetInterval: `forceUpdate()`による強制再レンダリング
   - これらは異なるレンダリングサイクルで実行されるため、画面更新タイミングが一致しない

#### 問題3: useGameTimerフックが未使用
**重大な発見**: `frontend/src/hooks/useGameTimer.ts`は定義されているが、`GameTimer.tsx`で**全く使用されていない**。

- Phase 1調査レポートでは「useGameTimerが既に単一のsetIntervalを使用している」と報告
- しかし、実際にはGameTimer.tsxでuseGameTimerフックは呼び出されていない
- 代わりに、useGameState内のuseEffectが直接タイマーを管理している

### 主要な技術課題
1. **2つの独立したsetIntervalを1つに統合する**: useGameState内のタイマーとGameTimer.tsx内のforceUpdate()
2. **forceUpdate()パターンの排除**: Reactの宣言的UIパターンに統一
3. **タイマー更新の単一イベントループ化**: 全てのタイマー表示が同じsetIntervalから更新される
4. **React自動バッチングの活用**: React 19.1.1の機能を活用して同期レンダリングを保証

### 全体的な実装アプローチ推奨
**ハイブリッドアプローチ（拡張 + 最小限の統合）**
- useGameState内の既存タイマーを維持しつつ、GameTimer.tsx内のforceUpdate()を排除
- useGameTimerフックは使用せず、useGameState内のタイマーに一本化
- 複雑度: **Medium (M)** - 3-5日、既存パターンの改善と統合が必要

## 既存コードベースの洞察

### 関連する既存コンポーネントと責務

#### 1. useGameState (frontend/src/hooks/useGameState.ts)

**現在の責務**:
- フォールバックモードのゲーム状態管理
- **重要**: useEffect（263-321行目）で1秒ごとのsetIntervalを実行
- setGameStateを呼び出してelapsedTimeSecondsを更新
- カウントアップ/カウントダウンロジック実装済み

**タイマー実装の詳細** (269-317行目):
```typescript
useEffect(() => {
  if (!gameState.activePlayerId || gameState.isPaused) {
    return;
  }

  const timerId = setInterval(() => {
    setGameState((prev) => {
      // elapsedTimeSecondsを更新
      const newElapsedTime = prev.timerMode === 'count-up'
        ? activePlayer.elapsedTimeSeconds + 1
        : Math.max(0, activePlayer.elapsedTimeSeconds - 1);

      // プレイヤー情報を更新
      const updatedPlayers = prev.players.map(p =>
        p.id === prev.activePlayerId
          ? { ...p, elapsedTimeSeconds: newElapsedTime }
          : p
      );

      return { ...prev, players: updatedPlayers, lastUpdatedAt: new Date() };
    });
  }, 1000);

  return () => clearInterval(timerId);
}, [gameState.activePlayerId, gameState.isPaused]);
```

**拡張が必要な部分**:
- このタイマーに、ターン時間表示の再レンダリングも統合する必要がある
- forceUpdate()に頼らず、状態更新で全表示を同期させる

#### 2. GameTimer.tsx (frontend/src/components/GameTimer.tsx)

**現在の責務**:
- メインタイマーコンポーネント
- useGameState（フォールバックモード）またはuseServerGameState（通常モード）を使用
- **問題箇所**: 96-104行目で独自のsetIntervalとforceUpdate()を使用

**forceUpdate()実装の詳細** (95-104行目):
```typescript
// 強制的に再レンダリングしてgetCurrentTurnTime()の表示を更新
const [, forceUpdate] = React.useReducer(x => x + 1, 0);
React.useEffect(() => {
  if (isInFallbackMode && !isPaused && gameState?.activePlayerId) {
    const interval = setInterval(() => {
      forceUpdate();
    }, 1000);
    return () => clearInterval(interval);
  }
}, [isInFallbackMode, isPaused, gameState?.activePlayerId]);
```

**削除が必要な部分**:
- 96-104行目のforceUpdate()メカニズム全体
- これをuseGameState内のタイマーに統合する

#### 3. useGameTimer.ts (frontend/src/hooks/useGameTimer.ts)

**現在の状況**:
- ✅ 定義済み: 単一のsetIntervalを使用、onTimerTickコールバックで状態更新を通知
- ❌ 未使用: GameTimer.tsxで全く使用されていない

**現在の実装** (65-102行目):
```typescript
// 1秒ごとのタイマー
timerRef.current = setInterval(() => {
  const currentPlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
  if (!currentPlayer) return;

  let newElapsedTime = gameState.timerMode === 'count-up'
    ? currentElapsedTimeRef.current + 1
    : Math.max(0, currentElapsedTimeRef.current - 1);

  currentElapsedTimeRef.current = newElapsedTime;
  onTimerTick(currentPlayer.id, newElapsedTime);
}, 1000);
```

**今後の扱い**:
- **使用しない**: useGameState内のタイマーで十分
- このフックは削除せず、将来的な拡張のために保持
- 現時点では、useGameState内のタイマーに一本化する

#### 4. タイマー表示コンポーネント群

**プレイヤーカード経過時間** (457行目):
```typescript
<div className="player-time">経過時間: {formatTime(player.elapsedTimeSeconds)}</div>
```
- ✅ Props駆動: `player.elapsedTimeSeconds`（useGameStateのsetIntervalで更新）

**ターン時間表示** (460行目):
```typescript
{player.isActive && player.turnStartedAt && (
  <div className="turn-time" data-testid="turn-time">
    現在のターン: {formatTime(fallbackState.getCurrentTurnTime())}
  </div>
)}
```
- ⚠️ 問題: `getCurrentTurnTime()`は計算関数（Date.now()とturnStartedAtの差分）
- forceUpdate()に依存して再計算が強制される
- **解決策**: useGameState内のタイマーでturCurrentTurnTimeSecondsのような状態を持つ

### 確立されたパターンと規約

#### タイマー更新パターン
```typescript
// 既存パターン（useGameState内のuseEffect）
useEffect(() => {
  if (!gameState.activePlayerId || gameState.isPaused) return;

  const timerId = setInterval(() => {
    setGameState((prev) => {
      // 状態更新（elapsedTimeSeconds等）
    });
  }, 1000);

  return () => clearInterval(timerId);
}, [gameState.activePlayerId, gameState.isPaused]);
```

#### コンポーネント設計パターン
- **Props駆動**: 状態は上位コンポーネント（useGameState）で管理、Propsで下位に渡す
- **単一責任**: 各コンポーネントは一つの機能に特化
- **カスタムフック**: ビジネスロジックはフックに集約

## 実装戦略オプション

### オプションA: useGameState内タイマーの拡張（推奨）

**アプローチ**: useGameState内の既存タイマーを拡張し、ターン時間を状態として管理することで、forceUpdate()を排除する

**実装詳細**:

1. **useGameState内に新しい状態を追加**:
   ```typescript
   // gameStateにcurrentTurnTimeSecondsを追加
   export interface GameState {
     // ... 既存フィールド
     currentTurnTimeSeconds: number; // 新規追加
   }
   ```

2. **useGameState内のsetIntervalでcurrentTurnTimeSecondsを更新**:
   ```typescript
   useEffect(() => {
     if (!gameState.activePlayerId || gameState.isPaused) return;

     const timerId = setInterval(() => {
       setGameState((prev) => {
         const activePlayer = prev.players.find(p => p.id === prev.activePlayerId);
         if (!activePlayer) return prev;

         // 既存: elapsedTimeSeconds更新
         const newElapsedTime = prev.timerMode === 'count-up'
           ? activePlayer.elapsedTimeSeconds + 1
           : Math.max(0, activePlayer.elapsedTimeSeconds - 1);

         // 新規: currentTurnTimeSecondsを計算
         const currentTurnTimeSeconds = activePlayer.turnStartedAt
           ? Math.floor((Date.now() - activePlayer.turnStartedAt.getTime()) / 1000)
           : 0;

         const updatedPlayers = prev.players.map(p =>
           p.id === prev.activePlayerId
             ? { ...p, elapsedTimeSeconds: newElapsedTime }
             : p
         );

         return {
           ...prev,
           players: updatedPlayers,
           currentTurnTimeSeconds, // 新規追加
           lastUpdatedAt: new Date()
         };
       });
     }, 1000);

     return () => clearInterval(timerId);
   }, [gameState.activePlayerId, gameState.isPaused]);
   ```

3. **GameTimer.tsxでforceUpdate()を削除** (96-104行目):
   ```typescript
   // 削除: forceUpdate()メカニズム全体
   // const [, forceUpdate] = React.useReducer(x => x + 1, 0);
   // React.useEffect(() => { ... }, [...]);
   ```

4. **ターン時間表示をProps駆動に変更**:
   ```typescript
   // 変更前:
   // <div className="turn-time">現在のターン: {formatTime(fallbackState.getCurrentTurnTime())}</div>

   // 変更後:
   <div className="turn-time" data-testid="turn-time">
     現在のターン: {formatTime(gameState.currentTurnTimeSeconds)}
   </div>
   ```

**利点**:
- ✅ 単一のsetIntervalで全タイマー表示を管理
- ✅ forceUpdate()パターンを排除、Reactの宣言的UIに統一
- ✅ React 19.1.1の自動バッチングにより、同じレンダリングサイクルで全表示が更新
- ✅ 既存のuseGameState構造を活用（最小限の変更）

**欠点**:
- GameState型にフィールド追加が必要（currentTurnTimeSeconds）
- getCurrentTurnTime()関数が不要になる（または内部でcurrentTurnTimeSecondsを返すように変更）

**トレードオフ**:
- 複雑度増加: 中（GameState型変更、既存タイマーロジック拡張）
- パフォーマンス: 改善（forceUpdate削除、単一setInterval）
- メンテナンス性: 向上（標準的なReactパターン、単一のタイマーソース）

**複雑度**: **Medium (M)** - 3-5日
- 理由:
  - GameState型定義の変更（frontend/src/types/GameState.ts）
  - useGameState内のタイマーロジック拡張
  - GameTimer.tsxのforceUpdate削除とProps駆動化
  - 既存のgetCurrentTurnTime()使用箇所の置き換え
  - useServerGameStateにも同様の変更が必要（通常モード対応）
  - ユニットテスト・E2Eテストの更新

### オプションB: useGameTimerフックの活用（非推奨）

**アプローチ**: 既存のuseGameTimerフックを活用し、useGameState内のタイマーとGameTimer.tsx内のforceUpdate()を両方置き換える

**実装詳細**:
1. GameTimer.tsxでuseGameTimerフックを呼び出す
2. onTimerTickコールバックで、useGameStateのupdatePlayerTimeを呼び出す
3. 同じonTimerTickコールバックで、timerStateを更新してターン時間表示も再レンダリング
4. useGameState内のタイマーuseEffectを削除

**利点**:
- タイマーロジックがuseGameTimerフックに集約される
- onTimerTickコールバックで柔軟に処理を追加できる

**欠点**:
- ❌ useGameState内の既存タイマーを削除する必要がある（破壊的変更）
- ❌ useGameStateの責務が変わる（タイマー管理からタイマーコールバック処理に）
- ❌ useGameTimerフックの設計が現在のuseGameStateと異なる（Player型ではなくGameState型を想定）
- ❌ 既存のuseGameState構造を大幅に変更する必要がある

**トレードオフ**:
- 複雑度増加: 大（useGameStateの大規模リファクタリング）
- パフォーマンス: 同等
- メンテナンス性: 低下（既存パターンとの乖離）

**複雑度**: **Large (L)** - 1-2週間
- 理由: useGameStateの大規模リファクタリング、既存コードへの影響大

**推奨しない理由**: 破壊的変更が大きすぎる、既存のuseGameState構造を活用する方が効率的

### オプションC: forceUpdate()のみ削除し、getCurrentTurnTime()は保持（部分対応、非推奨）

**アプローチ**: GameTimer.tsx内のforceUpdate()を削除し、useGameState内のタイマーのみに頼る。ターン時間表示はgetCurrentTurnTime()を使い続けるが、forceUpdate()なしで再レンダリングを期待する。

**実装詳細**:
1. GameTimer.tsx 96-104行目のforceUpdate()を削除
2. ターン時間表示は`fallbackState.getCurrentTurnTime()`のまま
3. useGameState内のタイマーがsetGameStateを呼び出すと、GameTimer全体が再レンダリングされるので、getCurrentTurnTime()も再計算される

**利点**:
- 最小限の変更（forceUpdate削除のみ）
- GameState型定義の変更不要

**欠点**:
- ❌ 同期が保証されない可能性が高い
  - setGameState呼び出しによる再レンダリングと、getCurrentTurnTime()の再計算は同じイベントループで行われるが、getCurrentTurnTime()はDate.now()を使うため、タイミングズレが発生する可能性
  - elapsedTimeSecondsの更新（setInterval基準）とgetCurrentTurnTime()の計算（Date.now()基準）は異なるタイムソースを使用
- ❌ React自動バッチングの恩恵を完全には受けられない

**トレードオフ**:
- 複雑度増加: 小（forceUpdate削除のみ）
- パフォーマンス: 改善（forceUpdate削除）
- メンテナンス性: 低（Date.now()とsetIntervalの2つのタイムソース）

**複雑度**: **Small (S)** - 1-2日
- 理由: forceUpdate削除のみ

**推奨しない理由**: 同期が保証されない、Date.now()とsetIntervalの2つのタイムソースが混在

## 技術調査要件

### 外部依存関係の分析
**結論**: 新しい外部依存関係は**不要**

- React 19.1.1: 既存、自動バッチング機能を活用
- TypeScript 5.9: 既存、型定義のみ使用
- useGameState: 既存フック、拡張のみ

### 知識ギャップの評価
**必要な調査**: なし（既存技術の活用のみ）

- ✅ React useState: チーム既知
- ✅ React auto-batching: React 18以降のデフォルト機能
- ✅ useGameState: 既存フック、タイマーロジック理解済み

### パフォーマンスとセキュリティの考慮事項
**パフォーマンス**:
- ✅ 2つのsetIntervalを1つに統合（CPU負荷軽減）
- ✅ forceUpdate排除により改善
- ✅ React自動バッチングで最適化
- ✅ 不要な再レンダリングなし

**セキュリティ**:
- 影響なし（クライアントサイドの表示ロジックのみ）

## 実装複雑度評価

### 労力見積もり
**推奨アプローチ（オプションA）**: **Medium (M)** - 3-5日

**内訳**:
- Phase 1調査: 完了（既存）
- Phase 2実装: 1-2日
  - GameState型定義変更: 0.2日
  - useGameState内タイマー拡張（currentTurnTimeSeconds追加）: 0.5日
  - GameTimer.tsxのforceUpdate削除: 0.2日
  - ターン時間表示のProps駆動化: 0.2日
  - useServerGameStateにも同様の変更（通常モード対応）: 0.3-0.5日
  - 動作確認とデバッグ: 0.3日
- Phase 3ユニットテスト: 1日
  - GameState型のテスト更新: 0.2日
  - useGameStateタイマーロジックテスト: 0.4日
  - GameTimerコンポーネントテスト: 0.4日
- Phase 4 E2Eテスト: 0.5-1日
  - timer-synchronization.spec.ts: 全表示同期検証
- Phase 5完了処理: 0.2日

**総計**: 3-5日（24-40時間）

### リスク要因

#### 高リスク
なし

#### 中リスク
1. **GameState型定義の変更影響**
   - リスク: currentTurnTimeSecondsフィールド追加により、既存コードに影響
   - 対策: TypeScriptの型チェックで全影響箇所を特定、段階的に修正
   - 影響: 中（型定義は多くのファイルで使用される）

2. **useServerGameStateの同様の変更**
   - リスク: フォールバックモード（useGameState）と通常モード（useServerGameState）の両方で変更が必要
   - 対策: useGameStateで実装・テスト後、useServerGameStateに適用
   - 影響: 中（通常モードのテスト環境構築が必要）

3. **React自動バッチングの動作検証**
   - リスク: 想定通りにバッチングされない可能性
   - 対策: Phase 3でタイマー精度検証テストを実施
   - 影響: 低（最悪でも従来と同じ動作）

#### 低リスク
1. **既存テストのリグレッション**
   - リスク: 既存のGameTimerテストが失敗する可能性
   - 対策: Phase 3で既存テストを全て実行
   - 影響: 極めて低（forceUpdate削除は内部実装のみ）

## 設計フェーズへの推奨事項

### 推奨実装アプローチ
**オプションA: useGameState内タイマーの拡張**を強く推奨

**理由**:
1. ✅ 既存の useGameState 構造を活用
2. ✅ 単一のsetIntervalで全タイマー表示を管理
3. ✅ forceUpdate()パターンを排除
4. ✅ React 19.1.1の自動バッチングを活用
5. ✅ 実装コストが適正（3-5日）
6. ✅ リスクが管理可能（中リスク2件、低リスク1件）

### 主要なアーキテクチャ決定事項

#### 1. GameState型の拡張
```typescript
export interface GameState {
  // ... 既存フィールド
  currentTurnTimeSeconds: number; // 新規追加
}
```

#### 2. useGameState内タイマーの拡張
- setInterval内でcurrentTurnTimeSecondsを計算・更新
- setGameState呼び出し時に、elapsedTimeSecondsとcurrentTurnTimeSecondsを同時に更新
- React自動バッチングにより、1回の再レンダリングで全表示が更新

#### 3. GameTimer.tsxのforceUpdate削除
- 96-104行目のforceUpdate()メカニズム全体を削除
- ターン時間表示をProps駆動に変更（`gameState.currentTurnTimeSeconds`使用）

#### 4. useServerGameStateの同様の対応
- フォールバックモード（useGameState）と同じ変更を適用
- ポーリング時にcurrentTurnTimeSecondsも更新

### 設計フェーズで更なる調査が必要な領域

#### 1. getCurrentTurnTime()関数の扱い
**調査項目**:
- getCurrentTurnTime()関数を削除するか、currentTurnTimeSecondsを返すように変更するか
- 既存の使用箇所を全て特定し、置き換え戦略を決定

**重要度**: 中
**Phase**: Phase 2実装時に決定

#### 2. useServerGameStateのポーリング詳細
**調査項目**:
- ポーリング間隔の確認（現在5秒？）
- ETag更新タイミングの確認
- currentTurnTimeSeconds更新のベストタイミング

**重要度**: 中
**Phase**: Phase 2実装時に確認

#### 3. React自動バッチング動作検証
**調査項目**:
- useEffect内のsetStateがバッチングされるか
- setGameState呼び出し時に、elapsedTimeSecondsとcurrentTurnTimeSecondsが同時に更新されるか

**重要度**: 中
**Phase**: Phase 3ユニットテスト時に検証

### 設計フェーズで対処すべき潜在的リスク

#### リスク1: GameState型変更の影響範囲
**発生条件**: currentTurnTimeSecondsフィールド追加により、既存コードに予期しない影響

**対策**:
1. Phase 2でTypeScriptの型チェックを実行し、全影響箇所を特定
2. 段階的に修正（useGameState → GameTimer.tsx → その他）
3. 各修正後にユニットテストを実行

**影響**: 中（型定義は多くのファイルで使用される）

#### リスク2: useServerGameStateの同様の変更コスト
**発生条件**: フォールバックモードの実装後、通常モードに適用する際の追加コスト

**対策**:
1. useGameStateで実装・テスト後、useServerGameStateに適用
2. useServerGameStateのタイマーロジックを理解してから適用
3. 通常モードのE2Eテストで検証

**影響**: 中（通常モードのテスト環境構築が必要）

## 結論

### 実装アプローチ決定
**推奨**: オプションA - useGameState内タイマーの拡張

### 主要な根拠
1. **根本原因の解決**: 2つの独立したsetIntervalを1つに統合
2. **最小限の破壊的変更**: 既存のuseGameState構造を活用
3. **適正な実装コスト**: 3-5日で完了可能
4. **高品質**: Reactの標準パターンに統一、メンテナンス性向上
5. **リスク管理可能**: 中リスク2件、低リスク1件

### 次のステップ
1. ✅ Phase 1調査: 完了（根本原因特定）
2. ⏭️ Phase 2実装: GameState型拡張とuseGameState内タイマー拡張
3. ⏭️ Phase 3実装: GameTimer.tsxのforceUpdate削除とProps駆動化
4. ⏭️ Phase 4実装: useServerGameStateの同様の対応
5. ⏭️ Phase 5テスト: ユニットテスト実装
6. ⏭️ Phase 6テスト: E2Eテスト実装
7. ⏭️ Phase 7完了: spec.json更新とコミット

### ユーザー追加要求への対応
✅ **完全対応可能**:
- 「経過時間と現在のターンが同じタイミングで時間が変わっていない」問題の解決
- 単一のsetIntervalによる全タイマー表示の同期
- React自動バッチングによる同時レンダリング保証

すべての要求が推奨アプローチ（オプションA）により実現可能です。

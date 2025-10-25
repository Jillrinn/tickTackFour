# timer-synchronization ギャップ分析レポート

## 分析日時
2025-01-26

## ユーザーからのフィードバック

> 私が期待している状態に何一つなってないです。
> 1. 全てのタイマーが同じタイミングで秒が増加/減少すること
> 2. 「ゲーム全体」のタイマーは他のタイマーと同じように秒が増減し、ポーリングごとに最新の秒に更新されること
> この二つを守ってほしいのに、何一つうまく言ってないです。

## 要件との乖離分析

### 要件2: すべてのタイマー表示が同じタイミングで更新される

**要件定義** (requirements.md):
- 全てのタイマー表示が同じタイミングで秒が増加/減少すること
- React 19の自動バッチング機能により、複数の状態更新が1回のレンダリングで反映されること

**実装状況**:
- ❌ **ゲーム全体（getTotalGameTime）が同期されていない**
- ✅ プレイヤーカード経過時間（`player.elapsedTimeSeconds`）: 同期
- ✅ ターン時間表示（`getCurrentTurnTime()`）: 同期
- ❌ **ゲーム全体時間（`getTotalGameTime()`）: 同期されていない**
- ✅ 最も時間を使っているプレイヤー（`getLongestTimePlayer()`）: 同期

**ギャップ**: 4つのタイマー表示のうち、**ゲーム全体時間のみが同期されていない**

### 要件3: ポーリング同期により最新の秒に更新される

**要件定義** (requirements.md):
- 5秒ごとのサーバーポーリングで最新の状態を取得
- すべてのタイマー表示が最新の秒に更新される

**実装状況**:
- ✅ プレイヤー経過時間: ポーリングで更新される
- ✅ ターン時間: ポーリングで更新される
- ❌ **ゲーム全体時間: ポーリングで更新されない**
- ✅ 最も時間を使っているプレイヤー: ポーリングで更新される

**ギャップ**: **ゲーム全体時間がポーリング同期で更新されない**

## 根本原因の特定

### 原因1: getTotalGameTime()がタイマー更新に反応しない

**問題コード** (useGameState.ts:495-503):

```typescript
const getTotalGameTime = useCallback((): number => {
  if (gameState.players.length === 0) {
    return 0;
  }
  return gameState.players.reduce((total, player) => total + player.elapsedTimeSeconds, 0);
}, [gameState.players]);
```

**依存配列の問題**:
- `useCallback`の依存配列が`[gameState.players]`（配列参照）
- **プレイヤーの`elapsedTimeSeconds`が更新されても、配列参照が変わらない限り再計算されない**
- タイマー tick で`updatePlayerTime()`が呼ばれても、`gameState.players`配列自体は同じ参照

**具体例**:
```typescript
// タイマー tick時
fallbackState.updatePlayerTime(playerId, newElapsedTime); // プレイヤーの時間を+1秒更新
// → gameState.players[0].elapsedTimeSeconds が 10 → 11 に変更
// → しかし gameState.players 配列の参照は変わらない
// → getTotalGameTime() の useCallback は再計算されない
// → 古い値（10秒前の合計）を返し続ける
```

### 原因2: GameTimer.tsxでgetTotalGameTime()呼び出し時に再レンダリングされない

**問題コード** (GameTimer.tsx:390-414):

```typescript
<div className="total-game-time" data-testid="total-game-time">
  <span className="total-game-time-label">ゲーム全体:</span>
  <span className={`total-game-time-value ${...}`}>
    {isInFallbackMode
      ? fallbackState.formatGameTime(fallbackState.getTotalGameTime())
      : serverGameState.formatGameTime(serverGameState.getTotalGameTime())
    }
  </span>
</div>
```

**レンダリングタイミングの問題**:
- このコードはGameTimerコンポーネントのレンダリング時に`getTotalGameTime()`を呼び出す
- しかし、**タイマー tick で`setTurnTimeUpdateTrigger`が更新されても、GameTimerは再レンダリングされない**
- `turnTimeUpdateTrigger`はターン時間表示（`getCurrentTurnTime()`）のみに使用され、ゲーム全体時間には影響しない

**フロー図**:

```
1秒tick発生
  ↓
useGameTimerのonTimerTickコールバック実行
  ↓
fallbackState.updatePlayerTime(playerId, newElapsedTime)
  → プレイヤー経過時間更新（OK）
  ↓
setTurnTimeUpdateTrigger(prev => prev + 1)
  → ターン時間表示再レンダリング（OK）
  ↓
しかし、getTotalGameTime()は再計算されない（NG）
  ∵ useCallbackの依存配列がplayers配列参照
  ∵ GameTimerコンポーネントが再レンダリングされない
```

### 原因3: useServerGameStateでも同じ問題

**問題コード** (useServerGameState.ts:150-154):

```typescript
const getTotalGameTime = useCallback((): number => {
  if (!serverState || serverState.players.length === 0) return 0;
  return serverState.players.reduce((total, player) => total + player.elapsedSeconds, 0);
}, [serverState]);
```

**同じ問題**:
- `[serverState]`が依存配列
- ポーリング時に`serverState`が更新されても、**オブジェクト参照が変わらない限り再計算されない**
- `usePollingSync`の実装を確認する必要がある

## 設計の誤り

### 設計書の前提条件が間違っていた

**design.md Phase 3の設計**:

> ### Phase 3.2: useGameTimerフックとの統合
>
> **実装内容**:
> - GameTimer.tsxでuseGameTimerフックを呼び出し
> - **onTimerTickコールバック内でupdatePlayerTimeとsetTurnTimeUpdateTriggerを実行**
> - **React 19の自動バッチングにより、複数の状態更新が1回のレンダリングで反映される**

**設計の誤解**:
- `setTurnTimeUpdateTrigger`だけでは**全てのタイマー表示が再レンダリングされるわけではない**
- `getTotalGameTime()`は`useCallback`のメモ化により、**依存配列が変わらない限り再計算されない**
- React自動バッチングは「複数のsetStateが1回のレンダリングで反映される」だけで、**メモ化された関数の再計算を保証するわけではない**

### Phase 3の実装が不完全

**実装されたコード** (GameTimer.tsx:101-111):

```typescript
useGameTimer(
  isInFallbackMode && gameState ? gameState : { ... },
  (playerId, newElapsedTime) => {
    if (isInFallbackMode && gameState) {
      fallbackState.updatePlayerTime(playerId, newElapsedTime);
      setTurnTimeUpdateTrigger(prev => prev + 1); // ⚠️ ターン時間のみ
    }
  }
);
```

**不足している実装**:
- ゲーム全体時間を再計算するための状態更新がない
- 最も時間を使っているプレイヤーを再計算するための状態更新がない

**偶然動いているコード**:
- 最も時間を使っているプレイヤー（`getLongestTimePlayer()`）: `longestPlayer` stateが別途管理されているため動作している（偶然）

## 修正が必要な箇所

### 1. useGameState.tsのgetTotalGameTime依存配列修正

**現在**:
```typescript
const getTotalGameTime = useCallback((): number => {
  if (gameState.players.length === 0) return 0;
  return gameState.players.reduce((total, player) => total + player.elapsedTimeSeconds, 0);
}, [gameState.players]); // ❌ 配列参照のみ
```

**修正案**:
```typescript
const getTotalGameTime = useCallback((): number => {
  if (gameState.players.length === 0) return 0;
  return gameState.players.reduce((total, player) => total + player.elapsedTimeSeconds, 0);
}, [gameState.players.map(p => p.elapsedTimeSeconds)]); // ✅ 各プレイヤーの時間を含める
```

**または、メモ化を諦める案**:
```typescript
const getTotalGameTime = (): number => {
  if (gameState.players.length === 0) return 0;
  return gameState.players.reduce((total, player) => total + player.elapsedTimeSeconds, 0);
}; // ✅ useCallbackを使わない（毎回再計算）
```

### 2. GameTimer.tsxでゲーム全体時間用の状態追加

**現在**:
```typescript
const [turnTimeUpdateTrigger, setTurnTimeUpdateTrigger] = React.useState(0);

useGameTimer(
  ...,
  (playerId, newElapsedTime) => {
    fallbackState.updatePlayerTime(playerId, newElapsedTime);
    setTurnTimeUpdateTrigger(prev => prev + 1); // ターン時間のみ
  }
);
```

**修正案1: 汎用的な状態を使う**:
```typescript
const [timerUpdateTrigger, setTimerUpdateTrigger] = React.useState(0);

useGameTimer(
  ...,
  (playerId, newElapsedTime) => {
    fallbackState.updatePlayerTime(playerId, newElapsedTime);
    setTimerUpdateTrigger(prev => prev + 1); // 全タイマー表示を再レンダリング
  }
);
```

**修正案2: getTotalGameTime結果をstateで管理**:
```typescript
const [totalGameTime, setTotalGameTime] = React.useState(0);

useGameTimer(
  ...,
  (playerId, newElapsedTime) => {
    fallbackState.updatePlayerTime(playerId, newElapsedTime);
    setTurnTimeUpdateTrigger(prev => prev + 1);
    setTotalGameTime(fallbackState.getTotalGameTime()); // 最新値を取得
  }
);

// レンダリング時
<span>{formatTime(totalGameTime)}</span>
```

### 3. useServerGameStateのgetTotalGameTime依存配列修正

**現在**:
```typescript
const getTotalGameTime = useCallback((): number => {
  if (!serverState || serverState.players.length === 0) return 0;
  return serverState.players.reduce((total, player) => total + player.elapsedSeconds, 0);
}, [serverState]); // ❌ オブジェクト参照のみ
```

**修正案**:
```typescript
const getTotalGameTime = useCallback((): number => {
  if (!serverState || serverState.players.length === 0) return 0;
  return serverState.players.reduce((total, player) => total + player.elapsedSeconds, 0);
}, [serverState?.players.map(p => p.elapsedSeconds)]); // ✅ 各プレイヤーの時間を含める
```

## 推奨される修正方針

### 方針: getTotalGameTime結果をstateで管理する

**理由**:
- `useCallback`の依存配列を深く追跡するのは複雑でバグを生みやすい
- タイマー tick ごとに再計算しても、計算コストは低い（O(n) where n = プレイヤー数）
- React状態管理の原則に従う: 派生値を計算するのではなく、状態として管理する

**実装手順**:

1. **GameTimer.tsxに`totalGameTime` stateを追加**
2. **useGameTimerのonTimerTickで`getTotalGameTime()`を呼び出して状態更新**
3. **レンダリング時に`totalGameTime` stateを表示**

**メリット**:
- タイマー tick ごとにゲーム全体時間が確実に更新される
- ポーリング同期時も`getTotalGameTime()`を呼び出して更新すれば最新値に同期
- `useCallback`依存配列の複雑さを回避

**デメリット**:
- 追加のstateが必要（メモリ使用量微増）
- 同じ値の再計算が発生する可能性（ただし計算コストは低い）

## 修正の優先順位

### Phase 1: 緊急修正（ゲーム全体時間の同期）

1. **Task 5.1**: GameTimer.tsxに`totalGameTime` stateを追加
2. **Task 5.2**: useGameTimerのonTimerTickで`getTotalGameTime()`結果を状態更新
3. **Task 5.3**: レンダリング時に`totalGameTime` stateを使用
4. **Task 5.4**: ポーリング同期時も`getTotalGameTime()`で状態更新

### Phase 2: 設計の見直し（根本原因の修正）

1. **Task 6.1**: design.mdのPhase 3設計を修正（自動バッチングの誤解を訂正）
2. **Task 6.2**: `getTotalGameTime()`をメモ化なしの関数に変更（useCallbackを削除）
3. **Task 6.3**: 同様に`getCurrentTurnTime()`、`getLongestTimePlayer()`のメモ化を見直し

## まとめ

**問題の本質**:
- **`getTotalGameTime()`がタイマー更新に反応しない**
- **React自動バッチング ≠ メモ化された関数の再計算保証**
- **設計段階で`useCallback`依存配列の挙動を誤解していた**

**ユーザー要件との乖離**:
- ❌ 要件2「全てのタイマーが同じタイミングで更新」: ゲーム全体時間が更新されない
- ❌ 要件3「ポーリングで最新の秒に更新」: ゲーム全体時間がポーリングで更新されない

**修正の方向性**:
- `getTotalGameTime()`結果を state で管理し、タイマー tick とポーリング同期で更新する
- `useCallback`依存配列の複雑さを回避し、確実に最新値を表示する

**次のアクション**:
- Phase 5として緊急修正タスクをtasks.mdに追加
- 実装後、E2Eテストで4つのタイマー表示の同期を検証

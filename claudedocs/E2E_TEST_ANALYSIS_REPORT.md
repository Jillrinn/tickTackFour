# E2Eテスト失敗分析レポート: game-controls.spec.ts

**作成日時**: 2025-10-25
**仕様**: e2e-test-fixes
**対象ファイル**: `e2e/specs/game-controls.spec.ts`
**テスト結果**: 3 passed / 5 failed (全8テスト)

---

## エグゼクティブサマリー

### 現在の状況

game-controls.spec.tsの8テスト中、**3件成功、5件失敗**しています。

**成功したテスト**:
1. ✅ 一時停止/再開ボタンのテキストが切り替わる (25.0s)
2. ✅ 再開ボタンでタイマーが再開する (49.1s)
3. ✅ (もう1件成功)

**失敗したテスト**:
1. ❌ 一時停止ボタンでタイマーが停止する (39.1s)
2. ❌ 一時停止中はタイマーが停止する (21.8s)
3. ❌ リセットボタンで全状態がリセットされる (49.0s)
4. ❌ リセット後にプレイヤーをアクティブにできる (44.0s)
5. ❌ リセット後、タイマーが完全に停止していることを確認（reset-button-fix） (37.0s)

### 根本原因

**主な問題**:
1. **一時停止/リセット操作後のポーリング同期タイミング問題** - 12秒待機でも不十分
2. **カウントダウン入力フィールドが表示されない** - UI構造の問題または待機時間不足
3. **サーバー状態の反映遅延** - 一時停止/リセット後に古い状態が返ってくる

---

## 失敗テスト詳細

### 1. ❌ 一時停止ボタンでタイマーが停止する (Line 16)

**エラー内容**:
```
Error: expect(received).toBe(expected)
Expected: 4
Received: 6
```

**失敗箇所**: `game-controls.spec.ts:37`
```typescript
// 一時停止中なので時間が進まない
const timeAfterPause = await gameTimerPage.getPlayerElapsedTime(0);
expect(timeAfterPause).toBe(timePaused);
```

**原因分析**:
- プレイヤー0をアクティブにして6秒待機 → 4秒経過
- 一時停止ボタンをクリック → `togglePause()` 12秒待機
- 経過時間を記録: `timePaused = 4秒`
- さらに2秒待機
- **期待**: 一時停止中なので時間が進まず4秒のまま
- **実際**: 6秒に増加（一時停止が効いていない）

**推定原因**:
1. `togglePause()`の12秒待機中に、定期ポーリング（5秒間隔）が複数回実行され、一時停止状態が確実に反映される前に次のポーリングでタイマーが進んでしまう
2. サーバー側で一時停止状態の更新が遅延している
3. React再レンダリングとDOM更新のタイミング問題

---

### 2. ❌ 一時停止中はタイマーが停止する (Line 76)

**エラー内容**:
```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.countdown-control input[type="number"]') to be visible
```

**失敗箇所**: `GameTimerPage.ts:202`
```typescript
// カウントダウン入力が表示されていることを確認（タイムアウトを15秒に延長）
await this.countdownSecondsInput.waitFor({ state: 'visible', timeout: 15000 });
```

**原因分析**:
- カウントダウンモードに切り替え → 6秒待機
- カウントダウン秒数を設定しようとする
- **カウントダウン入力フィールド（`.countdown-control input[type="number"]`）が15秒経っても表示されない**

**推定原因**:
1. カウントダウンモード切り替え後、UI更新が完了していない
2. セレクター（`.countdown-control input[type="number"]`）が正しくない可能性
3. 通常モードではカウントダウン入力フィールドのDOM構造が異なる可能性

**要確認事項**:
- GameTimer.tsxのカウントダウン入力フィールドのセレクターを確認
- 通常モードとフォールバックモードでDOM構造が異なるか確認

---

### 3. ❌ リセットボタンで全状態がリセットされる (Line 101)

**エラー内容**:
```
Error: expect(received).toBe(expected)
Expected: 0
Received: 10
```

**失敗箇所**: `game-controls.spec.ts:120`
```typescript
// 全プレイヤーの経過時間が0秒
const player0Time = await gameTimerPage.getPlayerElapsedTime(0);
expect(player0Time).toBe(0);
```

**原因分析**:
- プレイヤー0をアクティブにして6秒待機 → 時間が進む
- 一時停止ボタンをクリック → 12秒待機
- リセットボタンをクリック → `resetGame()` 12秒待機
- **期待**: 全プレイヤーの経過時間が0秒
- **実際**: プレイヤー0の時間が10秒残っている

**推定原因**:
1. リセットAPI呼び出し後、サーバー側で状態がリセットされていない
2. 12秒待機中に定期ポーリングが実行されるが、古いゲーム状態を取得している
3. ETag更新タイミングの問題で、リセット前の状態が再度取得されている

---

### 4. ❌ リセット後にプレイヤーをアクティブにできる (Line 138)

**エラー内容**:
```
Error: expect(received).toBe(expected)
Expected: true
Received: false
```

**失敗箇所**: `game-controls.spec.ts:150`
```typescript
await gameTimerPage.setPlayerActive(1);
const isActive = await gameTimerPage.isPlayerActive(1);
expect(isActive).toBe(true);
```

**原因分析**:
- プレイヤー0をアクティブにして1秒待機
- リセット実行 → 12秒待機
- **プレイヤー1をアクティブに設定** → `setPlayerActive(1)`
- **期待**: プレイヤー1がactiveクラスを持つ
- **実際**: プレイヤー1がactiveではない

**推定原因**:
1. リセット後、`setPlayerActive(1)`の内部ロジックが失敗している
2. `setPlayerActive(1)`は`switchToNextPlayer()`を3回呼ぶが、リセット直後は初期状態（activeプレイヤーなし）のため、最初の`switchToNextPlayer()`でプレイヤー0がactiveになり、2回目でプレイヤー1、3回目でプレイヤー2になってしまう
3. リセット後の初期アクティブプレイヤーの状態が不明確

**Warningログから確認**:
```
[setPlayerActive] Warning: Expected player 1 to be active, but player 0 is active instead
```

→ `setPlayerActive(1)`の呼び出しで、期待したプレイヤー1ではなくプレイヤー0がactiveになっている

---

### 5. ❌ リセット後、タイマーが完全に停止していることを確認（reset-button-fix） (Line 158)

**エラー内容**:
```
Error: expect(received).toBe(expected)
Expected: 0
Received: 4
```

**失敗箇所**: `game-controls.spec.ts:174`
```typescript
// 全プレイヤーの時間が0秒にリセットされることを確認
const player0TimeAfterReset = await gameTimerPage.getPlayerElapsedTime(0);
expect(player0TimeAfterReset).toBe(0);
```

**原因分析**:
- プレイヤー0をアクティブにして6秒待機 → 時間が進む
- リセット実行 → `resetGame()` 12秒待機
- **期待**: プレイヤー0の時間が0秒
- **実際**: プレイヤー0の時間が4秒残っている

**推定原因**:
- テスト3と同じ問題: リセット後も古い状態が返ってくる
- 12秒待機では不十分、またはポーリングタイミングの問題

---

## 共通問題パターン

### パターン1: 一時停止/リセット後の状態反映遅延

**影響するテスト**: テスト1、3、5

**問題**:
- `togglePause()`や`resetGame()`で12秒待機しているが、サーバー状態の反映が不十分
- 待機中に定期ポーリング（5秒間隔）が実行されるが、古い状態を取得する可能性

**仮説**:
1. **サーバー側の状態更新タイミング**: API呼び出し（POST /api/pause, POST /api/reset）が完了しても、次のGET /api/gameで最新状態が返るまで遅延がある
2. **ETagの不整合**: リセット/一時停止後に新しいETagが返されるが、定期ポーリングは古いETagを使用している可能性
3. **ポーリング同期のタイミング問題**: `syncWithServer()`は即座に呼ばれるが、その後の定期ポーリング（5秒間隔）で古い状態を再取得している

---

### パターン2: カウントダウン入力フィールドの表示問題

**影響するテスト**: テスト2

**問題**:
- カウントダウンモードに切り替え後、15秒待っても入力フィールドが表示されない

**要調査事項**:
1. GameTimer.tsxのカウントダウン入力フィールドのセレクターを確認
2. 通常モードとフォールバックモードでDOM構造が異なるか確認
3. トグル切り替え後の待機時間（現在6秒）が不十分か確認

---

### パターン3: リセット後のプレイヤー切り替えロジックの問題

**影響するテスト**: テスト4

**問題**:
- `setPlayerActive(1)`の呼び出しで、期待したプレイヤー1ではなくプレイヤー0がactiveになる

**原因**:
- `setPlayerActive()`の実装が、リセット後の初期状態（activeプレイヤーなし）を正しく処理していない
- `switchToNextPlayer()`を複数回呼ぶロジックが、リセット直後は期待通りに動作しない

---

## 推奨アクションプラン

### 優先度1（即時対応）: カウントダウン入力フィールドのセレクター確認

**対象**: テスト2の失敗

**アクション**:
1. GameTimer.tsxのカウントダウン入力フィールドのDOM構造を確認
2. 通常モードでのセレクター（`.countdown-control input[type="number"]`）が正しいか検証
3. 必要に応じて、GameTimerPage.tsの`countdownSecondsInput`ロケーターを修正

---

### 優先度2（短期対応）: 一時停止/リセット後の待機戦略の見直し

**対象**: テスト1、3、5の失敗

**オプションA: 待機時間を大幅に延長**
- 現在12秒 → 18秒（ポーリング3サイクル分）
- メリット: シンプル
- デメリット: テスト実行時間が大幅に増加

**オプションB: 状態変化を直接検証**
- `waitForFunction`で実際の状態変化（時間が0秒、isPausedがtrue）を検証
- メリット: 確実、テスト実行時間の無駄削減
- デメリット: 実装が複雑

**推奨**: オプションB（状態変化を直接検証）

---

### 優先度3（中期対応）: setPlayerActive()ロジックの修正

**対象**: テスト4の失敗

**アクション**:
1. `setPlayerActive()`の実装を見直し
2. リセット後の初期状態（activeプレイヤーなし）を正しく処理するロジックを追加
3. 現在のアクティブプレイヤーインデックスの取得方法を改善

**修正案**:
```typescript
async setPlayerActive(targetIndex: number): Promise<void> {
  const currentActiveIndex = await this.getActivePlayerIndex();

  // リセット直後など、activeプレイヤーがいない場合
  if (currentActiveIndex === -1) {
    // 最初のswitchToNextPlayer()でプレイヤー0がactiveになる
    let switchCount = targetIndex + 1;
    for (let i = 0; i < switchCount; i++) {
      await this.switchToNextPlayer();
    }
    return;
  }

  // 通常の場合（既にactiveプレイヤーがいる）
  // ...（既存のロジック）
}
```

---

## 次のステップ

### ステップ1: カウントダウン入力フィールドのセレクター確認
- GameTimer.tsxを確認し、正しいセレクターを特定
- 必要に応じてGameTimerPage.tsを修正
- テスト2を再実行して検証

### ステップ2: 待機戦略の見直し（オプションBを採用）
- `resetGame()`と`togglePause()`メソッドに`waitForFunction`を追加
- 状態変化（時間が0秒、ボタンテキスト変化）を直接検証
- テスト1、3、5を再実行して検証

### ステップ3: setPlayerActive()の修正
- リセット後の初期状態を正しく処理するロジックを追加
- テスト4を再実行して検証

### ステップ4: 全テスト再実行
- game-controls.spec.ts全8テストを実行
- 全テストパスを確認

---

## 参照情報

### 関連ファイル
- `e2e/specs/game-controls.spec.ts` - 対象テストファイル
- `e2e/pages/GameTimerPage.ts` - Page Object Model
- `frontend/src/components/GameTimer.tsx` - 実装コード（handlers）

### テスト実行コマンド
```bash
npx playwright test e2e/specs/game-controls.spec.ts
```

### 現在の待機時間設定
- `togglePause()`: 12秒（ポーリング5秒 × 2 + 余裕2秒）
- `resetGame()`: 12秒（同上）
- `switchToNextPlayer()`: 6秒（ポーリング5秒 + 余裕1秒）
- `setTimerModeCountDown()`: 6秒（トグル切り替え後）

---

**レポート作成者**: Claude (AI Assistant)
**最終更新**: 2025-10-25 16:17 JST

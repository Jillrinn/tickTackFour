# E2E Page Object Fixes - 設計書

## 1. 概要

### 機能概要
E2EテストのPage Objectセレクターを実装のHTML構造と一致させ、69件の失敗テストを修正する。

### 設計目標
- Page Objectセレクターを実装の`data-testid`属性に統一
- 全69件の失敗テストを成功させる
- テストの保守性と安定性を向上
- 実装コードは一切変更しない

### スコープ
**対象**:
- `e2e/pages/GameTimerPage.ts`のセレクター修正
- `e2e/specs/smoke.spec.ts`の厳密化

**対象外**:
- フロントエンド実装の変更
- 新規テストケースの追加
- テストフレームワークの変更

## 2. 技術設計

### 2.1 修正対象の特定

#### 根本原因
```typescript
// e2e/pages/GameTimerPage.ts:41 - 問題のセレクター
this.gameHeader = page.locator('.game-header');  // ❌ 実装に存在しない

// frontend/src/components/GameTimer.tsx:409 - 実際の実装
<div className="sticky-header" data-testid="sticky-header">
```

**影響範囲**:
- 全テストの`beforeEach`フックで`verifyPageLoaded()`が実行
- `.game-header`を30秒間待機してタイムアウト
- 69件のテストが失敗

#### 修正箇所マッピング

**GameTimerPage.ts**:
```typescript
// 修正前（line 41）
this.gameHeader = page.locator('.game-header');

// 修正後
this.gameHeader = page.getByTestId('sticky-header');
```

**smoke.spec.ts**:
```typescript
// 修正前 - strict mode violation（2要素にマッチ）
await expect(page.locator('.game-timer')).toBeVisible();

// 修正後 - first()で厳密化
await expect(page.locator('.game-timer').first()).toBeVisible();
```

### 2.2 セレクター選択戦略

#### 優先順位
1. **`data-testid`属性** (最優先)
   - CSS変更に影響されない
   - テスト専用の識別子
   - Playwrightの`getByTestId()`で簡潔に記述

2. **セマンティックセレクター** (次点)
   - `getByRole()`, `getByLabel()`, `getByText()`
   - アクセシビリティに準拠
   - HTML構造変更に強い

3. **CSSセレクター** (最終手段)
   - クラス名や要素セレクター
   - スタイル変更で壊れやすい
   - メンテナンスコスト高

#### 実装で利用可能な`data-testid`一覧

```yaml
sticky-header: 固定ヘッダー全体
sticky-header-content: ヘッダーコンテンツ
active-player-info: アクティブプレイヤー情報
total-game-time: ゲーム全体時間
controls-section: コントロールセクション
settings-controls: 設定コントロール
turn-time: ターン時間表示
```

### 2.3 修正手順

#### Phase 1: GameTimerPage.ts修正

```typescript
// e2e/pages/GameTimerPage.ts

export class GameTimerPage {
  // 修正箇所1: gameHeaderセレクター（line 41）
  readonly gameHeader: Locator;

  constructor(page: Page) {
    // 修正前
    // this.gameHeader = page.locator('.game-header');

    // 修正後
    this.gameHeader = page.getByTestId('sticky-header');

    // その他のセレクターは既に正しい（変更不要）
    this.stickyHeader = page.getByTestId('sticky-header');
    this.playersSection = page.locator('.players-section');
    // ... (以下同様)
  }
}
```

#### Phase 2: smoke.spec.ts修正

```typescript
// e2e/specs/smoke.spec.ts

test('アプリケーションが正常にロードされる', async ({ page }) => {
  // 修正前
  // await expect(page.locator('.game-timer')).toBeVisible();

  // 修正後（strict mode violation解消）
  await expect(page.locator('.game-timer').first()).toBeVisible();

  // または、よりセマンティックな方法
  // await expect(page.getByRole('main')).toBeVisible();
});
```

### 2.4 検証戦略

#### テスト実行フロー

```yaml
Phase 1 - 基本動作確認:
  - 開発サーバー起動（npm run dev）
  - APIサーバー起動（npm start --prefix api）
  - ブラウザで手動確認（http://localhost:5173）

Phase 2 - 個別テスト実行:
  - smoke.spec.ts単体実行
  - active-player.spec.ts単体実行
  - 各セクションごとに段階的検証

Phase 3 - 全体テスト実行:
  - npx playwright test
  - 96テスト全体の成功確認
  - スクリーンショット比較（必要に応じて）
```

#### 成功基準

**定量的基準**:
- ✅ 合計96テスト全て成功
- ✅ タイムアウトエラー0件
- ✅ Strict mode violation 0件
- ✅ 実行時間が30秒×69件分短縮（約34分短縮）

**定性的基準**:
- ✅ 実装コードに一切変更なし
- ✅ 既存テストケースの意図を維持
- ✅ 保守性の向上（`data-testid`使用）

## 3. 実装計画

### 3.1 ファイル変更一覧

```yaml
修正ファイル:
  - e2e/pages/GameTimerPage.ts:
      line: 41
      変更内容: this.gameHeader = page.getByTestId('sticky-header');

  - e2e/specs/smoke.spec.ts:
      変更内容: .first()追加またはgetByRole()使用

変更なしファイル:
  - frontend/src/components/GameTimer.tsx: 変更不要
  - playwright.config.ts: 変更不要
  - その他全てのE2Eテストファイル: セレクター修正のみで自動的に修正される
```

### 3.2 リスク分析

**リスクなし**:
- 実装コードは変更しないため、既存機能への影響ゼロ
- Page Objectパターンのため、セレクター変更の影響は局所的
- `data-testid`は既に実装に存在するため、新規追加不要

**想定される注意点**:
- `gameHeader`と`stickyHeader`が同じ要素を指すため、重複の整理検討
- 他のテストで`gameHeader`プロパティに依存している箇所の確認

### 3.3 実装順序

```markdown
## Phase 1: 準備
- [ ] 1.1 両サーバー起動確認（frontend + API）
- [ ] 1.2 現在の失敗テスト状況をスクリーンショット保存

## Phase 2: セレクター修正
- [ ] 2.1 GameTimerPage.ts line 41修正
  - `this.gameHeader = page.getByTestId('sticky-header');`
- [ ] 2.2 smoke.spec.ts修正
  - `.first()`追加または`getByRole('main')`に変更

## Phase 3: 検証
- [ ] 3.1 smoke.spec.ts単体実行
  - `npx playwright test e2e/specs/smoke.spec.ts`
- [ ] 3.2 active-player.spec.ts単体実行
  - 7件全て成功することを確認
- [ ] 3.3 全E2Eテスト実行
  - `npx playwright test`
  - 96/96テスト成功を確認

## Phase 4: 完了処理
- [ ] 4.1 実行時間の改善を確認（約34分短縮）
- [ ] 4.2 スクリーンショット比較（before/after）
- [ ] 4.3 spec.jsonをimplementation-doneに更新
```

## 4. フロントエンド実装の検証プロセス（必須）

### 検証不要の理由

**このタスクはE2Eテスト修正のみ**:
- フロントエンド実装の変更なし
- 新規UI機能の追加なし
- React componentの修正なし

**検証済み事項**:
- 実装は既に正しく動作している
- ブラウザで画面が正常に表示されている
- `data-testid="sticky-header"`は既に存在している

**必要な検証**:
- E2Eテスト実行結果のみ
- 96/96テストが成功すれば完了

## 5. 完了基準

### Definition of Done

**必須条件**:
- ✅ GameTimerPage.ts line 41修正完了
- ✅ smoke.spec.ts修正完了
- ✅ 全96E2Eテストが成功
- ✅ タイムアウトエラー0件
- ✅ 実装コードに変更なし

**推奨条件**:
- ✅ テスト実行時間が約34分短縮（69テスト×30秒）
- ✅ コミットメッセージに修正内容と結果を明記

### 成功メトリクス

**Before**:
```yaml
合計テスト数: 96
成功: 17
失敗: 69
スキップ: 10
実行時間: 約35-40分（69件×30秒タイムアウト）
```

**After**:
```yaml
合計テスト数: 96
成功: 96
失敗: 0
スキップ: 10（Phase 2機能は意図的にスキップ）
実行時間: 約1-5分（正常動作時）
```

---

**設計完了**: 2025-10-26
**次フェーズ**: `/kiro:spec-tasks e2e-page-object-fixes`で実装タスク生成

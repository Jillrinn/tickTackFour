# 技術設計書

## Overview

本機能は、ゲームコントロールボタンのUI改善により、視覚的な一貫性とユーザビリティを向上させます。具体的には、ボタンの色をMaterial Design標準色に統一し、ゲーム状態（activePlayerIndex）に応じた適切なボタン制御（disabled状態、動的テキスト変更）を実装します。

**Purpose**: ゲームコントロールボタンのUI一貫性を確保し、ゲーム状態に応じた適切なボタン制御とアクセシビリティ準拠を実現します。

**Users**: ゲームプレイヤーは、視覚的に統一されたボタンデザインと明確なゲーム状態表示により、直感的な操作が可能になります。アクセシビリティ担当者は、WCAG AA準拠のコントラスト比により、視覚障害を持つユーザーにも配慮したUIを提供できます。

**Impact**: 既存のGameTimerコンポーネントとGameTimer.cssファイルに対する軽微な変更により、ボタンの視覚的一貫性を向上させます。コンポーネントの構造変更は不要で、CSSスタイルとボタンdisabled属性のロジック追加のみで実現します。

### Goals

- ボタン色をMaterial Design標準色に統一（オレンジ #ff9800、緑 #4caf50）
- ゲーム未開始時（activePlayerIndex === -1）に一時停止ボタンを無効化
- ゲーム停止時のボタンテキストを「ゲームを開始する」に動的変更
- WCAG AA準拠のコントラスト比（3.0:1以上）を全ボタンで達成
- 全デバイス（375px-1440px）で一貫したUI体験を提供

### Non-Goals

- ボタンの配置やレイアウトの変更（既存の固定ヘッダー構造を維持）
- 新規ボタンの追加や既存ボタンの削除
- ゲーム状態管理ロジックの変更（activePlayerIndexの管理方法は変更しない）
- アニメーション効果の追加（既存のhover効果のみ維持）

## Architecture

### 既存アーキテクチャ分析

本機能は既存のGameTimerコンポーネントに対する軽微な変更であり、以下の既存パターンを維持します：

- **コンポーネント構造**: GameTimer.tsx内のボタンレンダリングロジック（handlePauseResume、handleSwitchTurnハンドラ）を維持
- **状態管理**: activePlayerIndexベースのゲーム状態判定パターン（isGameActive変数）を継続使用
- **スタイル管理**: GameTimer.css内の.pause-btn、.next-player-btnクラスベースのスタイル適用を維持
- **アクセシビリティ**: 既存のaria-label属性パターンを継続使用

### 技術アラインメント

**既存パターンの保持**:
- CSSクラスベースのスタイル管理（インラインスタイル不使用）
- React条件付きレンダリングパターン（三項演算子によるテキスト切り替え）
- disabled属性による状態制御

**新規導入要素**:
- activePlayerIndex === -1によるボタンdisabled判定ロジック
- 動的ボタンテキスト（activePlayerIndexに基づく条件分岐）

**ステアリング準拠**:
- structure.md: 既存のコンポーネント/スタイル分離パターンを維持
- tech.md: TypeScript型安全性、WCAG AA準拠のアクセシビリティ基準
- product.md: シンプルで直感的なUI/UX原則

### 主要設計決定

#### 決定1: ボタン色の変更戦略

**決定**: 既存のCSS変数や色定義を使用せず、Material Design標準色を直接CSS値として記述する

**コンテキスト**:
- 現在のGameTimer.cssは色を直接値（#bf360c、#2e7d32）で定義
- CSS変数やテーマシステムは未導入

**代替案**:
1. CSS変数を導入してテーマシステムを構築（例: --color-primary-orange: #ff9800）
2. Tailwind CSSやMaterial-UIライブラリを導入
3. 既存の色値を直接Material Design標準色に置換（選択）

**選択アプローチ**: 直接CSS値の置換

**根拠**:
- プロジェクトの技術スタック（Vite + React + CSS）に合致
- 最小限の変更でリスクを低減（既存のCSSクラス構造を維持）
- 将来的なテーマシステム導入の妨げにならない（色値のみの変更）

**トレードオフ**:
- 利点: 実装が単純、既存コードへの影響最小、即座に適用可能
- 欠点: 色の一元管理が困難、将来的なテーマ変更時に複数箇所の修正が必要

#### 決定2: activePlayerIndexベースのゲーム状態判定

**決定**: 既存のisGameActive変数パターンを拡張し、一時停止ボタンのdisabled属性を制御する

**コンテキスト**:
- GameTimer.tsx内で既に`isGameActive`変数が定義されている（Line 86）
- フォールバックモードと通常モードで異なる状態管理パターンが存在

**代替案**:
1. 新規の状態変数を導入（例: isGameStarted）
2. 既存のisGameActive変数を再利用（選択）
3. isPaused変数のみで制御

**選択アプローチ**: 既存のisGameActive変数を再利用

**根拠**:
- 既存のコードパターンとの一貫性を維持
- activePlayerIndex !== -1の判定ロジックが既に実装済み
- フォールバックモードと通常モードの両方で一貫した動作

**トレードオフ**:
- 利点: 新規変数不要、既存ロジックとの整合性、テストケース追加が容易
- 欠点: isGameActiveの責務が増える（今後の拡張性への考慮が必要）

#### 決定3: WCAG AA準拠のコントラスト比検証

**決定**: 既存のcontrastRatio.test.tsテストファイルにボタン色の検証ケースを追加し、3.0:1以上を担保する

**コンテキスト**:
- プロジェクトには既にコントラスト比計算ユーティリティが存在（frontend/src/utils/contrastRatio.ts）
- Material Design標準色（#ff9800、#4caf50）のコントラスト比は事前検証が必要

**選択アプローチ**: ユニットテストによる自動検証

**根拠**:
- TDD原則に従った品質保証
- 将来的な色変更時の回帰テスト防止
- アクセシビリティ準拠の継続的な保証

**トレードオフ**:
- 利点: 自動検証、回帰テスト、継続的な品質保証
- 欠点: テストコード追加の工数（ただし既存ユーティリティ活用で最小化）

## 要件トレーサビリティ

| 要件 | 要件概要 | コンポーネント | インターフェース | フロー |
|------|----------|----------------|------------------|--------|
| 1.1-1.4 | ボタン色の統一とホバー効果 | GameTimer.css | .pause-btn, .next-player-btn | CSS適用 |
| 2.1-2.5 | 一時停止ボタンの状態管理 | GameTimer.tsx | button disabled属性 | 条件付きレンダリング |
| 3.1-3.5 | 開始ボタンテキストの動的変更 | GameTimer.tsx | button内テキスト | 三項演算子による切り替え |
| 4.1-4.3 | WCAG AA準拠 | contrastRatio.test.ts | calculateContrastRatio() | ユニットテスト検証 |
| 5.1-5.3 | レスポンシブ対応 | GameTimer.css | @media クエリ | 既存のレスポンシブ構造維持 |

## コンポーネントとインターフェース

### フロントエンド/UIコンポーネント

#### GameTimer.tsx (ボタン制御ロジック)

**責務と境界**
- **主要責務**: ゲーム状態（activePlayerIndex）に基づくボタンのdisabled状態制御と動的テキスト表示
- **ドメイン境界**: UIレイヤー（プレゼンテーション層）のみ、ビジネスロジックは変更しない
- **データ所有**: ローカルUI状態のみ（isGameActive変数の再利用）
- **トランザクション境界**: なし（状態変更は既存ハンドラに委譲）

**依存関係**
- **インバウンド**: なし（既存コンポーネントからの呼び出しパターン維持）
- **アウトバウンド**: useGameState, useServerGameState フック（既存依存関係維持）
- **外部**: React標準ライブラリのみ（新規外部依存なし）

**契約定義**

**UIコントラクト**:

一時停止/再開ボタン:
```typescript
<button
  onClick={handlePauseResume}
  className="pause-btn sticky-header-btn"
  disabled={!isGameActive}  // 新規: ゲーム未開始時は無効化
  aria-label={isPaused ? 'ゲームを再開' : 'ゲームを一時停止'}
>
  {isPaused ? '▶️ タイマー再開' : '⏸️ タイマー停止'}
</button>
```

次のプレイヤーへボタン:
```typescript
<button
  onClick={handleSwitchTurn}
  className="next-player-btn sticky-header-btn"
  aria-label={isGameActive ? "次のプレイヤーに切り替え" : "ゲームを開始"}
>
  {isGameActive ? '次のプレイヤーへ →' : 'ゲームを開始する'}  // 新規: 動的テキスト
</button>
```

**前提条件**:
- isGameActive変数が正しく算出されている（activePlayerIndex !== -1）
- handlePauseResume、handleSwitchTurnハンドラが定義済み

**事後条件**:
- ゲーム未開始時（activePlayerIndex === -1）、一時停止ボタンはクリック不可
- ゲーム未開始時、次のプレイヤーへボタンは「ゲームを開始する」テキストで表示
- ゲーム進行中（activePlayerIndex >= 0）、次のプレイヤーへボタンは「次のプレイヤーへ →」テキストで表示

**不変条件**:
- ボタンのaria-label属性は常に適切な説明テキストを含む
- disabled状態のボタンはonClickハンドラを実行しない（ブラウザ標準動作）

#### GameTimer.css (ボタンスタイル定義)

**責務と境界**
- **主要責務**: ボタンの視覚的スタイル（色、ホバー効果、disabled状態）を定義
- **ドメイン境界**: スタイルレイヤーのみ、動作ロジックは含まない
- **データ所有**: CSS変数なし、直接色値で管理

**依存関係**
- **インバウンド**: GameTimer.tsxからのクラス参照（.pause-btn, .next-player-btn）
- **アウトバウンド**: なし
- **外部**: なし

**契約定義**

**CSSクラス契約**:

一時停止ボタンスタイル:
```css
.pause-btn {
  background: #ff9800; /* Material Design標準オレンジ */
  color: white;
}

.pause-btn:hover {
  background: #f57c00; /* 濃いオレンジ */
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.pause-btn:disabled {
  background: #9e9e9e; /* グレーアウト */
  color: #616161; /* 濃いグレーテキスト */
  cursor: not-allowed;
}

.pause-btn:disabled:hover {
  transform: none; /* hover効果を無効化 */
  box-shadow: none;
}
```

次のプレイヤーへボタンスタイル:
```css
.next-player-btn {
  background: #4caf50; /* Material Design標準緑 */
  color: white;
}

.next-player-btn:hover {
  background: #388e3c; /* 濃い緑 */
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}
```

**前提条件**:
- HTML要素に.pause-btn、.next-player-btnクラスが適用されている
- disabled属性が適切に設定されている（GameTimer.tsx側で制御）

**事後条件**:
- 全ての状態（通常、hover、disabled）でWCAG AA準拠のコントラスト比を満たす
- disabled状態ではhover効果が無効化される

## データモデル

本機能は既存のGameState型に依存しますが、新規のデータモデル定義は不要です。

**使用する既存型**:
```typescript
// frontend/src/types/GameState.ts（既存型、変更なし）
interface GameState {
  activePlayerIndex: number;  // -1: ゲーム未開始、0以上: アクティブプレイヤーのインデックス
  players: Player[];
  isPaused: boolean;
  // ...その他のフィールド
}
```

**ゲーム状態の判定ロジック**:
```typescript
// GameTimer.tsx内の既存パターン（Line 86）を再利用
const isGameActive = isInFallbackMode
  ? (fallbackState.gameState.activePlayerId !== null)
  : (serverGameState.serverState?.activePlayerIndex !== -1);
```

## エラーハンドリング

### エラー戦略

本機能はUI表示のみの変更であり、新規のエラーケースは発生しません。既存のエラーハンドリングパターンを維持します。

**既存のエラーハンドリング維持**:
- フォールバックモード警告表示（API接続失敗時）
- ボタンクリック時のETag不足警告（コンソールログ）

**新規考慮事項**:
- disabled状態のボタンクリック試行 → ブラウザ標準動作により自動的に無視（追加処理不要）
- CSSロード失敗 → ブラウザのフォールバックスタイル適用（Viteビルドプロセスにより通常発生しない）

## テスト戦略

### ユニットテスト

**コントラスト比検証テスト** (`frontend/src/utils/__tests__/contrastRatio.test.ts`):

```typescript
describe('game-controls-ui-improvements: ボタンコントラスト比検証', () => {
  describe('一時停止/再開ボタン（通常状態）', () => {
    const background = '#ff9800'; // Material Designオレンジ
    const foreground = '#ffffff'; // 白テキスト

    it('コントラスト比が3.0:1以上', () => {
      const ratio = calculateContrastRatio(foreground, background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(meetsWCAG_AA(foreground, background)).toBe(true);
    });
  });

  describe('一時停止/再開ボタン（hover状態）', () => {
    const background = '#f57c00'; // 濃いオレンジ
    const foreground = '#ffffff'; // 白テキスト

    it('コントラスト比が3.0:1以上', () => {
      const ratio = calculateContrastRatio(foreground, background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('一時停止/再開ボタン（disabled状態）', () => {
    const background = '#9e9e9e'; // グレー背景
    const foreground = '#616161'; // 濃いグレーテキスト

    it('コントラスト比が3.0:1以上', () => {
      const ratio = calculateContrastRatio(foreground, background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('次のプレイヤーへボタン（通常状態）', () => {
    const background = '#4caf50'; // Material Design緑
    const foreground = '#ffffff'; // 白テキスト

    it('コントラスト比が3.0:1以上', () => {
      const ratio = calculateContrastRatio(foreground, background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(meetsWCAG_AA(foreground, background)).toBe(true);
    });
  });

  describe('次のプレイヤーへボタン（hover状態）', () => {
    const background = '#388e3c'; // 濃い緑
    const foreground = '#ffffff'; // 白テキスト

    it('コントラスト比が3.0:1以上', () => {
      const ratio = calculateContrastRatio(foreground, background);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });
});
```

**GameTimerコンポーネントテスト** (`frontend/src/components/__tests__/GameTimer.test.tsx`):

```typescript
describe('game-controls-ui-improvements: ボタン状態管理', () => {
  describe('ゲーム未開始時（activePlayerIndex === -1）', () => {
    it('一時停止ボタンがdisabled状態である', () => {
      // テストセットアップ: activePlayerIndex = -1
      const pauseButton = screen.getByLabelText('ゲームを一時停止');
      expect(pauseButton).toBeDisabled();
    });

    it('次のプレイヤーへボタンのテキストが「ゲームを開始する」である', () => {
      const nextButton = screen.getByRole('button', { name: /ゲームを開始/ });
      expect(nextButton).toHaveTextContent('ゲームを開始する');
    });
  });

  describe('ゲーム進行中（activePlayerIndex >= 0）', () => {
    it('一時停止ボタンがenabled状態である', () => {
      // テストセットアップ: activePlayerIndex = 0
      const pauseButton = screen.getByLabelText('ゲームを一時停止');
      expect(pauseButton).not.toBeDisabled();
    });

    it('次のプレイヤーへボタンのテキストが「次のプレイヤーへ →」である', () => {
      const nextButton = screen.getByRole('button', { name: /次のプレイヤー/ });
      expect(nextButton).toHaveTextContent('次のプレイヤーへ →');
    });
  });

  describe('ボタンクリック動作', () => {
    it('「ゲームを開始する」ボタンクリック後、activePlayerIndexが0に設定される', async () => {
      const nextButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await userEvent.click(nextButton);

      // handleSwitchTurnが呼ばれ、activePlayerIndexが0になることを検証
      expect(mockSwitchTurn).toHaveBeenCalledTimes(1);
    });

    it('リセットボタンクリック後、ボタンテキストが「ゲームを開始する」に戻る', async () => {
      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await userEvent.click(resetButton);

      const nextButton = screen.getByRole('button', { name: /ゲームを開始/ });
      expect(nextButton).toHaveTextContent('ゲームを開始する');
    });
  });
});
```

### E2Eテスト

**ボタンUI検証** (`e2e/specs/game-controls.spec.ts`):

```typescript
test.describe('game-controls-ui-improvements: ボタンUI検証', () => {
  test('ゲーム未開始時、一時停止ボタンがdisabled状態で表示される', async ({ page }) => {
    await page.goto('/');

    const pauseButton = page.locator('button.pause-btn');
    await expect(pauseButton).toBeDisabled();

    // CSSスタイル検証
    const backgroundColor = await pauseButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).toBe('rgb(158, 158, 158)'); // #9e9e9e
  });

  test('ゲーム未開始時、次のプレイヤーへボタンのテキストが「ゲームを開始する」である', async ({ page }) => {
    await page.goto('/');

    const nextButton = page.locator('button.next-player-btn');
    await expect(nextButton).toHaveText('ゲームを開始する');
  });

  test('「ゲームを開始する」ボタンクリック後、テキストが「次のプレイヤーへ →」に変化する', async ({ page }) => {
    await page.goto('/');

    const nextButton = page.locator('button.next-player-btn');
    await nextButton.click();

    await expect(nextButton).toHaveText('次のプレイヤーへ →');
  });

  test('ゲーム開始後、一時停止ボタンがenabled状態になる', async ({ page }) => {
    await page.goto('/');

    const nextButton = page.locator('button.next-player-btn');
    await nextButton.click();

    const pauseButton = page.locator('button.pause-btn');
    await expect(pauseButton).not.toBeDisabled();

    // CSSスタイル検証
    const backgroundColor = await pauseButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).toBe('rgb(255, 152, 0)'); // #ff9800
  });

  test('ボタンのホバー効果が正しく適用される', async ({ page }) => {
    await page.goto('/');

    const nextButton = page.locator('button.next-player-btn');
    await nextButton.click();

    const pauseButton = page.locator('button.pause-btn');

    // hover前の色
    const beforeHover = await pauseButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(beforeHover).toBe('rgb(255, 152, 0)'); // #ff9800

    // hover
    await pauseButton.hover();

    // hover後の色（濃いオレンジ）
    const afterHover = await pauseButton.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );
    expect(afterHover).toBe('rgb(245, 124, 0)'); // #f57c00
  });
});
```

**レスポンシブUI検証** (`e2e/specs/responsive-ui.spec.ts`):

```typescript
test.describe('game-controls-ui-improvements: レスポンシブ検証', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    test(`${viewport.name}でボタン色とテキストが一貫している`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      const pauseButton = page.locator('button.pause-btn');
      const nextButton = page.locator('button.next-player-btn');

      // 色の一貫性検証
      const pauseColor = await pauseButton.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      const nextColor = await nextButton.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      // disabled状態（グレー）またはenabled状態（オレンジ）のいずれかであることを検証
      expect(['rgb(158, 158, 158)', 'rgb(255, 152, 0)']).toContain(pauseColor);
      expect(nextColor).toBe('rgb(76, 175, 80)'); // #4caf50

      // テキストの一貫性検証
      await expect(nextButton).toHaveText('ゲームを開始する');
    });

    test(`${viewport.name}でボタンのタッチ領域が44x44px以上である`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');

      const pauseButton = page.locator('button.pause-btn');
      const boundingBox = await pauseButton.boundingBox();

      expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
    });
  }
});
```

## セキュリティ考慮事項

本機能はUI表示のみの変更であり、新規のセキュリティリスクは発生しません。

**既存のセキュリティパターン維持**:
- XSS対策: Reactの自動エスケープにより、動的テキスト（「ゲームを開始する」「次のプレイヤーへ →」）は安全に表示
- CSRF対策: ボタンクリックは既存のAPI呼び出しハンドラに委譲（ETag検証により保護）

**考慮事項**:
- disabled属性はクライアント側の制御であり、サーバー側でも同等の検証が必要（既存のAPI側で実装済み）
- CSSインジェクション対策: 静的CSSファイルのみ使用、動的スタイル生成なし

## パフォーマンスとスケーラビリティ

### パフォーマンス影響

**レンダリングパフォーマンス**:
- ボタンテキストの動的変更は三項演算子による条件分岐のみ（計算量: O(1)）
- disabled属性の追加によるレンダリングコストは無視できる程度
- CSS適用は既存のクラスベース方式と同等（追加コストなし）

**メモリ使用量**:
- 新規変数追加なし（既存のisGameActive変数を再利用）
- CSS定義の追加は数百バイト程度（影響なし）

### スケーラビリティ

本機能はローカルUI表示のみであり、ネットワーク通信やデータベースアクセスを含まないため、スケーラビリティへの影響はありません。

**既存のスケーラビリティパターン維持**:
- SignalR無料層制限（同時接続20）: 影響なし
- Cosmos DB無料層制限（1000 RU/s）: 影響なし
- Azure Functions無料層制限（月100万リクエスト）: 影響なし

import { test, expect, type Page } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * E2Eテスト: カタンモードのフェーズ表示と蛇腹順序
 *
 * 検証項目:
 * - カタンON→開始でフェーズ1バッジが表示される
 * - 開始時の現在プレイヤーが「プレイヤー1」（インデックス0）
 * - 通常モードではフェーズバッジが表示されない
 *
 * 実装上の注意:
 * - game-mode-toggle のcheckboxはCSSで opacity:0; width:0; height:0 にて非表示。
 *   timer-mode-toggle と同じ DOM 構造のため、既存 Page Object の確立パターン
 *   （ラッパー <label> への force click）を使用する。
 * - フェーズ2遷移ロジックはunitテストで完全カバー済みのため、E2Eテストでは検証しない。
 */

// 共有APIサーバーへの競合を防ぐためシリアル実行
test.describe.configure({ mode: 'serial' });

/**
 * カタンモードのトグルをON/OFFにするヘルパー関数
 *
 * timer-mode-toggle と同じ DOM 構造（<label class="toggle-switch-enhanced"> が
 * <input> をラップ）のため、既存 Page Object の確立パターンに統一する:
 *   locator('..').click({ force: true })
 * これにより CSS 非表示チェックボックスへの直接 click が回避される。
 */
async function setCatanMode(page: Page, enabled: boolean): Promise<void> {
  const toggle = page.getByTestId('game-mode-toggle');
  const current = await toggle.isChecked();
  if (current === enabled) return; // 既に目的の状態

  // ラッパー <label> を force click（Page Object の timer-mode-toggle と同じパターン）
  await toggle.locator('..').click({ force: true });

  // Reactの状態更新を待つ（APIモードでは非同期）
  if (enabled) {
    await expect(toggle).toBeChecked({ timeout: 5000 });
  } else {
    await expect(toggle).not.toBeChecked({ timeout: 5000 });
  }
}

test.describe('カタンモード', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    gameTimerPage = new GameTimerPage(page);
    await gameTimerPage.navigate();

    // ゲームをリセットしてクリーンな状態にする
    await gameTimerPage.resetGame();

    // リセット後、ゲームが未開始状態になるまで待機
    await page.waitForFunction(
      () => {
        const activeCards = document.querySelectorAll('.player-card.active');
        const startBtn = document.querySelector('[data-testid="start-game-button"]');
        return activeCards.length === 0 && startBtn?.textContent?.includes('ゲームを開始');
      },
      { timeout: 5000 }
    );

    // カタンモードをOFFにリセット（APIを直接呼び出してゲームモードを通常に戻す）
    const toggle = page.getByTestId('game-mode-toggle');
    if (await toggle.isChecked()) {
      await setCatanMode(page, false);
    }
  });

  test('カタンON→開始でフェーズ1バッジが表示され、開始プレイヤーはプレイヤー1', async ({ page }) => {
    // ゲーム開始前はフェーズバッジが非表示
    await expect(page.getByTestId('phase-badge')).not.toBeVisible();

    // カタンモードON
    await setCatanMode(page, true);

    // ゲーム開始
    await page.getByTestId('start-game-button').click();

    // フェーズ1バッジが表示される
    await expect(page.getByTestId('phase-badge')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('phase-badge')).toHaveText(/フェーズ1/);

    // 現在のアクティブプレイヤーが「プレイヤー1」（turnNumber=0 → カタン順index=0）
    await expect(page.locator('.sticky-header-player')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.sticky-header-player')).toContainText('プレイヤー1');
  });

  test('カタンOFFの通常モードではフェーズバッジが表示されない', async ({ page }) => {
    // カタンモードがOFFのまま（デフォルト: 通常モード）
    await expect(page.getByTestId('game-mode-toggle')).not.toBeChecked();

    // ゲーム開始
    await page.getByTestId('start-game-button').click();

    // active playerが表示されるまで待機
    await page.waitForFunction(
      () => document.querySelectorAll('.player-card.active').length > 0,
      { timeout: 5000 }
    );

    // フェーズバッジが表示されない
    await expect(page.getByTestId('phase-badge')).not.toBeVisible();

    // 現在のプレイヤー情報エリアは表示される
    await expect(page.getByTestId('active-player-info')).toBeVisible();
  });
});

import { test, expect, type Page } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * E2Eテスト: カタンモードのフェーズ表示と蛇腹順序
 *
 * 検証項目:
 * - カタンON→開始でフェーズ1バッジが表示される
 * - 開始時の現在プレイヤーが「プレイヤー1」（インデックス0）
 * - 4人・7回「次のプレイヤーへ」でフェーズ2バッジに切り替わる
 * - 通常モードではフェーズバッジが表示されない
 *
 * 実装上の注意:
 * - game-mode-toggle のcheckboxはCSSで opacity:0; width:0; height:0 にて
 *   非表示にされているため、page.evaluate()でネイティブclickイベントを発火する。
 * - APIモードでは etag が必要なため、React onChange が呼ばれることで
 *   内部的にAPIを呼び出してゲームモードを変更する。
 * - テストは共有APIサーバーを使うため、並行実行による競合を防ぐためserialモードで実行する。
 */

// 共有APIサーバーへの競合を防ぐためシリアル実行
test.describe.configure({ mode: 'serial' });

/**
 * カタンモードのトグルをON/OFFにするヘルパー関数
 * page.evaluate でチェックボックスをクリック → React onChange を発火させる
 */
async function setCatanMode(page: Page, enabled: boolean): Promise<void> {
  const toggle = page.getByTestId('game-mode-toggle');
  const current = await toggle.isChecked();
  if (current === enabled) return; // 既に目的の状態

  // page.evaluate でネイティブclickを実行（opacity:0 / width:0 のcheckboxをフォース操作）
  await page.evaluate(() => {
    const checkbox = document.querySelector('[data-testid="game-mode-toggle"]') as HTMLInputElement | null;
    if (!checkbox) throw new Error('game-mode-toggle not found');
    checkbox.click();
  });

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

  test('4人でフェーズ1を7回「次のプレイヤーへ」押すとフェーズ2になる', async ({ page }) => {
    // カタンモードON
    await setCatanMode(page, true);

    // ゲーム開始（turnNumber=0, phase=1）
    await page.getByTestId('start-game-button').click();
    await expect(page.getByTestId('phase-badge')).toHaveText(/フェーズ1/, { timeout: 5000 });

    // 4人の場合: getCatanPhase1Length(4) = 2*4-1 = 7
    // turnNumber が 0..6 → フェーズ1、7以降 → フェーズ2
    // 開始時点で turnNumber=0。「次のプレイヤーへ」を7回押すと turnNumber=7 → フェーズ2
    const nextButton = page.getByTestId('start-game-button');
    for (let i = 0; i < 7; i++) {
      await nextButton.click();
      // APIモードではサーバーレスポンスを待つ必要があるため短い待機
      await page.waitForTimeout(300);
    }

    // フェーズ2バッジに切り替わる
    await expect(page.getByTestId('phase-badge')).toHaveText(/フェーズ2/, { timeout: 10000 });
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

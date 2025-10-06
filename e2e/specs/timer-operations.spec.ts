import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';
import { assertTimeInRange } from '../helpers/assertions';
import { waitForTimerProgress } from '../helpers/waiting';

/**
 * タイマー動作機能のE2Eテスト
 * Requirements: 3.1〜3.7
 */
test.describe('タイマー動作機能', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    gameTimerPage = new GameTimerPage(page);
    await gameTimerPage.navigate();
  });

  test('カウントアップモードでタイマーが進行する', async () => {
    // Requirements: 3.1, 3.2
    await gameTimerPage.setTimerModeCountUp();
    await gameTimerPage.setPlayerActive(0);

    // 3秒待機してタイマー進行を確認
    const timeDiff = await waitForTimerProgress(gameTimerPage, 0, 3);
    assertTimeInRange(timeDiff, 3, 1);
  });

  test('カウントダウンモードでタイマーが減少する', async () => {
    // Requirements: 3.3, 3.4
    await gameTimerPage.setTimerModeCountDown(600);
    await gameTimerPage.setPlayerActive(0);

    // 初期残り時間を確認（600秒）
    const initialTime = await gameTimerPage.getPlayerElapsedTime(0);
    expect(initialTime).toBe(600);

    // 3秒待機してタイマー減少を確認
    await gameTimerPage.page.waitForTimeout(3000);
    const currentTime = await gameTimerPage.getPlayerElapsedTime(0);
    assertTimeInRange(currentTime, 597, 1);
  });

  test('カウントダウンモードで残り時間0秒でタイムアウトする', async () => {
    // Requirements: 3.5
    // 3秒カウントダウンに設定
    await gameTimerPage.setTimerModeCountDown(3);
    await gameTimerPage.setPlayerActive(0);

    // 4秒待機してタイムアウトを確認
    await gameTimerPage.page.waitForTimeout(4000);

    const isTimedOut = await gameTimerPage.isPlayerTimedOut(0);
    expect(isTimedOut).toBe(true);
  });

  test('カウントダウン秒数をカスタマイズできる', async () => {
    // Requirements: 3.6
    await gameTimerPage.setTimerModeCountDown(300);
    await gameTimerPage.setPlayerActive(0);

    // 初期残り時間を確認（300秒）
    const initialTime = await gameTimerPage.getPlayerElapsedTime(0);
    expect(initialTime).toBe(300);
  });

  test('経過時間がMM:SSフォーマットで表示される', async () => {
    // Requirements: 3.7
    await gameTimerPage.setTimerModeCountUp();
    await gameTimerPage.setPlayerActive(0);

    // 数秒待機
    await gameTimerPage.page.waitForTimeout(2000);

    const playerCard = gameTimerPage.getPlayerCardByIndex(0);
    const timeText = await playerCard.locator('.player-time').textContent();

    // MM:SSフォーマットを確認（例: 00:02）
    expect(timeText).toMatch(/\d{2}:\d{2}/);
  });

  test('カウントアップからカウントダウンへの切り替えができる', async () => {
    // カウントアップでタイマー開始
    await gameTimerPage.setTimerModeCountUp();
    await gameTimerPage.setPlayerActive(0);
    await gameTimerPage.page.waitForTimeout(2000);

    // カウントダウンに切り替え
    await gameTimerPage.setTimerModeCountDown(600);
    await gameTimerPage.setPlayerActive(0);

    // 残り時間が600秒にリセットされることを確認
    const time = await gameTimerPage.getPlayerElapsedTime(0);
    expect(time).toBe(600);
  });
});

import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * ゲーム制御機能のE2Eテスト
 * Requirements: 5.1〜5.7
 */
test.describe('ゲーム制御機能', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    gameTimerPage = new GameTimerPage(page);
    await gameTimerPage.navigate();
  });

  test('一時停止ボタンでタイマーが停止する', async () => {
    // Requirements: 5.1
    // プレイヤー0をアクティブに設定してタイマー開始
    await gameTimerPage.setPlayerActive(0);

    // 1秒待機してタイマーが進んでいることを確認
    await gameTimerPage.page.waitForTimeout(1000);
    const timeAfter1sec = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeAfter1sec).toBeGreaterThan(0);

    // 一時停止
    await gameTimerPage.togglePause();

    // 現在の経過時間を記録
    const timePaused = await gameTimerPage.getPlayerElapsedTime(0);

    // さらに2秒待機
    await gameTimerPage.page.waitForTimeout(2000);

    // 一時停止中なので時間が進まない
    const timeAfterPause = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeAfterPause).toBe(timePaused);
  });

  test('再開ボタンでタイマーが再開する', async () => {
    // Requirements: 5.2
    // プレイヤー0をアクティブに設定
    await gameTimerPage.setPlayerActive(0);

    // 一時停止
    await gameTimerPage.togglePause();
    await gameTimerPage.page.waitForTimeout(500);

    // 再開（togglePauseを再度呼ぶ）
    await gameTimerPage.togglePause();

    // 2秒待機
    await gameTimerPage.page.waitForTimeout(2000);

    // タイマーが再開されているので時間が進む
    const timeAfterResume = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeAfterResume).toBeGreaterThan(0);
  });

  test('一時停止/再開ボタンのテキストが切り替わる', async () => {
    // Requirements: 5.4
    // 初期状態では「一時停止」
    let buttonText = await gameTimerPage.getPauseResumeButtonText();
    expect(buttonText).toContain('一時停止');

    // 一時停止すると「再開」に変わる
    await gameTimerPage.togglePause();
    buttonText = await gameTimerPage.getPauseResumeButtonText();
    expect(buttonText).toContain('再開');

    // 再開すると「一時停止」に戻る
    await gameTimerPage.togglePause();
    buttonText = await gameTimerPage.getPauseResumeButtonText();
    expect(buttonText).toContain('一時停止');
  });

  test('一時停止中はタイマーが停止する', async () => {
    // Requirements: 5.3
    // カウントダウンモードで10秒設定
    await gameTimerPage.setTimerModeCountDown(10);

    // プレイヤー0をアクティブに設定
    await gameTimerPage.setPlayerActive(0);

    // 1秒待機
    await gameTimerPage.page.waitForTimeout(1000);

    // 一時停止
    await gameTimerPage.togglePause();

    // 現在の残り時間を記録
    const timeBeforePause = await gameTimerPage.getPlayerElapsedTime(0);

    // 3秒待機
    await gameTimerPage.page.waitForTimeout(3000);

    // 一時停止中なので時間が進まない
    const timeDuringPause = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeDuringPause).toBe(timeBeforePause);
  });

  test('リセットボタンで全状態がリセットされる', async () => {
    // Requirements: 5.5, 5.6, 5.7
    // カウントアップモードでプレイヤー0をアクティブに設定して時間を進める
    await gameTimerPage.setPlayerActive(0);
    await gameTimerPage.page.waitForTimeout(2000);

    // 経過時間が0より大きいことを確認
    const timeBefore = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeBefore).toBeGreaterThan(0);

    // 一時停止
    await gameTimerPage.togglePause();

    // リセット
    await gameTimerPage.resetGame();

    // 全プレイヤーの経過時間が0秒
    const player0Time = await gameTimerPage.getPlayerElapsedTime(0);
    expect(player0Time).toBe(0);

    // アクティブプレイヤーがnull（誰もactiveクラスを持たない）
    const player0Active = await gameTimerPage.isPlayerActive(0);
    const player1Active = await gameTimerPage.isPlayerActive(1);
    const player2Active = await gameTimerPage.isPlayerActive(2);
    const player3Active = await gameTimerPage.isPlayerActive(3);
    expect(player0Active).toBe(false);
    expect(player1Active).toBe(false);
    expect(player2Active).toBe(false);
    expect(player3Active).toBe(false);

    // reset-button-fix: リセット後は停止状態（ボタンテキストが「一時停止」）
    // isPaused: true（停止状態）になるが、ボタンテキストは停止状態を示す「一時停止」
    const buttonText = await gameTimerPage.getPauseResumeButtonText();
    expect(buttonText).toContain('一時停止');
  });

  test('リセット後にプレイヤーをアクティブにできる', async () => {
    // Requirements: 5.5
    // プレイヤー0をアクティブにして時間を進める
    await gameTimerPage.setPlayerActive(0);
    await gameTimerPage.page.waitForTimeout(1000);

    // リセット
    await gameTimerPage.resetGame();

    // リセット後、プレイヤー1をアクティブにできる
    await gameTimerPage.setPlayerActive(1);
    const isActive = await gameTimerPage.isPlayerActive(1);
    expect(isActive).toBe(true);

    // タイマーが動作する
    await gameTimerPage.page.waitForTimeout(1000);
    const time = await gameTimerPage.getPlayerElapsedTime(1);
    expect(time).toBeGreaterThan(0);
  });

  test('リセット後、タイマーが完全に停止していることを確認（reset-button-fix）', async () => {
    // Task 3.2: リセット後のタイマー停止検証
    // プレイヤー0をアクティブにしてタイマー開始
    await gameTimerPage.setPlayerActive(0);
    await gameTimerPage.page.waitForTimeout(2000);

    // 経過時間が進んでいることを確認
    const timeBeforeReset = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeBeforeReset).toBeGreaterThanOrEqual(1);

    // リセット実行
    await gameTimerPage.resetGame();

    // 全プレイヤーの時間が0秒にリセットされることを確認
    const player0TimeAfterReset = await gameTimerPage.getPlayerElapsedTime(0);
    expect(player0TimeAfterReset).toBe(0);

    // 5秒待機してタイマーが動作しないことを確認
    await gameTimerPage.page.waitForTimeout(5000);

    // プレイヤーの時間が変化しないこと（タイマーが停止している）
    const player0TimeAfterWait = await gameTimerPage.getPlayerElapsedTime(0);
    expect(player0TimeAfterWait).toBe(0);

    // 全プレイヤーが非アクティブであることを確認
    for (let i = 0; i < 4; i++) {
      const isActive = await gameTimerPage.isPlayerActive(i);
      expect(isActive).toBe(false);
    }
  });
});

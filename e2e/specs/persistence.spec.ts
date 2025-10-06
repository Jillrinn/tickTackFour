import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * Phase 2専用: DB永続化機能のE2Eテスト
 * Requirements: 7.1〜7.7
 *
 * このテストはPhase 2（Cosmos DB統合）実装時に有効化する
 * 実行制御: PHASE=2環境変数で切り替え
 */

const isPhase2 = process.env.PHASE === '2';

test.describe('DB永続化機能（Phase 2）', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    gameTimerPage = new GameTimerPage(page);
    await gameTimerPage.navigate();
  });

  test.skip(isPhase2, 'リロード後にゲーム状態が復元される', async ({ page }) => {
    // Requirements: 7.1
    // プレイヤー0をアクティブにして時間を進める
    await gameTimerPage.setPlayerActive(0);
    await page.waitForTimeout(2000);

    // 経過時間とアクティブ状態を記録
    const timeBefore = await gameTimerPage.getPlayerElapsedTime(0);
    const isActiveBefore = await gameTimerPage.isPlayerActive(0);
    expect(timeBefore).toBeGreaterThan(0);
    expect(isActiveBefore).toBe(true);

    // ページリロード
    await page.reload();
    await gameTimerPage.verifyPageLoaded();

    // 状態が復元されることを確認
    const timeAfter = await gameTimerPage.getPlayerElapsedTime(0);
    const isActiveAfter = await gameTimerPage.isPlayerActive(0);

    // 経過時間が保持されている（±1秒の誤差許容）
    expect(timeAfter).toBeGreaterThanOrEqual(timeBefore - 1);
    expect(timeAfter).toBeLessThanOrEqual(timeBefore + 3); // リロード時間考慮

    // アクティブ状態が保持されている
    expect(isActiveAfter).toBe(true);
  });

  test.skip(isPhase2 !== true, 'プレイヤー数変更がDB に保存される', async ({ page }) => {
    // Requirements: 7.2
    // プレイヤー数を5人に変更
    await gameTimerPage.setPlayerCount(5);
    await page.waitForTimeout(500); // DB保存待機

    // リロード
    await page.reload();
    await gameTimerPage.verifyPageLoaded();

    // プレイヤー数が復元される
    const playerCount = await gameTimerPage.getPlayerCount();
    expect(playerCount).toBe(5);
  });

  test.skip(isPhase2 !== true, 'タイマーモード変更がDB に保存される', async ({ page }) => {
    // Requirements: 7.3
    // カウントダウンモードに変更（300秒）
    await gameTimerPage.setTimerModeCountDown(300);
    await page.waitForTimeout(500); // DB保存待機

    // リロード
    await page.reload();
    await gameTimerPage.verifyPageLoaded();

    // カウントダウンモードが復元される
    // プレイヤーをアクティブにして減少することを確認
    await gameTimerPage.setPlayerActive(0);
    const initialTime = await gameTimerPage.getPlayerElapsedTime(0);

    await page.waitForTimeout(2000);

    const afterTime = await gameTimerPage.getPlayerElapsedTime(0);
    expect(afterTime).toBeLessThan(initialTime); // カウントダウンなので減少
  });

  test.skip(isPhase2 !== true, 'プレイヤー名変更がDB に保存される', async ({ page }) => {
    // Requirements: 7.4
    // プレイヤー0の名前を変更
    const customName = 'Alice';
    await gameTimerPage.setPlayerName(0, customName);
    await page.waitForTimeout(500); // DB保存待機

    // リロード
    await page.reload();
    await gameTimerPage.verifyPageLoaded();

    // 名前が復元される
    const restoredName = await gameTimerPage.getPlayerName(0);
    expect(restoredName).toBe(customName);
  });

  test.skip(isPhase2 !== true, '一時停止状態がDB に保存される', async ({ page }) => {
    // Requirements: 7.5
    // プレイヤーをアクティブにして一時停止
    await gameTimerPage.setPlayerActive(0);
    await page.waitForTimeout(1000);
    await gameTimerPage.togglePause();
    await page.waitForTimeout(500); // DB保存待機

    // 一時停止ボタンのテキストを確認
    const buttonTextBefore = await gameTimerPage.getPauseResumeButtonText();
    expect(buttonTextBefore).toContain('再開');

    // リロード
    await page.reload();
    await gameTimerPage.verifyPageLoaded();

    // 一時停止状態が復元される
    const buttonTextAfter = await gameTimerPage.getPauseResumeButtonText();
    expect(buttonTextAfter).toContain('再開');
  });

  test.skip(isPhase2 !== true, '複数状態の同時保存と復元', async ({ page }) => {
    // Requirements: 7.6
    // 複数の状態を変更
    await gameTimerPage.setPlayerCount(6);
    await gameTimerPage.setTimerModeCountDown(180);
    await gameTimerPage.setPlayerName(0, 'Player One');
    await gameTimerPage.setPlayerName(1, 'Player Two');
    await gameTimerPage.setPlayerActive(1);
    await page.waitForTimeout(2000); // 時間経過
    await gameTimerPage.togglePause();
    await page.waitForTimeout(1000); // DB保存待機

    // 状態を記録
    const playerCount = await gameTimerPage.getPlayerCount();
    const player0Name = await gameTimerPage.getPlayerName(0);
    const player1Name = await gameTimerPage.getPlayerName(1);
    const player1Time = await gameTimerPage.getPlayerElapsedTime(1);
    const isPaused = (await gameTimerPage.getPauseResumeButtonText()).includes('再開');

    // リロード
    await page.reload();
    await gameTimerPage.verifyPageLoaded();

    // 全状態が復元される
    expect(await gameTimerPage.getPlayerCount()).toBe(playerCount);
    expect(await gameTimerPage.getPlayerName(0)).toBe(player0Name);
    expect(await gameTimerPage.getPlayerName(1)).toBe(player1Name);
    expect(await gameTimerPage.getPlayerElapsedTime(1)).toBeGreaterThanOrEqual(player1Time - 1);
    expect((await gameTimerPage.getPauseResumeButtonText()).includes('再開')).toBe(isPaused);
  });

  test.skip(isPhase2 !== true, 'DB接続エラー時のフォールバック動作', async ({ page }) => {
    // Requirements: 7.7
    // Note: このテストはDB接続をシミュレートで切断する必要がある
    // モックサーバーやネットワークエラーシミュレーション機能を使用

    // ローカルストレージモードにフォールバック
    // アプリケーションがエラー表示せずに動作継続することを確認
    await gameTimerPage.setPlayerActive(0);
    const isActive = await gameTimerPage.isPlayerActive(0);
    expect(isActive).toBe(true);

    // エラーメッセージが表示されないことを確認
    const errorMessage = await page.locator('.error-message').count();
    expect(errorMessage).toBe(0);
  });
});

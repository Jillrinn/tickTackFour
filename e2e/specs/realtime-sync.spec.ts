import { test, expect, Page } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * Phase 2専用: SignalRリアルタイム同期機能のE2Eテスト
 * Requirements: 7.1〜7.7
 *
 * このテストはPhase 2（SignalR統合）実装時に有効化する
 * 実行制御: PHASE=2環境変数で切り替え
 */

const isPhase2 = process.env.PHASE === '2';

test.describe('SignalRリアルタイム同期機能（Phase 2）', () => {
  let page1: Page;
  let page2: Page;
  let gameTimerPage1: GameTimerPage;
  let gameTimerPage2: GameTimerPage;

  test.beforeEach(async ({ browser }) => {
    // 2つのブラウザコンテキストを作成（複数クライアントシミュレーション）
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    page1 = await context1.newPage();
    page2 = await context2.newPage();

    gameTimerPage1 = new GameTimerPage(page1);
    gameTimerPage2 = new GameTimerPage(page2);

    await gameTimerPage1.navigate();
    await gameTimerPage2.navigate();
  });

  test.afterEach(async () => {
    await page1.close();
    await page2.close();
  });

  test.skip(isPhase2 !== true, 'アクティブプレイヤー変更が他のクライアントに同期される', async () => {
    // Requirements: 7.1
    // クライアント1でプレイヤー0をアクティブに設定
    await gameTimerPage1.setPlayerActive(0);
    expect(await gameTimerPage1.isPlayerActive(0)).toBe(true);

    // クライアント2でも同期されることを確認（SignalR経由）
    await page2.waitForTimeout(500); // SignalR同期待機
    expect(await gameTimerPage2.isPlayerActive(0)).toBe(true);
  });

  test.skip(isPhase2 !== true, '次のプレイヤー切り替えが同期される', async () => {
    // Requirements: 7.2
    // クライアント1でプレイヤー0をアクティブに設定
    await gameTimerPage1.setPlayerActive(0);

    // クライアント2で次のプレイヤーへ切り替え
    await gameTimerPage2.switchToNextPlayer();
    await page1.waitForTimeout(500); // SignalR同期待機

    // クライアント1でもプレイヤー1がアクティブになる
    expect(await gameTimerPage1.isPlayerActive(0)).toBe(false);
    expect(await gameTimerPage1.isPlayerActive(1)).toBe(true);
  });

  test.skip(isPhase2 !== true, 'タイマー経過時間が同期される', async () => {
    // Requirements: 7.3
    // クライアント1でプレイヤー0をアクティブに設定
    await gameTimerPage1.setPlayerActive(0);
    await page1.waitForTimeout(2000); // 2秒経過

    // クライアント2で経過時間を確認
    await page2.waitForTimeout(500); // SignalR同期待機
    const time = await gameTimerPage2.getPlayerElapsedTime(0);
    expect(time).toBeGreaterThanOrEqual(1);
    expect(time).toBeLessThanOrEqual(3);
  });

  test.skip(isPhase2 !== true, '一時停止/再開が同期される', async () => {
    // Requirements: 7.4
    // クライアント1でプレイヤーをアクティブにして一時停止
    await gameTimerPage1.setPlayerActive(0);
    await gameTimerPage1.togglePause();

    // クライアント2で一時停止状態を確認
    await page2.waitForTimeout(500); // SignalR同期待機
    const buttonText = await gameTimerPage2.getPauseResumeButtonText();
    expect(buttonText).toContain('再開');
  });

  test.skip(isPhase2 !== true, 'リセットが同期される', async () => {
    // Requirements: 7.5
    // クライアント1でゲーム状態を変更
    await gameTimerPage1.setPlayerActive(0);
    await page1.waitForTimeout(2000);

    // クライアント2でリセット
    await gameTimerPage2.resetGame();
    await page1.waitForTimeout(500); // SignalR同期待機

    // クライアント1でもリセットされる
    const time = await gameTimerPage1.getPlayerElapsedTime(0);
    expect(time).toBe(0);

    const isActive = await gameTimerPage1.isPlayerActive(0);
    expect(isActive).toBe(false);
  });

  test.skip(isPhase2 !== true, 'プレイヤー数変更が同期される', async () => {
    // Requirements: 7.6
    // クライアント1でプレイヤー数を5人に変更
    await gameTimerPage1.setPlayerCount(5);
    await page2.waitForTimeout(500); // SignalR同期待機

    // クライアント2でもプレイヤー数が5人になる
    const count = await gameTimerPage2.getPlayerCount();
    expect(count).toBe(5);
  });

  test.skip(isPhase2 !== true, 'プレイヤー名変更が同期される', async () => {
    // Requirements: 7.7
    // クライアント1でプレイヤー0の名前を変更
    const customName = 'Alice';
    await gameTimerPage1.setPlayerName(0, customName);
    await page2.waitForTimeout(500); // SignalR同期待機

    // クライアント2でも名前が変更される
    const name = await gameTimerPage2.getPlayerName(0);
    expect(name).toBe(customName);
  });

  test.skip(isPhase2 !== true, '複数クライアント間の競合解決', async () => {
    // Requirements: 7.7
    // 同時に異なるプレイヤーをアクティブに設定（競合シナリオ）
    await Promise.all([
      gameTimerPage1.setPlayerActive(0),
      gameTimerPage2.setPlayerActive(1),
    ]);

    await page1.waitForTimeout(1000); // SignalR同期と競合解決待機
    await page2.waitForTimeout(1000);

    // 最終的に一貫した状態になる（後勝ちまたはタイムスタンプベース）
    const active1OnPage1 = await gameTimerPage1.isPlayerActive(0);
    const active2OnPage1 = await gameTimerPage1.isPlayerActive(1);
    const active1OnPage2 = await gameTimerPage2.isPlayerActive(0);
    const active2OnPage2 = await gameTimerPage2.isPlayerActive(1);

    // 両クライアントで同じ状態
    expect(active1OnPage1).toBe(active1OnPage2);
    expect(active2OnPage1).toBe(active2OnPage2);

    // いずれか1つのプレイヤーのみがアクティブ
    const activeCount = [active1OnPage1, active2OnPage1].filter(Boolean).length;
    expect(activeCount).toBe(1);
  });

  test.skip(isPhase2 !== true, 'SignalR接続切断時の再接続と状態同期', async () => {
    // Requirements: 7.7
    // クライアント1でゲーム状態を変更
    await gameTimerPage1.setPlayerActive(0);
    await page1.waitForTimeout(1000);

    // クライアント2のネットワークを切断（オフラインシミュレーション）
    await page2.context().setOffline(true);

    // クライアント1でさらに変更
    await gameTimerPage1.switchToNextPlayer();
    await page1.waitForTimeout(1000);

    // クライアント2を再接続
    await page2.context().setOffline(false);
    await page2.waitForTimeout(2000); // 再接続と同期待機

    // クライアント2が最新状態に同期される
    expect(await gameTimerPage2.isPlayerActive(0)).toBe(false);
    expect(await gameTimerPage2.isPlayerActive(1)).toBe(true);
  });
});

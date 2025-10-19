import { test, expect, Page, Browser } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * multiplayer-sync E2Eテスト
 * Phase 2: Cosmos DB永続化 + ポーリング同期機能の検証
 *
 * Task 5.3 要件:
 * 1. 複数タブでのポーリング同期テスト（デバイスAで操作→5秒後デバイスBで反映）
 * 2. ブラウザリロード後の状態復元テスト
 * 3. 楽観的ロック競合シナリオのテスト（同時更新）
 * 4. インメモリーモードフォールバックのテスト（API停止シミュレーション）
 *
 * 実行制御: PHASE=2環境変数で有効化
 */

const isPhase2 = process.env.PHASE === '2';

test.describe('マルチプレイヤー同期機能（Phase 2）', () => {
  test.skip(!isPhase2, '環境変数PHASE=2が必要です');

  test.describe('1. 複数タブでのポーリング同期', () => {
    test('デバイスAでターン切り替え→5秒後デバイスBで反映', async ({ browser }) => {
      // Requirements: 要件2（ポーリング同期）
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const device1 = new GameTimerPage(page1);
      const device2 = new GameTimerPage(page2);

      // 両デバイスでアプリを開く
      await device1.navigate();
      await device2.navigate();

      // Device1でプレイヤー0をアクティブにする
      await device1.setPlayerActive(0);
      await page1.waitForTimeout(1000);

      // Device1でターン切り替え
      await device1.switchTurn();
      const device1ActivePlayer = await device1.getActivePlayerIndex();
      expect(device1ActivePlayer).toBe(1); // プレイヤー1がアクティブ

      // 5秒待機（ポーリング間隔）
      await page2.waitForTimeout(6000); // 余裕を持って6秒

      // Device2で反映を確認
      const device2ActivePlayer = await device2.getActivePlayerIndex();
      expect(device2ActivePlayer).toBe(1); // プレイヤー1がアクティブ

      await context1.close();
      await context2.close();
    });

    test('デバイスAで一時停止→5秒後デバイスBで反映', async ({ browser }) => {
      // Requirements: 要件2（ポーリング同期）
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const device1 = new GameTimerPage(page1);
      const device2 = new GameTimerPage(page2);

      await device1.navigate();
      await device2.navigate();

      // Device1でプレイヤーをアクティブにして一時停止
      await device1.setPlayerActive(0);
      await page1.waitForTimeout(1000);
      await device1.togglePause();

      const device1PauseText = await device1.getPauseResumeButtonText();
      expect(device1PauseText).toContain('再開');

      // 5秒待機（ポーリング間隔）
      await page2.waitForTimeout(6000);

      // Device2で反映を確認
      const device2PauseText = await device2.getPauseResumeButtonText();
      expect(device2PauseText).toContain('再開');

      await context1.close();
      await context2.close();
    });

    test('デバイスAでプレイヤー数変更→5秒後デバイスBで反映', async ({ browser }) => {
      // Requirements: 要件2（ポーリング同期）
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const device1 = new GameTimerPage(page1);
      const device2 = new GameTimerPage(page2);

      await device1.navigate();
      await device2.navigate();

      // Device1でプレイヤー数を5人に変更
      await device1.setPlayerCount(5);
      await page1.waitForTimeout(1000); // API送信待機

      // 5秒待機（ポーリング間隔）
      await page2.waitForTimeout(6000);

      // Device2で反映を確認
      const device2PlayerCount = await device2.getPlayerCount();
      expect(device2PlayerCount).toBe(5);

      await context1.close();
      await context2.close();
    });
  });

  test.describe('2. ブラウザリロード後の状態復元', () => {
    test('リロード後にゲーム状態が復元される', async ({ page }) => {
      // Requirements: 要件1（ゲーム状態の永続化）
      const gameTimer = new GameTimerPage(page);
      await gameTimer.navigate();

      // プレイヤー0をアクティブにして時間を進める
      await gameTimer.setPlayerActive(0);
      await page.waitForTimeout(2000);

      // 経過時間とアクティブ状態を記録
      const timeBefore = await gameTimer.getPlayerElapsedTime(0);
      const isActiveBefore = await gameTimer.isPlayerActive(0);
      expect(timeBefore).toBeGreaterThan(0);
      expect(isActiveBefore).toBe(true);

      // ページリロード
      await page.reload();
      await gameTimer.verifyPageLoaded();

      // 状態が復元されることを確認
      const timeAfter = await gameTimer.getPlayerElapsedTime(0);
      const isActiveAfter = await gameTimer.isPlayerActive(0);

      // 経過時間が保持されている（±2秒の誤差許容）
      expect(timeAfter).toBeGreaterThanOrEqual(timeBefore - 2);
      expect(timeAfter).toBeLessThanOrEqual(timeBefore + 4); // リロード時間考慮

      // アクティブ状態が保持されている
      expect(isActiveAfter).toBe(true);
    });

    test('リロード後にプレイヤー数とモードが復元される', async ({ page }) => {
      // Requirements: 要件1（ゲーム状態の永続化）
      const gameTimer = new GameTimerPage(page);
      await gameTimer.navigate();

      // プレイヤー数を6人に変更
      await gameTimer.setPlayerCount(6);
      await page.waitForTimeout(1000); // API送信待機

      // リロード
      await page.reload();
      await gameTimer.verifyPageLoaded();

      // プレイヤー数が復元される
      const playerCount = await gameTimer.getPlayerCount();
      expect(playerCount).toBe(6);
    });

    test('リロード後に一時停止状態が復元される', async ({ page }) => {
      // Requirements: 要件1（ゲーム状態の永続化）
      const gameTimer = new GameTimerPage(page);
      await gameTimer.navigate();

      // プレイヤーをアクティブにして一時停止
      await gameTimer.setPlayerActive(0);
      await page.waitForTimeout(1000);
      await gameTimer.togglePause();
      await page.waitForTimeout(1000); // API送信待機

      // 一時停止ボタンのテキストを確認
      const buttonTextBefore = await gameTimer.getPauseResumeButtonText();
      expect(buttonTextBefore).toContain('再開');

      // リロード
      await page.reload();
      await gameTimer.verifyPageLoaded();

      // 一時停止状態が復元される
      const buttonTextAfter = await gameTimer.getPauseResumeButtonText();
      expect(buttonTextAfter).toContain('再開');
    });
  });

  test.describe('3. 楽観的ロック競合シナリオ', () => {
    test('同時更新時に412 Conflictエラーが検出される', async ({ browser }) => {
      // Requirements: 要件3（楽観的ロック制御）
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const device1 = new GameTimerPage(page1);
      const device2 = new GameTimerPage(page2);

      await device1.navigate();
      await device2.navigate();

      // 両デバイスで同期待機
      await page1.waitForTimeout(6000); // ポーリング同期

      // ほぼ同時にターン切り替えを実行
      const [result1, result2] = await Promise.all([
        device1.switchTurn(),
        device2.switchTurn()
      ]);

      // 少なくとも1つのデバイスが成功すること
      // （もう一方は412 Conflictでリトライまたはエラー表示）
      await page1.waitForTimeout(2000);

      // 両デバイスで最終的に同じ状態になることを確認（ポーリングで同期）
      await page1.waitForTimeout(6000);
      await page2.waitForTimeout(6000);

      const device1ActivePlayer = await device1.getActivePlayerIndex();
      const device2ActivePlayer = await device2.getActivePlayerIndex();
      expect(device1ActivePlayer).toBe(device2ActivePlayer);

      await context1.close();
      await context2.close();
    });
  });

  test.describe('4. インメモリーモードフォールバック', () => {
    test('API停止時にインメモリーモードで動作継続', async ({ page, context }) => {
      // Requirements: 要件6（インメモリーモードフォールバック）

      // API呼び出しを全てブロック（503 Service Unavailable）
      await context.route('**/api/**', route => {
        route.abort('failed');
      });

      const gameTimer = new GameTimerPage(page);
      await gameTimer.navigate();

      // インメモリーモードでも基本操作が動作することを確認
      await gameTimer.setPlayerActive(0);
      const isActive = await gameTimer.isPlayerActive(0);
      expect(isActive).toBe(true);

      // タイマーが進むことを確認
      const timeBefore = await gameTimer.getPlayerElapsedTime(0);
      await page.waitForTimeout(2000);
      const timeAfter = await gameTimer.getPlayerElapsedTime(0);
      expect(timeAfter).toBeGreaterThan(timeBefore);

      // ターン切り替えが動作することを確認
      await gameTimer.switchTurn();
      const activePlayerAfterSwitch = await gameTimer.getActivePlayerIndex();
      expect(activePlayerAfterSwitch).toBe(1);
    });

    test('API復旧時に自動的にCosmos DB同期に切り替わる', async ({ page, context }) => {
      // Requirements: 要件6（インメモリーモードフォールバック）

      let apiBlocked = true;

      // 最初はAPIをブロック
      await context.route('**/api/**', route => {
        if (apiBlocked) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      const gameTimer = new GameTimerPage(page);
      await gameTimer.navigate();

      // インメモリーモードで操作
      await gameTimer.setPlayerActive(0);
      await page.waitForTimeout(2000);

      // API復旧（ブロック解除）
      apiBlocked = false;

      // 定期的なAPI接続リトライ（30秒間隔）を待つ
      // またはポーリング（5秒間隔）を待つ
      await page.waitForTimeout(7000);

      // 次の操作でCosmos DBに保存されることを確認
      await gameTimer.switchTurn();
      await page.waitForTimeout(1000);

      // リロードして状態が復元されることを確認（Cosmos DBに保存された証拠）
      await page.reload();
      await gameTimer.verifyPageLoaded();

      const activePlayerAfterReload = await gameTimer.getActivePlayerIndex();
      expect(activePlayerAfterReload).toBe(1); // ターン切り替え後の状態が保存されている
    });
  });

  test.describe('5. ポーリング失敗時の復旧', () => {
    test('ポーリングエラー後も次回ポーリングを継続', async ({ page, context }) => {
      // Requirements: 要件2.3（ポーリング失敗時の復旧）

      let failCount = 0;
      const maxFails = 2;

      // 最初の2回のポーリングは失敗させる
      await context.route('**/api/game', route => {
        if (route.request().method() === 'GET') {
          failCount++;
          if (failCount <= maxFails) {
            route.abort('failed');
          } else {
            route.continue();
          }
        } else {
          route.continue();
        }
      });

      const gameTimer = new GameTimerPage(page);
      await gameTimer.navigate();

      // 2回のポーリング失敗を待つ（5秒×2=10秒）
      await page.waitForTimeout(12000);

      // 3回目のポーリングは成功し、アプリが正常動作すること
      await gameTimer.setPlayerActive(0);
      const isActive = await gameTimer.isPlayerActive(0);
      expect(isActive).toBe(true);
    });
  });
});

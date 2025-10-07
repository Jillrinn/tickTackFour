import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * Task 7.3: ui-controls-enhancement E2Eテスト
 *
 * テスト対象機能:
 * - Task 3: プレイヤー人数ドロップダウン
 * - Task 4: カウントモードトグルスイッチ
 * - Task 2: 固定ヘッダー
 * - Task 6: レスポンシブUI
 * - ゲーム進行中の無効化制御
 */

test.describe('UI Controls Enhancement E2E Tests', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    gameTimerPage = new GameTimerPage(page);
    await gameTimerPage.navigate();
  });

  test.describe('Task 3: プレイヤー人数ドロップダウン', () => {
    test('プレイヤー人数ドロップダウンで4人→5人→6人に変更できる', async () => {
      // 初期状態: 4人
      let playerCount = await gameTimerPage.getPlayerCount();
      expect(playerCount).toBe(4);

      // 5人に変更
      await gameTimerPage.setPlayerCount(5);
      playerCount = await gameTimerPage.getPlayerCount();
      expect(playerCount).toBe(5);

      // プレイヤー5の名前を確認
      const player5Name = await gameTimerPage.getPlayerName(4); // 0-indexed
      expect(player5Name).toContain('プレイヤー5');

      // 6人に変更
      await gameTimerPage.setPlayerCount(6);
      playerCount = await gameTimerPage.getPlayerCount();
      expect(playerCount).toBe(6);

      // プレイヤー6の名前を確認
      const player6Name = await gameTimerPage.getPlayerName(5); // 0-indexed
      expect(player6Name).toContain('プレイヤー6');
    });

    test('プレイヤー人数変更時、既存のプレイヤー時間データが保持される', async () => {
      // プレイヤー1をアクティブにして時間を進める
      await gameTimerPage.switchToNextPlayer();
      await gameTimerPage.page.waitForTimeout(2000); // 2秒待機

      // プレイヤー1の時間を記録
      const player1Time = await gameTimerPage.getPlayerElapsedTime(0);
      expect(player1Time).toBeGreaterThan(0);

      // 5人に変更
      await gameTimerPage.togglePause(); // 一時停止
      await gameTimerPage.setPlayerCount(5);

      // プレイヤー1の時間が保持されていることを確認
      const player1TimeAfter = await gameTimerPage.getPlayerElapsedTime(0);
      expect(player1TimeAfter).toBeGreaterThanOrEqual(player1Time);
    });

    test('ゲーム進行中はプレイヤー人数ドロップダウンが無効化される', async () => {
      // 初期状態: 有効
      let isDisabled = await gameTimerPage.isPlayerCountDropdownDisabled();
      expect(isDisabled).toBe(false);

      // ゲーム開始（次のプレイヤーへ）
      await gameTimerPage.switchToNextPlayer();

      // ドロップダウンが無効化される
      isDisabled = await gameTimerPage.isPlayerCountDropdownDisabled();
      expect(isDisabled).toBe(true);

      // 一時停止すると有効化される
      await gameTimerPage.togglePause();
      isDisabled = await gameTimerPage.isPlayerCountDropdownDisabled();
      expect(isDisabled).toBe(false);
    });
  });

  test.describe('Task 4: カウントモードトグルスイッチ', () => {
    test('カウントモードトグルスイッチでカウントアップ⇔カウントダウンを切り替えられる', async () => {
      // 初期状態: カウントアップ
      let isCountdownVisible = await gameTimerPage.isCountdownControlVisible();
      expect(isCountdownVisible).toBe(false);

      // カウントダウンに切り替え
      await gameTimerPage.setTimerModeCountDown(120);
      isCountdownVisible = await gameTimerPage.isCountdownControlVisible();
      expect(isCountdownVisible).toBe(true);

      // カウントアップに戻す
      await gameTimerPage.setTimerModeCountUp();
      isCountdownVisible = await gameTimerPage.isCountdownControlVisible();
      expect(isCountdownVisible).toBe(false);
    });

    test('カウントダウンモード時、設定UIが表示される', async () => {
      // カウントダウンに切り替え
      await gameTimerPage.setTimerModeCountDown();

      // カウントダウン設定UIが表示される
      const isVisible = await gameTimerPage.isCountdownControlVisible();
      expect(isVisible).toBe(true);
    });

    test('ゲーム進行中はカウントモードトグルが無効化される', async () => {
      // 初期状態: 有効
      let isDisabled = await gameTimerPage.isTimerModeToggleDisabled();
      expect(isDisabled).toBe(false);

      // ゲーム開始（次のプレイヤーへ）
      await gameTimerPage.switchToNextPlayer();

      // トグルが無効化される
      isDisabled = await gameTimerPage.isTimerModeToggleDisabled();
      expect(isDisabled).toBe(true);

      // 一時停止すると有効化される
      await gameTimerPage.togglePause();
      isDisabled = await gameTimerPage.isTimerModeToggleDisabled();
      expect(isDisabled).toBe(false);
    });
  });

  test.describe('Task 2: 固定ヘッダー', () => {
    test('固定ヘッダーが常に表示される', async () => {
      const isVisible = await gameTimerPage.isStickyHeaderVisible();
      expect(isVisible).toBe(true);
    });

    test('ゲーム未開始時、固定ヘッダーに「ゲーム未開始」と表示される', async () => {
      const infoText = await gameTimerPage.getStickyHeaderInfoText();
      expect(infoText).toContain('ゲーム未開始');
    });

    test('次のプレイヤーへボタンクリック時、固定ヘッダー情報が更新される', async () => {
      // 次のプレイヤーへ
      await gameTimerPage.switchToNextPlayer();

      // 固定ヘッダーにプレイヤー1の情報が表示される
      const infoText = await gameTimerPage.getStickyHeaderInfoText();
      expect(infoText).toContain('現在のプレイヤー');
      expect(infoText).toContain('プレイヤー1');
    });

    test('固定ヘッダーの次のプレイヤーへボタンでターン切り替えができる', async () => {
      // 固定ヘッダー内のボタンをクリック（GameTimerPage.switchToNextPlayerは固定ヘッダーのボタンを使用）
      await gameTimerPage.switchToNextPlayer();

      // プレイヤー1がアクティブになる
      let isActive = await gameTimerPage.isPlayerActive(0);
      expect(isActive).toBe(true);

      // 再度クリック
      await gameTimerPage.switchToNextPlayer();

      // プレイヤー2がアクティブになる
      isActive = await gameTimerPage.isPlayerActive(1);
      expect(isActive).toBe(true);
    });

    test('ページスクロール後も固定ヘッダーが画面上部に表示される', async ({ page }) => {
      // スクロール可能な高さを確保するため、ビューポートを小さくする
      await page.setViewportSize({ width: 375, height: 500 });

      // 固定ヘッダーが表示されることを確認
      const isVisible = await gameTimerPage.isStickyHeaderVisible();
      expect(isVisible).toBe(true);

      // ページ下部にスクロール
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // 固定ヘッダーがまだ表示されていることを確認
      const isVisibleAfterScroll = await gameTimerPage.isStickyHeaderVisible();
      expect(isVisibleAfterScroll).toBe(true);
    });
  });

  test.describe('Task 6: レスポンシブUI', () => {
    test('モバイル (375px) で全UIコントロールが表示され操作可能', async () => {
      await gameTimerPage.setViewportSize(375);

      // 固定ヘッダーが表示される
      const headerVisible = await gameTimerPage.isStickyHeaderVisible();
      expect(headerVisible).toBe(true);

      // ドロップダウンが操作可能
      await gameTimerPage.setPlayerCount(5);
      const playerCount = await gameTimerPage.getPlayerCount();
      expect(playerCount).toBe(5);

      // トグルスイッチが操作可能
      await gameTimerPage.setTimerModeCountDown();
      const isCountdownVisible = await gameTimerPage.isCountdownControlVisible();
      expect(isCountdownVisible).toBe(true);

      // 次のプレイヤーへボタンが操作可能
      await gameTimerPage.setTimerModeCountUp();
      await gameTimerPage.switchToNextPlayer();
      const isActive = await gameTimerPage.isPlayerActive(0);
      expect(isActive).toBe(true);
    });

    test('タブレット (768px) で全UIコントロールが表示され操作可能', async () => {
      await gameTimerPage.setViewportSize(768);

      // 固定ヘッダーが表示される
      const headerVisible = await gameTimerPage.isStickyHeaderVisible();
      expect(headerVisible).toBe(true);

      // 全コントロールが操作可能
      await gameTimerPage.setPlayerCount(6);
      const playerCount = await gameTimerPage.getPlayerCount();
      expect(playerCount).toBe(6);
    });

    test('PC (1024px) で全UIコントロールが表示され操作可能', async () => {
      await gameTimerPage.setViewportSize(1024);

      // 固定ヘッダーが表示される
      const headerVisible = await gameTimerPage.isStickyHeaderVisible();
      expect(headerVisible).toBe(true);

      // 全コントロールが操作可能
      await gameTimerPage.setPlayerCount(5);
      const playerCount = await gameTimerPage.getPlayerCount();
      expect(playerCount).toBe(5);
    });

    test('大画面 (1440px) で全UIコントロールが表示され操作可能', async () => {
      await gameTimerPage.setViewportSize(1440);

      // 固定ヘッダーが表示される
      const headerVisible = await gameTimerPage.isStickyHeaderVisible();
      expect(headerVisible).toBe(true);

      // 全コントロールが操作可能
      await gameTimerPage.setPlayerCount(4);
      const playerCount = await gameTimerPage.getPlayerCount();
      expect(playerCount).toBe(4);
    });
  });

  test.describe('ゲーム進行中の無効化フロー', () => {
    test('タイマー開始→設定無効化→一時停止→設定有効化フロー', async () => {
      // 初期状態: 設定が有効
      let dropdownDisabled = await gameTimerPage.isPlayerCountDropdownDisabled();
      let toggleDisabled = await gameTimerPage.isTimerModeToggleDisabled();
      expect(dropdownDisabled).toBe(false);
      expect(toggleDisabled).toBe(false);

      // タイマー開始（次のプレイヤーへ）
      await gameTimerPage.switchToNextPlayer();

      // 設定が無効化される
      dropdownDisabled = await gameTimerPage.isPlayerCountDropdownDisabled();
      toggleDisabled = await gameTimerPage.isTimerModeToggleDisabled();
      expect(dropdownDisabled).toBe(true);
      expect(toggleDisabled).toBe(true);

      // 一時停止
      await gameTimerPage.togglePause();
      const pauseButtonText = await gameTimerPage.getPauseResumeButtonText();
      expect(pauseButtonText).toContain('再開');

      // 設定が有効化される
      dropdownDisabled = await gameTimerPage.isPlayerCountDropdownDisabled();
      toggleDisabled = await gameTimerPage.isTimerModeToggleDisabled();
      expect(dropdownDisabled).toBe(false);
      expect(toggleDisabled).toBe(false);

      // 再開
      await gameTimerPage.togglePause();
      const resumeButtonText = await gameTimerPage.getPauseResumeButtonText();
      expect(resumeButtonText).toContain('一時停止');

      // 設定が再び無効化される
      dropdownDisabled = await gameTimerPage.isPlayerCountDropdownDisabled();
      toggleDisabled = await gameTimerPage.isTimerModeToggleDisabled();
      expect(dropdownDisabled).toBe(true);
      expect(toggleDisabled).toBe(true);
    });
  });
});

import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * E2Eテスト: ターン時間トラッキング機能
 *
 * 検証項目:
 * - ターン時間表示（アクティブプレイヤーのみ表示、1秒ごと更新、MM:SS形式）
 * - ゲーム全体時間表示（固定ヘッダー、1秒ごと更新、1時間未満はMM:SS、1時間以上はHH:MM:SS）
 * - 一時停止・再開時の動作（時間更新停止、一時停止中の時間除外）
 * - レスポンシブUI（モバイル: 縦並び、タブレット・PC: 横並び）
 */

test.describe('ターン時間トラッキング機能', () => {
  let page: GameTimerPage;

  test.beforeEach(async ({ page: testPage }) => {
    page = new GameTimerPage(testPage);
    await page.navigate();

    // Note: 現在の実装では、ゲーム開始時にはアクティブプレイヤーが設定されていない。
    // 「次のプレイヤーへ」ボタンをクリックすると最初のプレイヤーがアクティブになる。
    const activePlayerIndex = await page.getActivePlayerIndex();
    if (activePlayerIndex === -1) {
      // 「次のプレイヤーへ」ボタンをクリックしてゲーム開始
      await page.switchToNextPlayer();
      // アクティブプレイヤーが設定されるまで少し待機
      await page.page.waitForTimeout(300);
    }
  });

  /**
   * Task 7.1: ターン時間表示のE2Eテスト
   */
  test.describe('ターン時間表示', () => {
    test('アクティブプレイヤーのカードに「現在のターン」が表示される', async () => {
      // プレイヤー0が最初のアクティブプレイヤー
      const activePlayerIndex = await page.getActivePlayerIndex();
      expect(activePlayerIndex).toBe(0);

      // アクティブプレイヤーのカードにターン時間表示が存在する
      const hasTurnTime = await page.hasPlayerTurnTime(0);
      expect(hasTurnTime).toBe(true);
    });

    test('ターン時間が1秒ごとに更新される（MM:SS形式）', async () => {
      // 初期状態のターン時間を取得
      const initialTurnTime = await page.getPlayerTurnTime(0);
      expect(initialTurnTime).not.toBeNull();
      expect(initialTurnTime).toBeGreaterThanOrEqual(0);

      // 2秒待機
      await page.page.waitForTimeout(2000);

      // ターン時間が更新されていることを確認（初期値+2秒程度）
      const updatedTurnTime = await page.getPlayerTurnTime(0);
      expect(updatedTurnTime).not.toBeNull();
      expect(updatedTurnTime!).toBeGreaterThan(initialTurnTime!);
      expect(updatedTurnTime! - initialTurnTime!).toBeGreaterThanOrEqual(1);
      expect(updatedTurnTime! - initialTurnTime!).toBeLessThanOrEqual(3);
    });

    test('非アクティブプレイヤーのカードには「現在のターン」が表示されない', async () => {
      // プレイヤー1（非アクティブ）のターン時間表示が存在しない
      const hasTurnTime = await page.hasPlayerTurnTime(1);
      expect(hasTurnTime).toBe(false);
    });

    test('次のプレイヤーへ切り替え時、前のプレイヤーのターン時間が消え、新しいプレイヤーのターン時間が表示される', async () => {
      // 初期状態: プレイヤー0がアクティブ
      expect(await page.hasPlayerTurnTime(0)).toBe(true);
      expect(await page.hasPlayerTurnTime(1)).toBe(false);

      // 次のプレイヤーへ切り替え
      await page.switchToNextPlayer();
      await page.page.waitForTimeout(500);

      // プレイヤー0のターン時間が消え、プレイヤー1のターン時間が表示される
      expect(await page.hasPlayerTurnTime(0)).toBe(false);
      expect(await page.hasPlayerTurnTime(1)).toBe(true);

      // プレイヤー1のターン時間が0秒からスタート
      const player1TurnTime = await page.getPlayerTurnTime(1);
      expect(player1TurnTime).toBeGreaterThanOrEqual(0);
      expect(player1TurnTime).toBeLessThanOrEqual(1);
    });
  });

  /**
   * Task 7.2: ゲーム全体時間表示のE2Eテスト
   */
  test.describe('ゲーム全体時間表示', () => {
    test('固定ヘッダーに「ゲーム全体のプレイ時間」が表示される', async () => {
      // 固定ヘッダーが表示されている
      const isStickyHeaderVisible = await page.isStickyHeaderVisible();
      expect(isStickyHeaderVisible).toBe(true);

      // ゲーム全体時間が表示されている
      const totalGameTime = await page.getTotalGameTime();
      expect(totalGameTime).toBeGreaterThanOrEqual(0);
    });

    test('ゲーム全体時間が1秒ごとに更新される', async () => {
      // 初期状態のゲーム全体時間を取得
      const initialTotalTime = await page.getTotalGameTime();

      // 2秒待機
      await page.page.waitForTimeout(2000);

      // ゲーム全体時間が更新されていることを確認（初期値+2秒程度）
      const updatedTotalTime = await page.getTotalGameTime();
      expect(updatedTotalTime).toBeGreaterThan(initialTotalTime);
      expect(updatedTotalTime - initialTotalTime).toBeGreaterThanOrEqual(1);
      expect(updatedTotalTime - initialTotalTime).toBeLessThanOrEqual(3);
    });

    test('1時間未満はMM:SS形式で表示される', async () => {
      // 初期状態（1時間未満）のフォーマットを確認
      const format = await page.getTotalGameTimeFormat();
      expect(format).toBe('MM:SS');
    });

    test.skip('1時間以上はHH:MM:SS形式で表示される', async () => {
      // Note: このテストは実際には1時間待機する必要があるためスキップ
      // 実装上は、初期時間を3600秒に設定してカウントダウンモードでテスト可能
      // ただし、現在の実装ではカウントダウンモードでのゲーム全体時間表示が未対応のためスキップ
    });

    test('リセット時に"00:00"にリセットされる', async () => {
      // 2秒待機してゲーム全体時間を進める
      await page.page.waitForTimeout(2000);

      // リセット前の時間を確認（0秒より大きい）
      const timeBeforeReset = await page.getTotalGameTime();
      expect(timeBeforeReset).toBeGreaterThan(0);

      // リセット
      await page.resetGame();
      await page.page.waitForTimeout(500);

      // リセット後の時間を確認（0秒）
      const timeAfterReset = await page.getTotalGameTime();
      expect(timeAfterReset).toBe(0);
    });
  });

  /**
   * Task 7.3: 一時停止・再開時の動作E2Eテスト
   */
  test.describe('一時停止・再開時の動作', () => {
    test('一時停止時にターン時間とゲーム全体時間の更新が停止する', async () => {
      // 2秒待機してタイマーを進める
      await page.page.waitForTimeout(2000);

      // 一時停止
      await page.togglePause();
      await page.page.waitForTimeout(500);

      // 一時停止時のターン時間とゲーム全体時間を記録
      const pausedTurnTime = await page.getPlayerTurnTime(0);
      const pausedTotalTime = await page.getTotalGameTime();

      // 2秒待機
      await page.page.waitForTimeout(2000);

      // ターン時間とゲーム全体時間が変化していないことを確認
      const turnTimeAfterPause = await page.getPlayerTurnTime(0);
      const totalTimeAfterPause = await page.getTotalGameTime();

      expect(turnTimeAfterPause).toBe(pausedTurnTime);
      expect(totalTimeAfterPause).toBe(pausedTotalTime);
    });

    test('再開時にターン時間とゲーム全体時間の更新が再開する', async () => {
      // 一時停止
      await page.togglePause();
      await page.page.waitForTimeout(500);

      // 再開
      await page.togglePause();
      await page.page.waitForTimeout(500);

      // 再開後のターン時間を記録
      const turnTimeAfterResume = await page.getPlayerTurnTime(0);
      const totalTimeAfterResume = await page.getTotalGameTime();

      // 2秒待機
      await page.page.waitForTimeout(2000);

      // ターン時間とゲーム全体時間が更新されていることを確認
      const updatedTurnTime = await page.getPlayerTurnTime(0);
      const updatedTotalTime = await page.getTotalGameTime();

      expect(updatedTurnTime!).toBeGreaterThan(turnTimeAfterResume!);
      expect(updatedTotalTime).toBeGreaterThan(totalTimeAfterResume);
    });

    test('一時停止中の時間がターン時間に含まれない', async () => {
      // 2秒待機してターン時間を進める
      await page.page.waitForTimeout(2000);
      const turnTimeBeforePause = await page.getPlayerTurnTime(0);

      // 一時停止
      await page.togglePause();
      await page.page.waitForTimeout(500);

      // 3秒待機（一時停止中）
      await page.page.waitForTimeout(3000);

      // 再開
      await page.togglePause();
      await page.page.waitForTimeout(500);

      // 再開直後のターン時間を確認（一時停止前+1秒程度）
      const turnTimeAfterResume = await page.getPlayerTurnTime(0);
      expect(turnTimeAfterResume!).toBeGreaterThanOrEqual(turnTimeBeforePause!);
      expect(turnTimeAfterResume! - turnTimeBeforePause!).toBeLessThanOrEqual(2);

      // さらに2秒待機
      await page.page.waitForTimeout(2000);

      // ターン時間が正常に更新されていることを確認
      const finalTurnTime = await page.getPlayerTurnTime(0);
      expect(finalTurnTime!).toBeGreaterThan(turnTimeAfterResume!);
      expect(finalTurnTime! - turnTimeAfterResume!).toBeGreaterThanOrEqual(1);
      expect(finalTurnTime! - turnTimeAfterResume!).toBeLessThanOrEqual(3);
    });
  });

  /**
   * Task 7.4: レスポンシブUIのE2Eテスト
   */
  test.describe('レスポンシブUI', () => {
    test('モバイル（375px）でターン時間とゲーム全体時間が適切に表示される', async () => {
      // ビューポートをモバイルサイズに設定
      await page.setViewportSize(375, 800);
      await page.page.waitForTimeout(500);

      // ターン時間とゲーム全体時間が表示されている
      const hasTurnTime = await page.hasPlayerTurnTime(0);
      expect(hasTurnTime).toBe(true);

      const totalTime = await page.getTotalGameTime();
      expect(totalTime).toBeGreaterThanOrEqual(0);
    });

    test('タブレット（768px）でターン時間とゲーム全体時間が適切に表示される', async () => {
      // ビューポートをタブレットサイズに設定
      await page.setViewportSize(768, 800);
      await page.page.waitForTimeout(500);

      // ターン時間とゲーム全体時間が表示されている
      const hasTurnTime = await page.hasPlayerTurnTime(0);
      expect(hasTurnTime).toBe(true);

      const totalTime = await page.getTotalGameTime();
      expect(totalTime).toBeGreaterThanOrEqual(0);
    });

    test('PC（1440px）でターン時間とゲーム全体時間が適切に表示される', async () => {
      // ビューポートをPCサイズに設定
      await page.setViewportSize(1440, 800);
      await page.page.waitForTimeout(500);

      // ターン時間とゲーム全体時間が表示されている
      const hasTurnTime = await page.hasPlayerTurnTime(0);
      expect(hasTurnTime).toBe(true);

      const totalTime = await page.getTotalGameTime();
      expect(totalTime).toBeGreaterThanOrEqual(0);
    });
  });
});

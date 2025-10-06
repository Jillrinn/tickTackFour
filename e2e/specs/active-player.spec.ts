import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * アクティブプレイヤー操作機能のE2Eテスト
 * Requirements: 4.1〜4.7
 */
test.describe('アクティブプレイヤー操作機能', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    gameTimerPage = new GameTimerPage(page);
    await gameTimerPage.navigate();
  });

  test('プレイヤーをアクティブに設定できる', async () => {
    // Requirements: 4.1
    // プレイヤー0をアクティブに設定
    await gameTimerPage.setPlayerActive(0);

    // activeクラスが付与されていることを確認
    const isActive = await gameTimerPage.isPlayerActive(0);
    expect(isActive).toBe(true);
  });

  test('次のプレイヤーへ順番に切り替えられる', async () => {
    // Requirements: 4.2
    // プレイヤー0をアクティブに設定
    await gameTimerPage.setPlayerActive(0);
    expect(await gameTimerPage.isPlayerActive(0)).toBe(true);

    // 次のプレイヤーへ切り替え
    await gameTimerPage.switchToNextPlayer();
    expect(await gameTimerPage.isPlayerActive(0)).toBe(false);
    expect(await gameTimerPage.isPlayerActive(1)).toBe(true);

    // さらに次へ
    await gameTimerPage.switchToNextPlayer();
    expect(await gameTimerPage.isPlayerActive(1)).toBe(false);
    expect(await gameTimerPage.isPlayerActive(2)).toBe(true);
  });

  test('最後のプレイヤーから最初のプレイヤーへ循環する', async () => {
    // Requirements: 4.2
    // 最後のプレイヤー(3番目)をアクティブに設定
    await gameTimerPage.setPlayerActive(3);
    expect(await gameTimerPage.isPlayerActive(3)).toBe(true);

    // 次のプレイヤーへ切り替え → 最初のプレイヤー(0番目)へ
    await gameTimerPage.switchToNextPlayer();
    expect(await gameTimerPage.isPlayerActive(3)).toBe(false);
    expect(await gameTimerPage.isPlayerActive(0)).toBe(true);
  });

  test('+10秒ボタンで経過時間が10秒増加する', async () => {
    // Requirements: 4.3
    // プレイヤー0をアクティブにして時間を経過させる
    await gameTimerPage.setPlayerActive(0);
    await gameTimerPage.page.waitForTimeout(2000); // 2秒待機

    const timeBefore = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeBefore).toBeGreaterThan(0);

    // +10秒ボタンをクリック
    await gameTimerPage.addTenSeconds(0);

    // 経過時間が約10秒増加していることを確認
    const timeAfter = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeAfter).toBeGreaterThanOrEqual(timeBefore + 10);
    expect(timeAfter).toBeLessThanOrEqual(timeBefore + 12); // 誤差2秒許容
  });

  test('次のプレイヤーへ切り替えると元のアクティブプレイヤーが解除される', async () => {
    // Requirements: 4.4
    // プレイヤー0をアクティブに設定
    await gameTimerPage.setPlayerActive(0);
    expect(await gameTimerPage.isPlayerActive(0)).toBe(true);

    // 次のプレイヤーボタンで切り替えると、元のプレイヤー(0)が非アクティブになり、プレイヤー(1)がアクティブになる
    await gameTimerPage.switchToNextPlayer();
    expect(await gameTimerPage.isPlayerActive(0)).toBe(false);
    expect(await gameTimerPage.isPlayerActive(1)).toBe(true);
  });

  test('アクティブプレイヤーがいる時、他のプレイヤーのボタンが無効化される', async () => {
    // Requirements: 4.5, 4.6
    // プレイヤー0をアクティブに設定
    await gameTimerPage.setPlayerActive(0);
    expect(await gameTimerPage.isPlayerActive(0)).toBe(true);

    // プレイヤー0のボタンは有効
    const isPlayer0AddTimeDisabled = await gameTimerPage.isAddTimeButtonDisabled(0);
    expect(isPlayer0AddTimeDisabled).toBe(false);

    const isPlayer0SetActiveDisabled = await gameTimerPage.isSetActiveButtonDisabled(0);
    expect(isPlayer0SetActiveDisabled).toBe(false);

    // 他のプレイヤー(1)のボタンは無効化されている
    const isPlayer1AddTimeDisabled = await gameTimerPage.isAddTimeButtonDisabled(1);
    expect(isPlayer1AddTimeDisabled).toBe(true);

    const isPlayer1SetActiveDisabled = await gameTimerPage.isSetActiveButtonDisabled(1);
    expect(isPlayer1SetActiveDisabled).toBe(true);
  });

  test('タイムアウト時にtimeoutクラスが付与される', async () => {
    // Requirements: 4.7
    // カウントダウンモードで3秒に設定
    await gameTimerPage.setTimerModeCountDown(3);

    // プレイヤー0をアクティブに設定
    await gameTimerPage.setPlayerActive(0);

    // タイムアウトまで待機
    await gameTimerPage.page.waitForTimeout(4000);

    // タイムアウト状態を確認（timeoutクラスが付与されている）
    const isTimedOut = await gameTimerPage.isPlayerTimedOut(0);
    expect(isTimedOut).toBe(true);

    // 経過時間が0秒になっていることを確認
    const elapsedTime = await gameTimerPage.getPlayerElapsedTime(0);
    expect(elapsedTime).toBe(0);
  });
});

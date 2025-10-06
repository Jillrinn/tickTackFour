import { test, expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';
import { assertPlayerCount } from '../helpers/assertions';

/**
 * プレイヤー管理機能のE2Eテスト
 * Requirements: 2.1〜2.7
 */
test.describe('プレイヤー管理機能', () => {
  let gameTimerPage: GameTimerPage;

  test.beforeEach(async ({ page }) => {
    gameTimerPage = new GameTimerPage(page);
    await gameTimerPage.navigate();
  });

  test('デフォルトで4人のプレイヤーが表示される', async () => {
    // Requirements: 2.1
    await assertPlayerCount(gameTimerPage, 4);
  });

  test('プレイヤー数を5人に変更できる', async () => {
    // Requirements: 2.2
    await gameTimerPage.setPlayerCount(5);
    await assertPlayerCount(gameTimerPage, 5);
  });

  test('プレイヤー数を6人に変更できる', async () => {
    // Requirements: 2.3
    await gameTimerPage.setPlayerCount(6);
    await assertPlayerCount(gameTimerPage, 6);
  });

  test('プレイヤー数を4人に戻せる', async () => {
    // Requirements: 2.4
    await gameTimerPage.setPlayerCount(5);
    await gameTimerPage.setPlayerCount(4);
    await assertPlayerCount(gameTimerPage, 4);
  });

  test('各プレイヤーカードに名前、ID、経過時間が表示される', async () => {
    // Requirements: 2.5
    const playerName = await gameTimerPage.getPlayerName(0);
    expect(playerName).toBeTruthy();

    const playerCard = gameTimerPage.getPlayerCardByIndex(0);
    const playerIdText = await playerCard.locator('.player-id').textContent();
    expect(playerIdText).toContain('ID:');

    const playerTimeText = await playerCard.locator('.player-time').textContent();
    expect(playerTimeText).toContain('経過時間:');
  });

  test('プレイヤー数を増やすと新しいプレイヤーが追加される', async () => {
    // Requirements: 2.6
    // プレイヤー1をアクティブにして時間を経過させる
    await gameTimerPage.setPlayerActive(0);
    await gameTimerPage.page.waitForTimeout(2000); // 2秒待機

    const timeBefore = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeBefore).toBeGreaterThan(0);

    // プレイヤー数を増やす
    await gameTimerPage.setPlayerCount(5);

    // 既存プレイヤーの経過時間は保持される
    const timeAfter = await gameTimerPage.getPlayerElapsedTime(0);
    expect(timeAfter).toBeGreaterThan(0);

    // 新しく追加されたプレイヤーの経過時間は0秒
    const newPlayerTime = await gameTimerPage.getPlayerElapsedTime(4);
    expect(newPlayerTime).toBe(0);
  });

  test('プレイヤー数を減らすと末尾のプレイヤーが削除される', async () => {
    // Requirements: 2.7
    // 5人に設定
    await gameTimerPage.setPlayerCount(5);
    await assertPlayerCount(gameTimerPage, 5);

    // 4人に減らす
    await gameTimerPage.setPlayerCount(4);
    await assertPlayerCount(gameTimerPage, 4);
  });

  test('プレイヤー名を変更できる', async () => {
    // プレイヤー名入力機能のテスト
    const newName = 'Alice';
    await gameTimerPage.setPlayerName(0, newName);

    const playerName = await gameTimerPage.getPlayerName(0);
    expect(playerName).toBe(newName);
  });
});

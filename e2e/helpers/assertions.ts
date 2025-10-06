import { expect } from '@playwright/test';
import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * プレイヤーカード数をアサート
 */
export async function assertPlayerCount(
  page: GameTimerPage,
  expectedCount: number
): Promise<void> {
  const actualCount = await page.getPlayerCount();
  expect(actualCount).toBe(expectedCount);
}

/**
 * 経過時間がレンジ内であることをアサート（タイマーテスト用）
 *
 * @param actualSeconds - 実際の経過時間
 * @param expectedSeconds - 期待される経過時間
 * @param tolerance - 許容誤差（秒）
 */
export function assertTimeInRange(
  actualSeconds: number,
  expectedSeconds: number,
  tolerance: number = 1
): void {
  expect(actualSeconds).toBeGreaterThanOrEqual(expectedSeconds - tolerance);
  expect(actualSeconds).toBeLessThanOrEqual(expectedSeconds + tolerance);
}

/**
 * プレイヤーがアクティブであることをアサート
 */
export async function assertPlayerActive(
  page: GameTimerPage,
  playerIndex: number
): Promise<void> {
  const isActive = await page.isPlayerActive(playerIndex);
  expect(isActive).toBe(true);
}

/**
 * プレイヤーがタイムアウトしていることをアサート
 */
export async function assertPlayerTimedOut(
  page: GameTimerPage,
  playerIndex: number
): Promise<void> {
  const isTimedOut = await page.isPlayerTimedOut(playerIndex);
  expect(isTimedOut).toBe(true);
}

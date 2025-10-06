import { GameTimerPage } from '../pages/GameTimerPage';

/**
 * 指定秒数待機し、タイマー進行を確認
 *
 * @param page - GameTimerPage
 * @param playerIndex - プレイヤーインデックス
 * @param seconds - 待機秒数
 * @returns 待機前後の経過時間の差
 */
export async function waitForTimerProgress(
  page: GameTimerPage,
  playerIndex: number,
  seconds: number
): Promise<number> {
  const timeBefore = await page.getPlayerElapsedTime(playerIndex);
  await page.page.waitForTimeout(seconds * 1000);
  const timeAfter = await page.getPlayerElapsedTime(playerIndex);
  return timeAfter - timeBefore;
}

/**
 * プレイヤーカード数の変化を待機
 *
 * @param page - GameTimerPage
 * @param expectedCount - 期待されるプレイヤー数
 * @param timeout - タイムアウト（ミリ秒）
 */
export async function waitForPlayerCountChange(
  page: GameTimerPage,
  expectedCount: number,
  timeout: number = 5000
): Promise<void> {
  await page.page.waitForFunction(
    (count) => {
      const cards = document.querySelectorAll('.player-card');
      return cards.length === count;
    },
    expectedCount,
    { timeout }
  );
}

/**
 * アクティブプレイヤーの変化を待機
 *
 * @param page - GameTimerPage
 * @param expectedPlayerIndex - 期待されるアクティブプレイヤーインデックス
 * @param timeout - タイムアウト（ミリ秒）
 */
export async function waitForActivePlayerChange(
  page: GameTimerPage,
  expectedPlayerIndex: number,
  timeout: number = 5000
): Promise<void> {
  await page.page.waitForFunction(
    (index) => {
      const cards = Array.from(document.querySelectorAll('.player-card'));
      const activeCard = cards[index];
      return activeCard?.classList.contains('active');
    },
    expectedPlayerIndex,
    { timeout }
  );
}

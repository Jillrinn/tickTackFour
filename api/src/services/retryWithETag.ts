import { GameState } from '../models/gameState';
import { GameStateResult } from './gameStateService';
import { hasStatusCodeValue } from '../utils/errorUtils';

/**
 * 指定されたミリ秒数待機する
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ETag楽観的ロック再試行メカニズム
 *
 * @param state 更新するゲーム状態
 * @param etag 現在のETag
 * @param updateFn 更新関数（state, etagを受け取りGameStateResultを返す）
 * @param getLatestFn 最新状態取得関数（GameStateResultを返す）
 * @param maxRetries 最大再試行回数（デフォルト: 3）
 * @returns 更新結果
 * @throws 3回再試行後も失敗した場合、または412以外のエラーの場合
 *
 * 再試行ロジック:
 * 1. updateFnで更新を試行
 * 2. 412 Conflictエラーが発生した場合:
 *    - getLatestFnで最新状態とETagを取得
 *    - 指数バックオフで待機（100ms, 200ms, 400ms）
 *    - 最新ETagで再試行
 * 3. 最大3回まで再試行
 * 4. 3回失敗後はConflictエラーをスロー
 * 5. 412以外のエラーは即座にスロー
 */
export async function retryUpdateWithETag(
  state: GameState,
  etag: string,
  updateFn: (state: GameState, etag: string) => Promise<GameStateResult>,
  getLatestFn: () => Promise<GameStateResult>,
  maxRetries: number = 3
): Promise<GameStateResult> {
  let currentETag = etag;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 更新を試行
      const result = await updateFn(state, currentETag);
      return result;
    } catch (error: unknown) {
      // 412 Conflict以外のエラーは即座にスロー
      if (!hasStatusCodeValue(error, 412)) {
        throw error;
      }

      // 最後の試行の場合はエラーをスロー
      if (attempt === maxRetries - 1) {
        throw new Error('Update failed after 3 retries due to conflicts');
      }

      // 指数バックオフで待機（100ms, 200ms, 400ms）
      const backoffMs = 100 * Math.pow(2, attempt);
      await sleep(backoffMs);

      // 最新状態を取得
      const latestResult = await getLatestFn();
      currentETag = latestResult.etag;
    }
  }

  // この行には到達しないはず（ループ内でreturnまたはthrowするため）
  throw new Error('Update failed after 3 retries due to conflicts');
}

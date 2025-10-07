import { GameState } from '../models/gameState';

/**
 * プレイヤーの経過時間を計算
 *
 * @param state ゲーム状態
 * @param playerIndex プレイヤーインデックス
 * @returns 経過時間（秒）
 *
 * 計算ロジック:
 * 1. 一時停止中の場合 → 累積時間のみ返す
 * 2. 非アクティブプレイヤーの場合 → 累積時間のみ返す
 * 3. アクティブプレイヤー AND 一時停止していない → 累積時間 + (現在時刻 - ターン開始時刻)
 */
export function calculateElapsedTime(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  const accumulatedSeconds = player.accumulatedSeconds;

  // 一時停止中の場合、累積時間のみ返す
  if (state.isPaused) {
    return accumulatedSeconds;
  }

  // 非アクティブプレイヤーの場合、累積時間のみ返す
  if (state.activePlayerIndex !== playerIndex) {
    return accumulatedSeconds;
  }

  // turnStartedAtが未設定の場合、累積時間のみ返す
  if (!state.turnStartedAt) {
    return accumulatedSeconds;
  }

  // アクティブプレイヤーの経過時間を計算
  const turnStartedAt = new Date(state.turnStartedAt);
  const now = new Date();
  const elapsedMs = now.getTime() - turnStartedAt.getTime();
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return accumulatedSeconds + elapsedSeconds;
}

/**
 * 全プレイヤーの経過時間を計算
 *
 * @param state ゲーム状態
 * @returns プレイヤーごとの経過時間配列
 */
export function calculateAllPlayerTimes(state: GameState): number[] {
  return state.players.map((_, index) => calculateElapsedTime(state, index));
}

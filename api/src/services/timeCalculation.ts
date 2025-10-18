import { GameState, CalculatedTime } from '../models/gameState';

/**
 * プレイヤーの経過時間を計算
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
 * 全プレイヤーの経過時間を計算（CalculatedTime配列を返す）
 */
export function calculateAllPlayerTimes(state: GameState): CalculatedTime[] {
  return state.players.map((player, index) => ({
    playerId: player.id,
    elapsedSeconds: calculateElapsedTime(state, index),
    isActive: state.activePlayerIndex === index && !state.isPaused
  }));
}

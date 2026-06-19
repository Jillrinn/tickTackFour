import { GameState } from '../models/gameState';
import { GameStateWithTime } from '../models/apiTypes';
import { calculateAllPlayerTimes } from './timeCalculation';
import { getCatanPhase } from './turnSequence';

/**
 * 保存形式の GameState を、計算済み経過時間を含む API レスポンス形式
 * （GameStateWithTime）に変換する。
 *
 * GET /api/game と各更新エンドポイントでレスポンス形式を統一するための共通シリアライザ。
 * フロントエンドの updateFromServer は players[].elapsedSeconds を参照するため、
 * 生の accumulatedSeconds ではなく計算済みの elapsedSeconds を返す必要がある。
 *
 * @param state - 保存形式のゲーム状態
 * @param etag - レスポンスに含める ETag
 * @returns 計算済み経過時間を含む GameStateWithTime
 */
export function toGameStateWithTime(state: GameState, etag: string): GameStateWithTime {
  // calculateAllPlayerTimes は state.players と同じ順序で結果を返すため index で対応付け可能
  const calculatedTimes = calculateAllPlayerTimes(state);
  const players = state.players.map((player, index) => ({
    name: player.name,
    elapsedSeconds: calculatedTimes[index]?.elapsedSeconds || 0
  }));

  const phase = state.gameMode === 'catan'
    ? getCatanPhase(state.turnNumber, state.playerCount)
    : 0;

  return {
    players,
    activePlayerIndex: state.activePlayerIndex,
    timerMode: state.timerMode,
    countdownSeconds: state.countdownSeconds,
    isPaused: state.isPaused,
    etag,
    turnStartedAt: state.turnStartedAt || null,
    pausedAt: state.pausedAt || null,
    gameMode: state.gameMode,
    phase
  };
}

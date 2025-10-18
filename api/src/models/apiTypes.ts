import { GameState, CalculatedTime } from './gameState';

/**
 * API レスポンス型: ゲーム状態（計算済み経過時間を含む）
 */
export interface GameStateWithTime extends GameState {
  calculatedTimes: CalculatedTime[];
  etag: string;
}

/**
 * API エラーレスポンス型
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
}

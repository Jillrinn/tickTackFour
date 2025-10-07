import { GameState } from './gameState';

/**
 * API共通エラーレスポンス
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * ゲーム状態取得レスポンス（計算済み経過時間を含む）
 */
export interface GameStateWithTime extends GameState {
  calculatedTimes: number[]; // 各プレイヤーの計算済み経過時間（秒）
  etag: string;               // 楽観的ロック用ETag
}

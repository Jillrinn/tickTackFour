/**
 * API レスポンス型: ゲーム状態（計算済み経過時間を含む）
 *
 * 設計書準拠の形式:
 * - players配列に計算済みelapsedSecondsを含める
 * - turnStartedAt, pausedAt等の内部状態は含めない
 */
export interface GameStateWithTime {
  players: Array<{ name: string; elapsedSeconds: number }>;
  activePlayerIndex: number;
  timerMode: string;
  countdownSeconds: number;
  isPaused: boolean;
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

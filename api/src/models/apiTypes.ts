/**
 * API レスポンス型: ゲーム状態（計算済み経過時間を含む）
 *
 * 設計書準拠の形式:
 * - players配列に計算済みelapsedSecondsを含める
 * - turnStartedAt, pausedAtを含める（フロントエンドでターン時間計算に使用）
 */
export interface GameStateWithTime {
  players: Array<{ name: string; elapsedSeconds: number }>;
  activePlayerIndex: number;
  timerMode: string;
  countdownSeconds: number;
  isPaused: boolean;
  etag: string;
  turnStartedAt: string | null; // ISO8601タイムスタンプ（アクティブプレイヤーのターン開始時刻）
  pausedAt: string | null;      // ISO8601タイムスタンプ（一時停止開始時刻）
}

/**
 * API エラーレスポンス型
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
}

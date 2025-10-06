/**
 * テスト用ゲーム状態フィクスチャ
 */

export interface GameStateData {
  playerCount: number;
  timerMode: 'count-up' | 'count-down';
  isPaused: boolean;
  activePlayerIndex: number | null;
  countdownSeconds?: number;
}

/**
 * デフォルトゲーム状態（4人、カウントアップ、未開始）
 */
export function getDefaultGameState(): GameStateData {
  return {
    playerCount: 4,
    timerMode: 'count-up',
    isPaused: false,
    activePlayerIndex: null,
  };
}

/**
 * カウントダウンモードの状態（指定秒数設定）
 */
export function getCountdownModeGameState(seconds: number = 600): GameStateData {
  return {
    playerCount: 4,
    timerMode: 'count-down',
    isPaused: false,
    activePlayerIndex: null,
    countdownSeconds: seconds,
  };
}

/**
 * アクティブプレイヤー設定済み状態
 */
export function getGameStateWithActivePlayer(
  playerIndex: number = 0
): GameStateData {
  return {
    playerCount: 4,
    timerMode: 'count-up',
    isPaused: false,
    activePlayerIndex: playerIndex,
  };
}

/**
 * 5人プレイヤー状態
 */
export function getFivePlayerGameState(): GameStateData {
  return {
    playerCount: 5,
    timerMode: 'count-up',
    isPaused: false,
    activePlayerIndex: null,
  };
}

/**
 * 6人プレイヤー状態
 */
export function getSixPlayerGameState(): GameStateData {
  return {
    playerCount: 6,
    timerMode: 'count-up',
    isPaused: false,
    activePlayerIndex: null,
  };
}

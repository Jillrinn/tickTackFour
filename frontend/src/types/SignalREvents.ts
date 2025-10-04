import type { Player } from './GameState';

/**
 * SignalRハブメソッドスキーマ（サーバー → クライアント）
 */
export interface GameHubClient {
  TurnSwitched(data: TurnSwitchedEvent): void;
  TimerUpdated(data: TimerUpdatedEvent): void;
  GameReset(data: GameResetEvent): void;
  PlayersUpdated(data: PlayersUpdatedEvent): void;
}

/**
 * ターン切り替えイベント
 */
export interface TurnSwitchedEvent {
  activePlayerId: string;
  previousPlayerId: string;
  timestamp: string; // ISO 8601
}

/**
 * タイマー更新イベント
 */
export interface TimerUpdatedEvent {
  playerId: string;
  elapsedTimeSeconds: number;
  timestamp: string; // ISO 8601
}

/**
 * ゲームリセットイベント
 */
export interface GameResetEvent {
  players: Player[];
  timestamp: string; // ISO 8601
}

/**
 * プレイヤー更新イベント
 */
export interface PlayersUpdatedEvent {
  players: Player[];
  timestamp: string; // ISO 8601
}

/**
 * SignalRハブメソッド名定数
 */
export const SignalRHubMethods = {
  TURN_SWITCHED: 'TurnSwitched',
  TIMER_UPDATED: 'TimerUpdated',
  GAME_RESET: 'GameReset',
  PLAYERS_UPDATED: 'PlayersUpdated'
} as const;

/**
 * SignalR接続状態
 */
export const SignalRConnectionState = {
  Disconnected: 'Disconnected',
  Connecting: 'Connecting',
  Connected: 'Connected',
  Reconnecting: 'Reconnecting'
} as const;

export type SignalRConnectionState = typeof SignalRConnectionState[keyof typeof SignalRConnectionState];

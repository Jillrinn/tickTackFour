import { Player } from './GameState';

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

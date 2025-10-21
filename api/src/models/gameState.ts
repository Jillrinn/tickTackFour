/**
 * ゲーム状態のプレイヤー情報
 */
export interface Player {
  id: number;
  name: string;
  accumulatedSeconds: number; // 累積経過時間（秒）
}

/**
 * ゲーム状態（アプリケーションモデル）
 */
export interface GameState {
  playerCount: number; // プレイヤー数（4-6）
  players: Player[];
  activePlayerIndex: number;
  timerMode: 'countup' | 'countdown';
  countdownSeconds: number;
  isPaused: boolean;
  turnStartedAt?: string; // ISO8601タイムスタンプ
  pausedAt?: string; // ISO8601タイムスタンプ
}

/**
 * Cosmos DB Table APIエンティティ（物理モデル）
 */
export interface GameStateEntity {
  partitionKey: string; // 固定値: "game"
  rowKey: string; // 固定値: "default"
  etag?: string; // 楽観的ロック用（Cosmos DB自動生成）
  timestamp?: Date; // 最終更新日時（Cosmos DB自動生成）
  playerCount: number;
  players: string; // Player[]をJSON文字列化
  activePlayerIndex: number;
  timerMode: string;
  countdownSeconds: number;
  isPaused: boolean;
  turnStartedAt?: string;
  pausedAt?: string;
}

/**
 * 計算済み経過時間（バックエンドで計算）
 */
export interface CalculatedTime {
  playerId: number;
  elapsedSeconds: number;
  isActive: boolean;
}

/**
 * デフォルトゲーム状態を生成
 */
export function createDefaultGameState(): GameState {
  return {
    playerCount: 4,
    players: [
      { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
      { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
      { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
      { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
    ],
    activePlayerIndex: 0,
    timerMode: 'countup',
    countdownSeconds: 60,
    isPaused: false,
    turnStartedAt: new Date().toISOString(),
    pausedAt: undefined
  };
}

/**
 * GameStateをGameStateEntityに変換
 */
export function toEntity(state: GameState): Omit<GameStateEntity, 'etag' | 'timestamp'> {
  return {
    partitionKey: 'game',
    rowKey: 'default',
    playerCount: state.playerCount,
    players: JSON.stringify(state.players),
    activePlayerIndex: state.activePlayerIndex,
    timerMode: state.timerMode,
    countdownSeconds: state.countdownSeconds,
    isPaused: state.isPaused,
    turnStartedAt: state.turnStartedAt,
    pausedAt: state.pausedAt
  };
}

/**
 * GameStateEntityをGameStateに変換
 */
export function fromEntity(entity: GameStateEntity): GameState {
  return {
    playerCount: entity.playerCount,
    players: JSON.parse(entity.players),
    activePlayerIndex: entity.activePlayerIndex,
    timerMode: entity.timerMode as 'countup' | 'countdown',
    countdownSeconds: entity.countdownSeconds,
    isPaused: entity.isPaused,
    turnStartedAt: entity.turnStartedAt,
    pausedAt: entity.pausedAt
  };
}

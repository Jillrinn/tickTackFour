/**
 * ゲーム状態のプレイヤー情報
 * @typedef {Object} Player
 * @property {number} id
 * @property {string} name
 * @property {number} accumulatedSeconds - 累積経過時間（秒）
 */

/**
 * ゲーム状態（アプリケーションモデル）
 * @typedef {Object} GameState
 * @property {number} playerCount - プレイヤー数（4-6）
 * @property {Player[]} players - プレイヤー配列
 * @property {number} activePlayerIndex - アクティブプレイヤーインデックス
 * @property {'countup'|'countdown'} timerMode
 * @property {number} countdownSeconds - カウントダウン秒数
 * @property {boolean} isPaused - 一時停止状態
 * @property {string} [turnStartedAt] - ISO8601タイムスタンプ
 * @property {string} [pausedAt] - ISO8601タイムスタンプ
 */

/**
 * Cosmos DB Table APIエンティティ（物理モデル）
 * @typedef {Object} GameStateEntity
 * @property {string} partitionKey - 固定値: "game"
 * @property {string} rowKey - 固定値: "default"
 * @property {string} [etag] - 楽観的ロック用（Cosmos DB自動生成）
 * @property {Date} [timestamp] - 最終更新日時（Cosmos DB自動生成）
 * @property {number} playerCount
 * @property {string} players - Player[]をJSON文字列化
 * @property {number} activePlayerIndex
 * @property {string} timerMode
 * @property {number} countdownSeconds
 * @property {boolean} isPaused
 * @property {string} [turnStartedAt]
 * @property {string} [pausedAt]
 */

/**
 * デフォルトゲーム状態を生成
 * @returns {GameState}
 */
function createDefaultGameState() {
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
    turnStartedAt: new Date().toISOString()
  };
}

/**
 * GameStateをGameStateEntityに変換
 * @param {GameState} state
 * @returns {Omit<GameStateEntity, 'etag' | 'timestamp'>}
 */
function toEntity(state) {
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
 * @param {GameStateEntity} entity
 * @returns {GameState}
 */
function fromEntity(entity) {
  return {
    playerCount: entity.playerCount,
    players: JSON.parse(entity.players),
    activePlayerIndex: entity.activePlayerIndex,
    timerMode: entity.timerMode,
    countdownSeconds: entity.countdownSeconds,
    isPaused: entity.isPaused,
    turnStartedAt: entity.turnStartedAt,
    pausedAt: entity.pausedAt
  };
}

module.exports = {
  createDefaultGameState,
  toEntity,
  fromEntity
};

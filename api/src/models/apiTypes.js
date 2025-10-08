/**
 * API共通エラーレスポンス
 * @typedef {Object} ApiErrorResponse
 * @property {string} error
 * @property {string} message
 * @property {*} [details]
 */

/**
 * ゲーム状態取得レスポンス（計算済み経過時間を含む）
 * @typedef {Object} GameStateWithTime
 * @property {number} playerCount
 * @property {Array} players
 * @property {number} activePlayerIndex
 * @property {string} timerMode
 * @property {number} countdownSeconds
 * @property {boolean} isPaused
 * @property {string} [turnStartedAt]
 * @property {string} [pausedAt]
 * @property {number[]} calculatedTimes - 各プレイヤーの計算済み経過時間（秒）
 * @property {string} etag - 楽観的ロック用ETag
 */

module.exports = {};

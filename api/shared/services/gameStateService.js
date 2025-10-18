const { RestError } = require('@azure/data-tables');
const { getTableClient } = require('./cosmosClient');
const {
  createDefaultGameState,
  toEntity,
  fromEntity
} = require('../models/gameState');

/**
 * ゲーム状態取得結果
 * @typedef {Object} GameStateResult
 * @property {Object} state
 * @property {string} etag
 */

/**
 * ゲーム状態を取得（存在しない場合はデフォルト状態を作成）
 * @returns {Promise<GameStateResult>}
 */
async function getGameState() {
  const client = getTableClient();

  try {
    // 既存のゲーム状態を取得
    const entity = await client.getEntity('game', 'default');

    return {
      state: fromEntity(entity),
      etag: entity.etag || ''
    };
  } catch (error) {
    // 404エラーの場合は新規作成
    if (error instanceof RestError && error.statusCode === 404) {
      const result = await createGameState();
      return result;
    }

    // その他のエラーは再スロー
    throw error;
  }
}

/**
 * デフォルトゲーム状態を作成
 * @returns {Promise<GameStateResult>}
 */
async function createGameState() {
  const client = getTableClient();
  const defaultState = createDefaultGameState();
  const entity = toEntity(defaultState);

  const response = await client.createEntity(entity);

  return {
    state: defaultState,
    etag: response.etag || ''
  };
}

/**
 * ゲーム状態を更新（ETag楽観的ロック）
 * @param {Object} state
 * @param {string} etag
 * @returns {Promise<GameStateResult>}
 */
async function updateGameState(state, etag) {
  const client = getTableClient();
  const entity = toEntity(state);

  const response = await client.updateEntity(entity, 'Replace', { etag });

  return {
    state,
    etag: response.etag || ''
  };
}

module.exports = {
  getGameState,
  createGameState,
  updateGameState
};

const { TableClient } = require('@azure/data-tables');

/**
 * Cosmos DB設定の検証結果
 * @typedef {Object} CosmosDBConfigValidation
 * @property {boolean} isValid
 * @property {string} [connectionString]
 * @property {string} [error]
 */

/**
 * Cosmos DB接続文字列の検証
 *
 * 環境変数CosmosDBConnectionStringの存在と有効性を確認します。
 *
 * @returns {CosmosDBConfigValidation} 検証結果
 */
function validateCosmosDBConfig() {
  const connectionString = process.env.CosmosDBConnectionString;

  if (!connectionString || connectionString.trim() === '') {
    return {
      isValid: false,
      error: 'CosmosDBConnectionString environment variable is not set'
    };
  }

  return {
    isValid: true,
    connectionString
  };
}

/**
 * Cosmos DB Table APIクライアントの取得
 *
 * GameStateテーブルへのTableClientインスタンスを返します。
 * 接続文字列が未設定の場合はエラーをスローします。
 *
 * @returns {TableClient} GameStateテーブルのTableClientインスタンス
 * @throws {Error} 接続文字列が未設定の場合
 */
function getTableClient() {
  const validation = validateCosmosDBConfig();

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // GameStateテーブルのTableClientを作成
  const client = TableClient.fromConnectionString(
    validation.connectionString,
    'GameState'
  );

  return client;
}

module.exports = {
  validateCosmosDBConfig,
  getTableClient
};

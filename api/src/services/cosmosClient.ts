import { TableClient } from '@azure/data-tables';

/**
 * Cosmos DB設定の検証結果
 */
export interface CosmosDBConfigValidation {
  isValid: boolean;
  connectionString?: string;
  error?: string;
}

/**
 * Cosmos DB接続文字列の検証
 *
 * 環境変数CosmosDBConnectionStringの存在と有効性を確認します。
 *
 * @returns {CosmosDBConfigValidation} 検証結果
 */
export function validateCosmosDBConfig(): CosmosDBConfigValidation {
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
export function getTableClient(): TableClient {
  const validation = validateCosmosDBConfig();

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // GameStateテーブルのTableClientを作成
  const client = TableClient.fromConnectionString(
    validation.connectionString!,
    'GameState'
  );

  return client;
}

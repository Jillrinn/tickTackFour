import { TableClient } from '@azure/data-tables';
import { validateCosmosDBConfig } from './cosmosClient';

/**
 * Cosmos DB PlayerNamesテーブルのTableClientを取得
 *
 * PlayerNamesテーブルへのTableClientインスタンスを返します。
 * 接続文字列が未設定の場合はエラーをスローします。
 *
 * @returns {TableClient} PlayerNamesテーブルのTableClientインスタンス
 * @throws {Error} 接続文字列が未設定の場合
 */
export function getPlayerNamesTableClient(): TableClient {
  const validation = validateCosmosDBConfig();

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // PlayerNamesテーブルのTableClientを作成
  const client = TableClient.fromConnectionString(
    validation.connectionString!,
    'PlayerNames'
  );

  return client;
}

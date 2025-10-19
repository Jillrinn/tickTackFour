import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPlayerNamesTableClient } from '../services/playerNamesClient';
import { PlayerNameEntity, PlayerNameResponse } from '../models/playerNames';

/**
 * GET /api/player-names
 * プレイヤー名履歴を取得（最新40件）
 *
 * レスポンス:
 * - 200: PlayerNameResponse[]（最新40件、RowKey昇順でソート済み）
 * - 200: エラー発生時も空配列を返す（フォールバック動作）
 */
async function getPlayerNames(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('GET /api/player-names - プレイヤー名履歴取得開始');

    // Cosmos DB PlayerNamesテーブルのクライアント取得
    const tableClient = getPlayerNamesTableClient();

    // 全エンティティを取得
    const entities: PlayerNameEntity[] = [];
    const iterator = tableClient.listEntities<PlayerNameEntity>();

    for await (const entity of iterator) {
      entities.push(entity);
    }

    // RowKey昇順（最新順）でソート
    // 逆順タイムスタンプなので、RowKeyが小さいほど新しい
    entities.sort((a, b) => a.rowKey.localeCompare(b.rowKey));

    // 最新40件のみを取得
    const latestEntities = entities.slice(0, 40);

    // レスポンス形式に変換
    const response: PlayerNameResponse[] = latestEntities.map(entity => ({
      name: entity.playerName,
      createdAt: entity.createdAt
    }));

    context.log('GET /api/player-names - プレイヤー名履歴取得成功', {
      count: response.length
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    // エラー発生時も空配列を返す（フォールバック動作）
    context.error('GET /api/player-names - エラー発生', error);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([])
    };
  }
}

// HTTPトリガー登録
app.http('getPlayerNames', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'player-names',
  handler: getPlayerNames
});

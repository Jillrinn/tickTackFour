import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getPlayerNamesTableClient } from '../services/playerNamesClient';
import { validatePlayerNames } from '../services/validatePlayerNames';
import { SavePlayerNamesRequest, SavePlayerNamesResponse, PlayerNameEntity } from '../models/playerNames';
import { generateRowKey } from '../models/playerNames';

/**
 * POST /api/player-names
 * プレイヤー名を保存
 *
 * リクエスト:
 * - names: string[] - プレイヤー名配列（デフォルト名除外済み）
 *
 * レスポンス:
 * - 200: SavePlayerNamesResponse（savedCount: 保存された件数）
 * - 500: エラー発生時
 */
async function savePlayerNames(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('POST /api/player-names - プレイヤー名保存開始');

    // リクエストボディを取得
    const requestBody = await request.json() as SavePlayerNamesRequest;

    // プレイヤー名のバリデーション（空文字列、重複、HTML特殊文字エスケープ、長さチェック）
    const validatedNames = validatePlayerNames(requestBody.names);

    if (validatedNames.length === 0) {
      context.log('POST /api/player-names - 有効な名前がありません');
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ savedCount: 0 })
      };
    }

    // Cosmos DB PlayerNamesテーブルのクライアント取得
    const tableClient = getPlayerNamesTableClient();
    let savedCount = 0;

    // 各プレイヤー名をCosmos DBに保存
    for (const name of validatedNames) {
      const entity: PlayerNameEntity = {
        partitionKey: 'global',
        rowKey: generateRowKey(), // 逆順タイムスタンプ + GUID
        playerName: name,
        createdAt: new Date().toISOString()
      };

      await tableClient.createEntity(entity);
      savedCount++;
    }

    context.log('POST /api/player-names - プレイヤー名保存成功', {
      savedCount
    });

    const response: SavePlayerNamesResponse = {
      savedCount
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    context.error('POST /api/player-names - エラー発生', error);

    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'InternalServerError',
        message: 'プレイヤー名の保存に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

// HTTPトリガー登録
app.http('savePlayerNames', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'player-names',
  handler: savePlayerNames
});

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

    // Content-Type検証
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      context.log('POST /api/player-names - Content-Typeエラー');
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'Content-Type must be application/json'
        })
      };
    }

    // リクエストボディを取得
    const requestBody = await request.json() as SavePlayerNamesRequest;

    // プレイヤー名のバリデーション（空文字列、重複、HTML特殊文字エスケープ、長さチェック）
    const validatedNames = validatePlayerNames(requestBody.names);

    if (validatedNames.length === 0) {
      context.log('POST /api/player-names - 有効な名前がありません');
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: '有効なプレイヤー名が含まれていません'
        })
      };
    }

    // Cosmos DB PlayerNamesテーブルのクライアント取得
    const tableClient = getPlayerNamesTableClient();

    // 既存エンティティを取得（40件超過時の削除判定用）
    const existingEntities: PlayerNameEntity[] = [];
    const iterator = tableClient.listEntities<PlayerNameEntity>();
    for await (const entity of iterator) {
      existingEntities.push(entity);
    }

    // 各プレイヤー名をCosmos DBに保存
    let savedCount = 0;
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

    // 40件超過時の自動削除機能
    const totalCount = existingEntities.length + savedCount;
    if (totalCount > 40) {
      const deleteCount = totalCount - 40;

      // 既存エンティティをRowKey昇順でソート（逆順タイムスタンプなので小さいほど古い）
      existingEntities.sort((a, b) => a.rowKey.localeCompare(b.rowKey));

      // 古いエンティティから削除（配列の最初から = RowKeyが小さい = 古い）
      const entitiesToDelete = existingEntities.slice(0, deleteCount);
      for (const entity of entitiesToDelete) {
        await tableClient.deleteEntity(entity.partitionKey, entity.rowKey);
      }

      context.log('POST /api/player-names - 古いエンティティを削除', {
        deleteCount,
        deletedRowKeys: entitiesToDelete.map(e => e.rowKey)
      });
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

    // RU/s制限エラー（429 Too Many Requests）の場合は503を返す
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.code === 429 || errorObj.statusCode === 429) {
        return {
          status: 503,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'ServiceUnavailable',
            message: 'サービスが一時的に利用できません。しばらくしてから再度お試しください'
          })
        };
      }
    }

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

import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';
import { GameStateService } from '../services/GameStateService';
import { GameStateRepository } from '../repositories/GameStateRepository';

/**
 * SignalR Output Binding定義
 */
const signalROutput = output.generic({
  type: 'signalR',
  name: 'signalR',
  hubName: 'gameHub',
  connectionStringSetting: 'AzureSignalRConnectionString'
});

/**
 * POST /api/updatePlayers
 * プレイヤー数を4〜6人の範囲で変更
 */
export async function updatePlayers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/updatePlayers - プレイヤー数変更');

  try {
    // リクエストボディの取得
    const body = await request.json() as { playerCount: number };

    if (!body || typeof body.playerCount !== 'number') {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: {
            message: 'リクエストボディにplayerCountが必要です',
            code: 'INVALID_REQUEST'
          }
        }
      };
    }

    // リポジトリとサービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // プレイヤー数を更新
    const result = await service.updatePlayers(body.playerCount);

    if (result.success) {
      // SignalRイベント送信
      context.extraOutputs.set(signalROutput, {
        target: 'PlayersUpdated',
        arguments: [{
          players: result.data.players,
          timestamp: new Date().toISOString()
        }]
      });

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: result.data
        }
      };
    } else {
      context.error('プレイヤー数変更エラー:', result.error);

      // バリデーションエラーは400を返す
      if (result.error.code === 'VALIDATION_ERROR') {
        return {
          status: 400,
          jsonBody: {
            success: false,
            error: result.error
          }
        };
      }

      return {
        status: 500,
        jsonBody: {
          success: false,
          error: result.error
        }
      };
    }
  } catch (error) {
    context.error('予期しないエラー:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'INTERNAL_ERROR'
        }
      }
    };
  }
}

app.http('updatePlayers', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'updatePlayers',
  handler: updatePlayers,
  extraOutputs: [signalROutput]
});

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
 * POST /api/resetGame
 * 全プレイヤーのタイマーを初期値にリセット
 */
export async function resetGame(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/resetGame - ゲームリセット');

  try {
    // リポジトリとサービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // ゲームをリセット
    const result = await service.resetGame();

    if (result.success) {
      // SignalRイベント送信
      context.extraOutputs.set(signalROutput, {
        target: 'GameReset',
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
      context.error('ゲームリセットエラー:', result.error);
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

app.http('resetGame', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'resetGame',
  handler: resetGame,
  extraOutputs: [signalROutput]
});

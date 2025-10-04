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
 * POST /api/pauseGame
 * 現在動作中のタイマーを一時停止
 */
export async function pauseGame(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/pauseGame - ゲーム一時停止');

  try {
    // リポジトリとサービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // ゲームを一時停止
    const result = await service.pauseGame();

    if (result.success) {
      // SignalRイベント送信
      context.extraOutputs.set(signalROutput, {
        target: 'GamePaused',
        arguments: [{
          isPaused: result.data.isPaused,
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
      context.error('ゲーム一時停止エラー:', result.error);
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

app.http('pauseGame', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'pauseGame',
  handler: pauseGame,
  extraOutputs: [signalROutput]
});

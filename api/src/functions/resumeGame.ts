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
 * POST /api/resumeGame
 * 一時停止したタイマーを再開
 */
export async function resumeGame(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/resumeGame - ゲーム再開');

  try {
    // リポジトリとサービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // ゲームを再開
    const result = await service.resumeGame();

    if (result.success) {
      // SignalRイベント送信
      context.extraOutputs.set(signalROutput, {
        target: 'GameResumed',
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
      context.error('ゲーム再開エラー:', result.error);
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

app.http('resumeGame', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'resumeGame',
  handler: resumeGame,
  extraOutputs: [signalROutput]
});

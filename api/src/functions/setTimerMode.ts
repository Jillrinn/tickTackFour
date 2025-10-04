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
 * POST /api/setTimerMode
 * タイマーモードを設定（カウントアップ/カウントダウン切り替え）
 */
export async function setTimerMode(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/setTimerMode - タイマーモード設定');

  try {
    // リクエストボディの取得
    const body = await request.json() as { mode: 'count-up' | 'count-down'; initialTimeSeconds?: number };

    if (!body || !body.mode) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: {
            message: 'リクエストボディにmodeが必要です',
            code: 'INVALID_REQUEST'
          }
        }
      };
    }

    // リポジトリとサービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // タイマーモードを設定
    const result = await service.setTimerMode(body.mode, body.initialTimeSeconds);

    if (result.success) {
      // SignalRイベント送信
      context.extraOutputs.set(signalROutput, {
        target: 'TimerModeChanged',
        arguments: [{
          timerMode: result.data.timerMode,
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
      context.error('タイマーモード設定エラー:', result.error);

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

app.http('setTimerMode', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'setTimerMode',
  handler: setTimerMode,
  extraOutputs: [signalROutput]
});

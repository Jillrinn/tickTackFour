import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';
import { GameStateService } from '../services/GameStateService';
import { GameStateRepository } from '../repositories/GameStateRepository';
import { setTimerModeSchema } from '../validation/schemas';
import { handleValidation, handleError, BusinessError } from '../middleware/errorHandler';

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
    // リクエストボディの取得とバリデーション
    const body = await request.json();
    const validationResult = handleValidation(setTimerModeSchema, body);

    if (!validationResult.success) {
      return handleError(validationResult.error);
    }

    const { mode, initialTimeSeconds } = validationResult.data;

    // リポジトリとサービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // タイマーモードを設定
    const result = await service.setTimerMode(mode, initialTimeSeconds);

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

      // ビジネスルールエラーの場合は422を返す
      if (result.error.code === 'VALIDATION_ERROR') {
        return handleError(new BusinessError(result.error.message));
      }

      throw new Error(result.error.message);
    }
  } catch (error) {
    context.error('予期しないエラー:', error);
    return handleError(error);
  }
}

app.http('setTimerMode', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'setTimerMode',
  handler: setTimerMode,
  extraOutputs: [signalROutput]
});

import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';
import { GameStateService } from '../services/GameStateService';
import { GameStateRepository } from '../repositories/GameStateRepository';
import { SignalRPublisher } from '../services/SignalRPublisher';
import { TimerUpdatedEvent } from '../models/SignalREvents';
import { syncTimerSchema } from '../validation/schemas';
import { handleValidation, handleError, BusinessError } from '../middleware/errorHandler';

/**
 * POST /api/syncTimer
 * タイマー同期API
 * - クライアントから送信された経過時間を検証して保存
 * - カウントアップ/カウントダウンモード別のタイマー値更新
 * - カウントダウンモードでの時間切れ検出（0:00到達）
 * - SignalR TimerUpdatedイベントの送信
 */

// SignalR Output Binding
const signalROutput = output.generic({
  type: 'signalR',
  name: 'signalR',
  hubName: 'gameHub',
  connectionStringSetting: 'AzureSignalRConnectionString'
});

export async function syncTimer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/syncTimer - タイマー同期');

  try {
    // リクエストボディの取得とバリデーション
    const body = await request.json();
    const validationResult = handleValidation(syncTimerSchema, body);

    if (!validationResult.success) {
      return handleError(validationResult.error);
    }

    const { playerId, elapsedTimeSeconds } = validationResult.data;

    // サービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // タイマー同期
    const result = await service.syncTimer(playerId, elapsedTimeSeconds);

    if (!result.success) {
      if (result.error.code === 'VALIDATION_ERROR') {
        return handleError(new BusinessError(result.error.message));
      }
      throw new Error(result.error.message);
    }

    // SignalRイベントの送信
    const publisher = new SignalRPublisher();
    const event: TimerUpdatedEvent = {
      playerId,
      elapsedTimeSeconds,
      timestamp: new Date().toISOString()
    };
    const signalRMessage = publisher.publishTimerUpdated(event);

    // SignalR Output Bindingに設定
    context.extraOutputs.set(signalROutput, signalRMessage);

    return {
      status: 200,
      jsonBody: {
        success: true,
        data: result.data
      }
    };
  } catch (error) {
    context.error('予期しないエラー:', error);
    return handleError(error);
  }
}

app.http('syncTimer', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'syncTimer',
  extraOutputs: [signalROutput],
  handler: syncTimer
});

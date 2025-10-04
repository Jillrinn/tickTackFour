import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from '@azure/functions';
import { GameStateService } from '../services/GameStateService';
import { GameStateRepository } from '../repositories/GameStateRepository';
import { SignalRPublisher } from '../services/SignalRPublisher';
import { TimerUpdatedEvent } from '../models/SignalREvents';

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
    // リクエストボディの解析
    const body = await request.json() as { playerId: string; elapsedTimeSeconds: number };

    if (!body.playerId || typeof body.elapsedTimeSeconds !== 'number') {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: {
            message: '不正なリクエストです',
            code: 'INVALID_REQUEST',
            validationErrors: ['playerId と elapsedTimeSeconds は必須です']
          }
        }
      };
    }

    // サービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // タイマー同期
    const result = await service.syncTimer(body.playerId, body.elapsedTimeSeconds);

    if (!result.success) {
      const statusCode = result.error.code === 'VALIDATION_ERROR' ? 422 : 500;
      return {
        status: statusCode,
        jsonBody: {
          success: false,
          error: result.error
        }
      };
    }

    // SignalRイベントの送信
    const publisher = new SignalRPublisher();
    const event: TimerUpdatedEvent = {
      playerId: body.playerId,
      elapsedTimeSeconds: body.elapsedTimeSeconds,
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

app.http('syncTimer', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'syncTimer',
  extraOutputs: [signalROutput],
  handler: syncTimer
});

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { GameStateService } from '../services/GameStateService';
import { GameStateRepository } from '../repositories/GameStateRepository';

/**
 * GET /api/game
 * 現在のゲーム状態を取得
 * 初回アクセス時はデフォルト状態（4人プレイヤー、カウントアップモード）を作成
 */
export async function getGame(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GET /api/game - ゲーム状態取得');

  try {
    // リポジトリとサービスの初期化
    const connectionString = process.env.CosmosDBConnectionString || '';
    const repository = new GameStateRepository(connectionString);
    const service = new GameStateService(repository);

    // ゲーム状態を取得
    const result = await service.getCurrentState();

    if (result.success) {
      return {
        status: 200,
        jsonBody: {
          success: true,
          data: result.data
        }
      };
    } else {
      context.error('ゲーム状態取得エラー:', result.error);
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

app.http('getGame', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'game',
  handler: getGame
});

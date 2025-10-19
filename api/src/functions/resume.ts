import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../services/gameStateService';
import { retryUpdateWithETag } from '../services/retryWithETag';
import { GameState } from '../models/gameState';
import { RestError } from '@azure/data-tables';

/**
 * 再開エンドポイント（POST /api/resume）
 *
 * 機能:
 * - turnStartedAtに現在時刻を設定（新しいターン開始）
 * - pausedAtをundefinedに設定
 * - isPausedフラグをfalseに設定
 * - ETag楽観的ロック更新（再試行メカニズム使用）
 */
async function resume(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // リクエストボディからETagを取得
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const clientETag = body.etag;

    if (!clientETag) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'ETagが指定されていません'
        })
      };
    }

    // 現在のゲーム状態を取得
    const result = await getGameState();
    const currentState = result.state;

    // 再開状態に設定
    const newState: GameState = {
      ...currentState,
      isPaused: false,
      pausedAt: undefined, // 一時停止時刻をクリア
      turnStartedAt: new Date().toISOString() // 新しいターンの開始時刻
    };

    // ETag楽観的ロック更新（再試行メカニズム使用）
    const updatedResult = await retryUpdateWithETag(
      newState,
      clientETag,
      async (state, etag) => await updateGameState(state, etag),
      async () => await getGameState(),
      3 // 最大3回再試行
    );

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...updatedResult.state,
        etag: updatedResult.etag
      })
    };
  } catch (error) {
    // ETag競合エラー（412 Precondition Failed）
    if (error instanceof RestError && error.statusCode === 412) {
      return {
        status: 409,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Conflict',
          message: '他のユーザーによって更新されました。最新の状態を取得してください。'
        })
      };
    }

    // その他のエラー
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'InternalServerError',
        message: '再開処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('resume', {
  methods: ['POST'],
  route: 'resume',
  authLevel: 'anonymous',
  handler: resume
});

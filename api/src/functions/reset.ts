import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../services/gameStateService';
import { retryUpdateWithETag } from '../services/retryWithETag';
import { createDefaultGameState } from '../models/gameState';
import { RestError } from '@azure/data-tables';

/**
 * ゲームリセットエンドポイント（POST /api/reset）
 *
 * 機能:
 * - デフォルトゲーム状態の生成（4人、カウントアップモード、全タイマー0:00）
 * - 全プレイヤーのaccumulatedSecondsを0にリセット
 * - turnStartedAtを現在時刻に設定
 * - activePlayerIndexを0にリセット
 * - ETag楽観的ロック更新（再試行メカニズム使用）
 */
async function reset(
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

    // 現在のゲーム状態を取得（ETag検証のため）
    const result = await getGameState();

    // デフォルトゲーム状態を生成
    // - 4人プレイヤー
    // - カウントアップモード
    // - 全プレイヤーのタイマー0:00
    // - activePlayerIndex = 0
    // - isPaused = false
    const defaultState = createDefaultGameState();

    // ETag楽観的ロック更新（再試行メカニズム使用）
    const updatedResult = await retryUpdateWithETag(
      defaultState,
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
        message: 'リセット処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('reset', {
  methods: ['POST'],
  route: 'reset',
  authLevel: 'anonymous',
  handler: reset
});

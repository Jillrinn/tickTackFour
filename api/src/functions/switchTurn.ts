import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../services/gameStateService';
import { calculateElapsedTime } from '../services/timeCalculation';
import { retryUpdateWithETag } from '../services/retryWithETag';
import { GameState } from '../models/gameState';
import { hasStatusCodeValue } from '../utils/errorUtils';

/**
 * ターン切り替えエンドポイント（POST /api/switchTurn）
 *
 * 機能:
 * - 現在のアクティブプレイヤーの経過時間を計算
 * - 累積経過時間に加算
 * - アクティブプレイヤーインデックスを循環（(current + 1) % playerCount）
 * - 新しいturnStartedAtを現在時刻に設定
 * - ETag楽観的ロック更新（再試行メカニズム使用）
 */
async function switchTurn(
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

    // 現在のアクティブプレイヤーの経過時間を計算
    const elapsedSeconds = calculateElapsedTime(currentState, currentState.activePlayerIndex);

    // 累積経過時間に加算
    const updatedPlayers = [...currentState.players];
    updatedPlayers[currentState.activePlayerIndex] = {
      ...updatedPlayers[currentState.activePlayerIndex],
      accumulatedSeconds: elapsedSeconds
    };

    // アクティブプレイヤーインデックスを循環（(current + 1) % playerCount）
    const nextPlayerIndex = (currentState.activePlayerIndex + 1) % currentState.playerCount;

    // 新しいゲーム状態を構築
    const newState: GameState = {
      ...currentState,
      players: updatedPlayers,
      activePlayerIndex: nextPlayerIndex,
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
  } catch (error: unknown) {
    // ETag競合エラー（412 Precondition Failed）
    if (hasStatusCodeValue(error, 412)) {
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
        message: 'ターン切り替えに失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('switchTurn', {
  methods: ['POST'],
  route: 'switchTurn',
  authLevel: 'anonymous',
  handler: switchTurn
});

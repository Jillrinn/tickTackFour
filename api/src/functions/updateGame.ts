import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../services/gameStateService';
import { retryUpdateWithETag } from '../services/retryWithETag';
import { GameState } from '../models/gameState';
import { hasStatusCodeValue } from '../utils/errorUtils';

/**
 * 汎用更新エンドポイント（POST /api/updateGame）
 *
 * 機能:
 * - プレイヤー数変更（4-6人の範囲バリデーション）
 * - タイマーモード変更（countup/countdown切替）
 * - カウントダウン秒数変更
 * - プレイヤー名変更
 * - バリデーションエラー時の400エラーレスポンス
 * - ETag楽観的ロック更新（再試行メカニズム使用）
 */
async function updateGame(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const clientETag = body.etag;

    // ETagバリデーション
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

    // 更新内容の取得
    const { playerCount, timerMode, countdownSeconds, playerNames } = body;

    // 何も更新内容が指定されていない場合
    if (playerCount === undefined && timerMode === undefined &&
        countdownSeconds === undefined && playerNames === undefined) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: '更新内容が指定されていません'
        })
      };
    }

    // 現在のゲーム状態を取得
    const result = await getGameState();
    let newState: GameState = { ...result.state };

    // プレイヤー数変更のバリデーションと処理
    if (playerCount !== undefined) {
      if (playerCount < 4 || playerCount > 6) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'プレイヤー数は4人から6人の範囲で指定してください'
          })
        };
      }

      const currentPlayerCount = newState.players.length;
      if (playerCount > currentPlayerCount) {
        // プレイヤーを追加
        const playersToAdd = playerCount - currentPlayerCount;
        for (let i = 0; i < playersToAdd; i++) {
          const newId = currentPlayerCount + i + 1;
          newState.players.push({
            id: newId,
            name: `Player ${newId}`,
            accumulatedSeconds: 0
          });
        }
      } else if (playerCount < currentPlayerCount) {
        // プレイヤーを削除
        newState.players = newState.players.slice(0, playerCount);
      }
      newState.playerCount = playerCount;
    }

    // タイマーモード変更のバリデーションと処理
    if (timerMode !== undefined) {
      if (timerMode !== 'countup' && timerMode !== 'countdown') {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'タイマーモードはcountupまたはcountdownを指定してください'
          })
        };
      }
      newState.timerMode = timerMode;
    }

    // カウントダウン秒数変更のバリデーションと処理
    if (countdownSeconds !== undefined) {
      if (countdownSeconds <= 0) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'カウントダウン秒数は0より大きい値を指定してください'
          })
        };
      }
      newState.countdownSeconds = countdownSeconds;
    }

    // プレイヤー名変更のバリデーションと処理
    if (playerNames !== undefined) {
      if (!Array.isArray(playerNames) || playerNames.length !== newState.players.length) {
        return {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'プレイヤー名の配列の長さが現在のプレイヤー数と一致しません'
          })
        };
      }
      newState.players = newState.players.map((player, index) => ({
        ...player,
        name: playerNames[index]
      }));
    }

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
        message: '更新処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('updateGame', {
  methods: ['POST'],
  route: 'updateGame',
  authLevel: 'anonymous',
  handler: updateGame
});

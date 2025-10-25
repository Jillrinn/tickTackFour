import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../services/gameStateService';
import { retryUpdateWithETag } from '../services/retryWithETag';
import { GameState } from '../models/gameState';
import { hasStatusCodeValue } from '../utils/errorUtils';

/**
 * プレイヤー名更新エンドポイント（PUT /api/updatePlayerName）
 *
 * 機能:
 * - リクエストボディから playerIndex, name を取得
 * - If-Match ヘッダーから etag を取得
 * - Cosmos DB から現在のゲーム状態を取得
 * - バリデーション:
 *   - playerIndex: 0 ≤ playerIndex < players.length
 *   - name: 1文字以上、100文字以下
 *   - etag: 必須（If-Matchヘッダー）
 * - players[playerIndex].name を新しい名前で更新
 * - 楽観的ロック（ETag）を使用してCosmos DBに保存
 * - 新しいETagと更新後のゲーム状態をレスポンス
 *
 * Requirements: api-mode-ui-fixes spec 2.3, 4.1, 4.2
 */
async function updatePlayerName(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // If-Matchヘッダーからetagを取得
    const clientETag = request.headers.get('If-Match');

    if (!clientETag) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'If-Matchヘッダーが指定されていません'
        })
      };
    }

    // リクエストボディからplayerIndexとnameを取得
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const { playerIndex, name } = body;

    // playerIndexのバリデーション（存在チェック）
    if (playerIndex === undefined || playerIndex === null) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'playerIndexが指定されていません'
        })
      };
    }

    // nameのバリデーション（存在チェックと長さ制限）
    if (!name || typeof name !== 'string') {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'nameが指定されていないか、文字列ではありません'
        })
      };
    }

    if (name.length === 0) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'nameは1文字以上である必要があります'
        })
      };
    }

    if (name.length > 100) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'nameは100文字以下である必要があります'
        })
      };
    }

    // 現在のゲーム状態を取得
    const result = await getGameState();
    const currentState = result.state;

    // playerIndexの範囲バリデーション
    if (playerIndex < 0 || playerIndex >= currentState.players.length) {
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'BadRequest',
          message: `playerIndexは0以上${currentState.players.length}未満である必要があります`
        })
      };
    }

    // プレイヤー名を更新した新しいゲーム状態を構築
    const updatedPlayers = [...currentState.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      name: name
    };

    const newState: GameState = {
      ...currentState,
      players: updatedPlayers
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
        message: 'プレイヤー名の更新に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

app.http('updatePlayerName', {
  methods: ['PUT'],
  route: 'updatePlayerName',
  authLevel: 'anonymous',
  handler: updatePlayerName
});

// テスト用エクスポート
export { updatePlayerName };

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../services/gameStateService';
import { calculateElapsedTime } from '../services/timeCalculation';
import { retryUpdateWithETag } from '../services/retryWithETag';
import { GameState } from '../models/gameState';
import { hasStatusCodeValue } from '../utils/errorUtils';
import { getCatanPlayerIndex } from '../services/turnSequence';

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
    // 任意: 指定時はそのプレイヤーへ手番をジャンプ（カードクリック機能）。未指定なら従来どおり次へ循環
    const targetPlayerIndex = body.targetPlayerIndex;

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

    // targetPlayerIndex指定時のバリデーションと「アクティブ本人なら何もしない」処理
    // カタンモードでは手番ジャンプを許可しない（蛇腹順を厳密に保つ）ためtargetを無視
    const hasTarget =
      targetPlayerIndex !== undefined &&
      targetPlayerIndex !== null &&
      currentState.gameMode !== 'catan';
    if (hasTarget) {
      if (
        typeof targetPlayerIndex !== 'number' ||
        !Number.isInteger(targetPlayerIndex) ||
        targetPlayerIndex < 0 ||
        targetPlayerIndex >= currentState.playerCount
      ) {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'BadRequest',
            message: `targetPlayerIndexは0以上${currentState.playerCount}未満の整数である必要があります`
          })
        };
      }

      // すでにアクティブなプレイヤーを指定した場合は何もしない（現状をそのまま返す）
      if (targetPlayerIndex === currentState.activePlayerIndex) {
        return {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentState,
            etag: result.etag
          })
        };
      }
    }

    // 初期状態（activePlayerIndex: -1）かどうかをチェック
    const isInitialState = currentState.activePlayerIndex === -1;

    let newState: GameState;

    if (isInitialState) {
      // 初期状態からのゲーム開始処理。
      // カタン: turnNumber=0, index=getCatanPlayerIndex(0,N)=0
      // 通常: target指定があればその人、なければ先頭(0)
      const startIndex =
        currentState.gameMode === 'catan'
          ? getCatanPlayerIndex(0, currentState.playerCount)
          : hasTarget
          ? targetPlayerIndex
          : 0;
      newState = {
        ...currentState,
        activePlayerIndex: startIndex,
        isPaused: false,
        turnStartedAt: new Date().toISOString(),
        turnNumber: 0,
        players: currentState.players
      };
    } else {
      // 通常のターン切り替え処理
      // 現在のアクティブプレイヤーの経過時間を計算
      const elapsedSeconds = calculateElapsedTime(currentState, currentState.activePlayerIndex);

      // 累積経過時間に加算
      const updatedPlayers = [...currentState.players];
      updatedPlayers[currentState.activePlayerIndex] = {
        ...updatedPlayers[currentState.activePlayerIndex],
        accumulatedSeconds: elapsedSeconds
      };

      // 行き先の決定
      // カタン: turnNumber+1 → 蛇腹/通常順を純粋関数で算出（target無視）
      // 通常: target指定があればジャンプ、なければ次へ循環
      const nextTurnNumber = currentState.turnNumber + 1;
      const nextPlayerIndex =
        currentState.gameMode === 'catan'
          ? getCatanPlayerIndex(nextTurnNumber, currentState.playerCount)
          : hasTarget
          ? targetPlayerIndex
          : (currentState.activePlayerIndex + 1) % currentState.playerCount;

      // 新しいゲーム状態を構築（isPaused/pausedAtは維持＝一時停止中ジャンプは停止を保つ）
      newState = {
        ...currentState,
        players: updatedPlayers,
        activePlayerIndex: nextPlayerIndex,
        turnNumber: nextTurnNumber,
        turnStartedAt: new Date().toISOString() // 新しいターンの開始時刻
      };
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

// テスト用エクスポート
export { switchTurn };

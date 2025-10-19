import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getGameState } from '../services/gameStateService';
import { calculateAllPlayerTimes } from '../services/timeCalculation';
import { GameStateWithTime, ApiErrorResponse } from '../models/apiTypes';

/**
 * GET /api/game
 * ゲーム状態を取得（計算済み経過時間を含む）
 *
 * レスポンス:
 * - 200: GameStateWithTime（計算済み経過時間とETag含む）
 * - 500: エラー発生時（Cosmos DB接続エラー等）
 */
async function getGame(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    context.log('GET /api/game - ゲーム状態取得開始');

    // Cosmos DBからゲーム状態を取得（初回アクセス時は自動初期化）
    const result = await getGameState();

    // 全プレイヤーの経過時間を計算
    const calculatedTimes = calculateAllPlayerTimes(result.state);

    // プレイヤー配列を統合（name + elapsedSeconds形式）
    const playersWithTime = result.state.players.map((player, index) => {
      const calculated = calculatedTimes.find(ct => ct.playerId === index + 1);
      return {
        name: player.name,
        elapsedSeconds: calculated?.elapsedSeconds || 0
      };
    });

    // レスポンスを生成（設計書準拠の形式）
    const response: GameStateWithTime = {
      players: playersWithTime,
      activePlayerIndex: result.state.activePlayerIndex,
      timerMode: result.state.timerMode,
      countdownSeconds: result.state.countdownSeconds,
      isPaused: result.state.isPaused,
      etag: result.etag
    };

    context.log('GET /api/game - ゲーム状態取得成功', {
      playerCount: response.players.length,
      activePlayerIndex: response.activePlayerIndex,
      isPaused: response.isPaused
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    context.error('GET /api/game - エラー発生', error);

    const errorResponse: ApiErrorResponse = {
      error: 'InternalServerError',
      message: 'ゲーム状態の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    };

    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorResponse)
    };
  }
}

// HTTPトリガー登録
app.http('getGame', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'game',
  handler: getGame
});

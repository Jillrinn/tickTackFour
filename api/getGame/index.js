const { getGameState } = require('../shared/services/gameStateService');
const { calculateAllPlayerTimes } = require('../shared/services/timeCalculation');

/**
 * GET /api/game
 * ゲーム状態を取得（計算済み経過時間を含む）
 *
 * レスポンス:
 * - 200: GameStateWithTime（計算済み経過時間とETag含む）
 * - 500: エラー発生時（Cosmos DB接続エラー等）
 */
module.exports = async function (context, req) {
  try {
    context.log('GET /api/game - ゲーム状態取得開始');

    // Cosmos DBからゲーム状態を取得（初回アクセス時は自動初期化）
    const result = await getGameState();

    // 全プレイヤーの経過時間を計算
    const calculatedTimes = calculateAllPlayerTimes(result.state);

    // レスポンスを生成
    const response = {
      ...result.state,
      calculatedTimes,
      etag: result.etag
    };

    context.log('GET /api/game - ゲーム状態取得成功', {
      playerCount: response.playerCount,
      activePlayerIndex: response.activePlayerIndex,
      isPaused: response.isPaused
    });

    context.res = {
      status: 200,
      body: response,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    context.error('GET /api/game - エラー発生', error);

    const errorResponse = {
      error: 'InternalServerError',
      message: 'ゲーム状態の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    };

    context.res = {
      status: 500,
      body: errorResponse,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};

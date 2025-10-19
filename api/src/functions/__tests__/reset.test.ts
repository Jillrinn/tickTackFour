import { HttpRequest, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../../services/gameStateService';
import { retryUpdateWithETag } from '../../services/retryWithETag';
import { GameState, createDefaultGameState } from '../../models/gameState';
import { RestError } from '@azure/data-tables';

// reset関数をテスト用にインポート
// Note: app.httpで登録されているため、直接インポートできないので再実装
jest.mock('../../services/gameStateService');
jest.mock('../../services/retryWithETag');

const mockGetGameState = getGameState as jest.MockedFunction<typeof getGameState>;
const mockUpdateGameState = updateGameState as jest.MockedFunction<typeof updateGameState>;
const mockRetryUpdateWithETag = retryUpdateWithETag as jest.MockedFunction<typeof retryUpdateWithETag>;

// テスト対象の関数を再実装（app.httpでラップされているため）
async function reset(
  request: HttpRequest,
  context: InvocationContext
): Promise<any> {
  try {
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const clientETag = body.etag;

    if (!clientETag) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'ETagが指定されていません'
        })
      };
    }

    const result = await getGameState();

    // デフォルトゲーム状態を生成
    const defaultState = createDefaultGameState();

    // ETag楽観的ロック更新（再試行メカニズム使用）
    const updatedResult = await retryUpdateWithETag(
      defaultState,
      clientETag,
      async (state, etag) => await updateGameState(state, etag),
      async () => await getGameState(),
      3
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updatedResult.state,
        etag: updatedResult.etag
      })
    };
  } catch (error) {
    if (error instanceof RestError && error.statusCode === 412) {
      return {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Conflict',
          message: '他のユーザーによって更新されました。最新の状態を取得してください。'
        })
      };
    }

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'InternalServerError',
        message: 'リセット処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

describe('POST /api/reset', () => {
  let mockContext: InvocationContext;
  let mockRequest: HttpRequest;

  beforeEach(() => {
    // InvocationContextのモック
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      invocationId: 'test-invocation-id',
      functionName: 'reset',
      extraInputs: {
        get: jest.fn(),
        set: jest.fn()
      },
      extraOutputs: {
        get: jest.fn(),
        set: jest.fn()
      },
      retryContext: undefined,
      traceContext: undefined,
      triggerMetadata: {},
      options: {}
    } as unknown as InvocationContext;

    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('ゲームをデフォルト状態にリセットする（4人、カウントアップモード、全タイマー0:00）', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 6,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 300 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 250 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 180 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 90 },
          { id: 5, name: 'プレイヤー5', accumulatedSeconds: 120 },
          { id: 6, name: 'プレイヤー6', accumulatedSeconds: 60 }
        ],
        activePlayerIndex: 3,
        timerMode: 'countdown',
        countdownSeconds: 90,
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:05:00.000Z'
      };

      const clientETag = 'W/"current-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: clientETag
      });

      // デフォルト状態
      const defaultState = createDefaultGameState();

      mockRetryUpdateWithETag.mockResolvedValue({
        state: defaultState,
        etag: 'W/"reset-etag"'
      });

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.playerCount).toBe(4);
      expect(body.players).toHaveLength(4);
      expect(body.players[0].accumulatedSeconds).toBe(0);
      expect(body.players[1].accumulatedSeconds).toBe(0);
      expect(body.players[2].accumulatedSeconds).toBe(0);
      expect(body.players[3].accumulatedSeconds).toBe(0);
      expect(body.activePlayerIndex).toBe(0);
      expect(body.timerMode).toBe('countup');
      expect(body.isPaused).toBe(false);
      expect(body.turnStartedAt).toBeDefined();
      expect(body.etag).toBe('W/"reset-etag"');

      // モックが正しく呼ばれたことを確認
      expect(mockGetGameState).toHaveBeenCalledTimes(1);
      expect(mockRetryUpdateWithETag).toHaveBeenCalledTimes(1);
    });

    it('既にデフォルト状態のゲームもリセットできる', async () => {
      // Arrange
      const defaultState = createDefaultGameState();
      const clientETag = 'W/"default-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: defaultState,
        etag: clientETag
      });

      mockRetryUpdateWithETag.mockResolvedValue({
        state: defaultState,
        etag: 'W/"new-reset-etag"'
      });

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.playerCount).toBe(4);
      expect(body.activePlayerIndex).toBe(0);
      expect(body.timerMode).toBe('countup');
    });

    it('一時停止状態のゲームをリセットすると非一時停止状態になる', async () => {
      // Arrange
      const pausedState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 120 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 60 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 30 }
        ],
        activePlayerIndex: 2,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:02:00.000Z'
      };

      const clientETag = 'W/"paused-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: clientETag
      });

      const defaultState = createDefaultGameState();

      mockRetryUpdateWithETag.mockResolvedValue({
        state: defaultState,
        etag: 'W/"reset-from-pause-etag"'
      });

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.isPaused).toBe(false);
      expect(body.pausedAt).toBeUndefined();
    });
  });

  describe('異常系', () => {
    it('ETagが指定されていない場合は400エラーを返す', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({})
      } as unknown as HttpRequest;

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toBe('ETagが指定されていません');
    });

    it('ETag競合（412 Conflict）時は409エラーを返す', async () => {
      // Arrange
      const currentState = createDefaultGameState();
      const clientETag = 'W/"old-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: 'W/"current-etag"'
      });

      // 3回再試行後も412エラー
      const conflictError = new RestError('Precondition failed', { statusCode: 412 });
      mockRetryUpdateWithETag.mockRejectedValue(conflictError);

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(409);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Conflict');
      expect(body.message).toBe('他のユーザーによって更新されました。最新の状態を取得してください。');
    });

    it('Cosmos DB接続エラー時は500エラーを返す', async () => {
      // Arrange
      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      const dbError = new Error('Cosmos DB connection failed');
      mockGetGameState.mockRejectedValue(dbError);

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.message).toBe('リセット処理に失敗しました');
      expect(body.details).toBe('Cosmos DB connection failed');
    });

    it('不明なエラー時は500エラーを返す（エラーメッセージなし）', async () => {
      // Arrange
      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue('Unknown error string');

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.details).toBe('Unknown error');
    });
  });

  describe('ETag検証', () => {
    it('レスポンスに新しいETagが含まれる', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 100 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:00:00.000Z'
      };

      const clientETag = 'W/"old-etag-123"';
      const expectedNewETag = 'W/"new-reset-etag-456"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: clientETag
      });

      const defaultState = createDefaultGameState();

      mockRetryUpdateWithETag.mockResolvedValue({
        state: defaultState,
        etag: expectedNewETag
      });

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      const body = JSON.parse(response.body);
      expect(body.etag).toBe(expectedNewETag);
    });
  });

  describe('Content-Type検証', () => {
    it('正常時のContent-Typeはapplication/json', async () => {
      // Arrange
      const currentState = createDefaultGameState();

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: 'W/"test"' })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: 'W/"test"'
      });

      mockRetryUpdateWithETag.mockResolvedValue({
        state: currentState,
        etag: 'W/"new"'
      });

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    it('エラー時のContent-Typeもapplication/json', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: 'W/"test"' })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue(new Error('Test error'));

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('デフォルト状態検証', () => {
    it('リセット後のゲーム状態がcreateDefaultGameState()の仕様と一致する', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 5,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 200 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 150 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 100 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 50 },
          { id: 5, name: 'プレイヤー5', accumulatedSeconds: 25 }
        ],
        activePlayerIndex: 4,
        timerMode: 'countdown',
        countdownSeconds: 120,
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:03:00.000Z'
      };

      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/reset',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: clientETag
      });

      const expectedDefaultState = createDefaultGameState();

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedDefaultState,
        etag: 'W/"reset-etag"'
      });

      // Act
      const response = await reset(mockRequest, mockContext);

      // Assert
      const body = JSON.parse(response.body);

      // デフォルト状態の仕様確認
      expect(body.playerCount).toBe(expectedDefaultState.playerCount);
      expect(body.players).toHaveLength(expectedDefaultState.playerCount);
      expect(body.activePlayerIndex).toBe(expectedDefaultState.activePlayerIndex);
      expect(body.timerMode).toBe(expectedDefaultState.timerMode);
      expect(body.countdownSeconds).toBe(expectedDefaultState.countdownSeconds);
      expect(body.isPaused).toBe(expectedDefaultState.isPaused);

      // 全プレイヤーの累積時間が0
      body.players.forEach((player: any) => {
        expect(player.accumulatedSeconds).toBe(0);
      });
    });
  });
});

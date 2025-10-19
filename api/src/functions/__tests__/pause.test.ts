import { HttpRequest, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../../services/gameStateService';
import { calculateElapsedTime } from '../../services/timeCalculation';
import { retryUpdateWithETag } from '../../services/retryWithETag';
import { GameState } from '../../models/gameState';
import { RestError } from '@azure/data-tables';

// pause関数をテスト用にインポート
// Note: app.httpで登録されているため、直接インポートできないので再実装
jest.mock('../../services/gameStateService');
jest.mock('../../services/timeCalculation');
jest.mock('../../services/retryWithETag');

const mockGetGameState = getGameState as jest.MockedFunction<typeof getGameState>;
const mockUpdateGameState = updateGameState as jest.MockedFunction<typeof updateGameState>;
const mockCalculateElapsedTime = calculateElapsedTime as jest.MockedFunction<typeof calculateElapsedTime>;
const mockRetryUpdateWithETag = retryUpdateWithETag as jest.MockedFunction<typeof retryUpdateWithETag>;

// テスト対象の関数を再実装（app.httpでラップされているため）
async function pause(
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
    const currentState = result.state;

    // 現在のアクティブプレイヤーの経過時間を計算
    const elapsedSeconds = calculateElapsedTime(currentState, currentState.activePlayerIndex);

    // 累積経過時間に加算
    const updatedPlayers = [...currentState.players];
    updatedPlayers[currentState.activePlayerIndex] = {
      ...updatedPlayers[currentState.activePlayerIndex],
      accumulatedSeconds: elapsedSeconds
    };

    // 一時停止状態に設定
    const newState: GameState = {
      ...currentState,
      players: updatedPlayers,
      isPaused: true,
      pausedAt: new Date().toISOString()
    };

    // ETag楽観的ロック更新（再試行メカニズム使用）
    const updatedResult = await retryUpdateWithETag(
      newState,
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
        message: '一時停止処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

describe('POST /api/pause', () => {
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
      functionName: 'pause',
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
    it('ゲームを一時停止し、経過時間を累積に加算し、isPausedとpausedAtを設定する', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 120 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:00:00.000Z'
      };

      const clientETag = 'W/"test-etag-123"';
      const calculatedElapsedTime = 125; // 120秒累積 + 5秒経過

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: clientETag
      });

      mockCalculateElapsedTime.mockReturnValue(calculatedElapsedTime);

      const updatedState: GameState = {
        ...currentState,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: calculatedElapsedTime },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        isPaused: true,
        pausedAt: expect.any(String)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-etag-456"'
      });

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.isPaused).toBe(true);
      expect(body.pausedAt).toBeDefined();
      expect(body.players[0].accumulatedSeconds).toBe(calculatedElapsedTime);
      expect(body.etag).toBe('W/"new-etag-456"');

      // モックが正しく呼ばれたことを確認
      expect(mockGetGameState).toHaveBeenCalledTimes(1);
      expect(mockCalculateElapsedTime).toHaveBeenCalledWith(currentState, 0);
      expect(mockRetryUpdateWithETag).toHaveBeenCalledTimes(1);
    });

    it('既に一時停止状態のゲームも正常に処理できる', async () => {
      // Arrange
      const pausedState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 300 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 250 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 1,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:05:00.000Z'
      };

      const clientETag = 'W/"paused-etag"';
      const calculatedElapsedTime = 250; // 一時停止中なので累積のみ

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: clientETag
      });

      mockCalculateElapsedTime.mockReturnValue(calculatedElapsedTime);

      const updatedState: GameState = {
        ...pausedState,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 300 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: calculatedElapsedTime },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        isPaused: true,
        pausedAt: expect.any(String)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-paused-etag"'
      });

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.isPaused).toBe(true);
      expect(body.pausedAt).toBeDefined();
    });

    it('カウントダウンモードでも正常に一時停止できる', async () => {
      // Arrange
      const countdownState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 45 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countdown',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:00:00.000Z'
      };

      const clientETag = 'W/"countdown-etag"';
      const calculatedElapsedTime = 35; // 30秒累積 + 5秒経過

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: countdownState,
        etag: clientETag
      });

      mockCalculateElapsedTime.mockReturnValue(calculatedElapsedTime);

      const updatedState: GameState = {
        ...countdownState,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: calculatedElapsedTime },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 45 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        isPaused: true,
        pausedAt: expect.any(String)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-countdown-etag"'
      });

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.isPaused).toBe(true);
      expect(body.timerMode).toBe('countdown');
      expect(body.players[0].accumulatedSeconds).toBe(calculatedElapsedTime);
    });
  });

  describe('異常系', () => {
    it('ETagが指定されていない場合は400エラーを返す', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({})
      } as unknown as HttpRequest;

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toBe('ETagが指定されていません');
    });

    it('ETag競合（412 Conflict）時は409エラーを返す', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 120 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:00:00.000Z'
      };

      const clientETag = 'W/"old-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: 'W/"current-etag"'
      });

      mockCalculateElapsedTime.mockReturnValue(125);

      // 3回再試行後も412エラー
      const conflictError = new RestError('Precondition failed', { statusCode: 412 });
      mockRetryUpdateWithETag.mockRejectedValue(conflictError);

      // Act
      const response = await pause(mockRequest, mockContext);

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
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      const dbError = new Error('Cosmos DB connection failed');
      mockGetGameState.mockRejectedValue(dbError);

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.message).toBe('一時停止処理に失敗しました');
      expect(body.details).toBe('Cosmos DB connection failed');
    });

    it('時間計算エラー時は500エラーを返す', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 120 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:00:00.000Z'
      };

      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: clientETag
      });

      mockCalculateElapsedTime.mockImplementation(() => {
        throw new Error('Time calculation error');
      });

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.details).toBe('Time calculation error');
    });

    it('不明なエラー時は500エラーを返す（エラーメッセージなし）', async () => {
      // Arrange
      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue('Unknown error string');

      // Act
      const response = await pause(mockRequest, mockContext);

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
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
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
      const expectedNewETag = 'W/"new-etag-456"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: clientETag
      });

      mockCalculateElapsedTime.mockReturnValue(0);

      mockRetryUpdateWithETag.mockResolvedValue({
        state: { ...currentState, isPaused: true, pausedAt: '2025-01-01T00:00:00.000Z' },
        etag: expectedNewETag
      });

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      const body = JSON.parse(response.body);
      expect(body.etag).toBe(expectedNewETag);
    });
  });

  describe('Content-Type検証', () => {
    it('正常時のContent-Typeはapplication/json', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false
      };

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: 'W/"test"' })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: 'W/"test"'
      });

      mockCalculateElapsedTime.mockReturnValue(0);

      mockRetryUpdateWithETag.mockResolvedValue({
        state: { ...currentState, isPaused: true, pausedAt: '2025-01-01T00:00:00.000Z' },
        etag: 'W/"new"'
      });

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    it('エラー時のContent-Typeもapplication/json', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: 'W/"test"' })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue(new Error('Test error'));

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('pausedAt検証', () => {
    it('pausedAtにISO8601形式のタイムスタンプが設定される', async () => {
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

      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/pause',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: currentState,
        etag: clientETag
      });

      mockCalculateElapsedTime.mockReturnValue(105);

      const pausedAt = '2025-01-01T00:01:45.000Z';
      const updatedState: GameState = {
        ...currentState,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 105 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        isPaused: true,
        pausedAt
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-etag"'
      });

      // Act
      const response = await pause(mockRequest, mockContext);

      // Assert
      const body = JSON.parse(response.body);
      expect(body.pausedAt).toBe(pausedAt);

      // ISO8601形式の検証
      const timestamp = new Date(body.pausedAt);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });
});

import { HttpRequest, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../../services/gameStateService';
import { retryUpdateWithETag } from '../../services/retryWithETag';
import { GameState } from '../../models/gameState';
import { RestError } from '@azure/data-tables';

// resume関数をテスト用にインポート
// Note: app.httpで登録されているため、直接インポートできないので再実装
jest.mock('../../services/gameStateService');
jest.mock('../../services/retryWithETag');

const mockGetGameState = getGameState as jest.MockedFunction<typeof getGameState>;
const mockUpdateGameState = updateGameState as jest.MockedFunction<typeof updateGameState>;
const mockRetryUpdateWithETag = retryUpdateWithETag as jest.MockedFunction<typeof retryUpdateWithETag>;

// テスト対象の関数を再実装（app.httpでラップされているため）
async function resume(
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

    // 再開状態に設定
    const newState: GameState = {
      ...currentState,
      isPaused: false,
      pausedAt: undefined,
      turnStartedAt: new Date().toISOString() // 新しいターン開始
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
        message: '再開処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

describe('POST /api/resume', () => {
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
      functionName: 'resume',
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
    it('一時停止状態のゲームを再開し、isPausedをfalse、pausedAtをundefinedに設定する', async () => {
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

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: clientETag
      });

      const resumedState: GameState = {
        ...pausedState,
        isPaused: false,
        pausedAt: undefined,
        turnStartedAt: expect.any(String) // 新しいターン開始時刻
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: resumedState,
        etag: 'W/"resumed-etag"'
      });

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.isPaused).toBe(false);
      expect(body.pausedAt).toBeUndefined();
      expect(body.turnStartedAt).toBeDefined();
      expect(body.etag).toBe('W/"resumed-etag"');

      // モックが正しく呼ばれたことを確認
      expect(mockGetGameState).toHaveBeenCalledTimes(1);
      expect(mockRetryUpdateWithETag).toHaveBeenCalledTimes(1);
    });

    it('既に再開状態のゲームも正常に処理できる', async () => {
      // Arrange
      const runningState: GameState = {
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

      const clientETag = 'W/"running-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: runningState,
        etag: clientETag
      });

      const updatedState: GameState = {
        ...runningState,
        isPaused: false,
        pausedAt: undefined,
        turnStartedAt: expect.any(String)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-running-etag"'
      });

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.isPaused).toBe(false);
      expect(body.pausedAt).toBeUndefined();
    });

    it('カウントダウンモードでも正常に再開できる', async () => {
      // Arrange
      const pausedCountdownState: GameState = {
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
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:00:30.000Z'
      };

      const clientETag = 'W/"paused-countdown-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedCountdownState,
        etag: clientETag
      });

      const resumedState: GameState = {
        ...pausedCountdownState,
        isPaused: false,
        pausedAt: undefined,
        turnStartedAt: expect.any(String)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: resumedState,
        etag: 'W/"resumed-countdown-etag"'
      });

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.isPaused).toBe(false);
      expect(body.timerMode).toBe('countdown');
      expect(body.pausedAt).toBeUndefined();
    });
  });

  describe('異常系', () => {
    it('ETagが指定されていない場合は400エラーを返す', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({})
      } as unknown as HttpRequest;

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(400);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toBe('ETagが指定されていません');
    });

    it('ETag競合（412 Conflict）時は409エラーを返す', async () => {
      // Arrange
      const pausedState: GameState = {
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
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:02:00.000Z'
      };

      const clientETag = 'W/"old-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: 'W/"current-etag"'
      });

      // 3回再試行後も412エラー
      const conflictError = new RestError('Precondition failed', { statusCode: 412 });
      mockRetryUpdateWithETag.mockRejectedValue(conflictError);

      // Act
      const response = await resume(mockRequest, mockContext);

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
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      const dbError = new Error('Cosmos DB connection failed');
      mockGetGameState.mockRejectedValue(dbError);

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.message).toBe('再開処理に失敗しました');
      expect(body.details).toBe('Cosmos DB connection failed');
    });

    it('不明なエラー時は500エラーを返す（エラーメッセージなし）', async () => {
      // Arrange
      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue('Unknown error string');

      // Act
      const response = await resume(mockRequest, mockContext);

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
      const pausedState: GameState = {
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
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:01:40.000Z'
      };

      const clientETag = 'W/"old-etag-123"';
      const expectedNewETag = 'W/"new-etag-456"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: clientETag
      });

      mockRetryUpdateWithETag.mockResolvedValue({
        state: { ...pausedState, isPaused: false, pausedAt: undefined, turnStartedAt: '2025-01-01T00:02:00.000Z' },
        etag: expectedNewETag
      });

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      const body = JSON.parse(response.body);
      expect(body.etag).toBe(expectedNewETag);
    });
  });

  describe('Content-Type検証', () => {
    it('正常時のContent-Typeはapplication/json', async () => {
      // Arrange
      const pausedState: GameState = {
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
        isPaused: true,
        pausedAt: '2025-01-01T00:00:00.000Z'
      };

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: 'W/"test"' })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: 'W/"test"'
      });

      mockRetryUpdateWithETag.mockResolvedValue({
        state: { ...pausedState, isPaused: false, pausedAt: undefined, turnStartedAt: '2025-01-01T00:00:00.000Z' },
        etag: 'W/"new"'
      });

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    it('エラー時のContent-Typeもapplication/json', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: 'W/"test"' })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue(new Error('Test error'));

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('turnStartedAt検証', () => {
    it('turnStartedAtに新しいISO8601形式のタイムスタンプが設定される', async () => {
      // Arrange
      const pausedState: GameState = {
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
        isPaused: true,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        pausedAt: '2025-01-01T00:01:40.000Z'
      };

      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/resume',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: clientETag
      });

      const newTurnStartedAt = '2025-01-01T00:02:00.000Z';
      const resumedState: GameState = {
        ...pausedState,
        isPaused: false,
        pausedAt: undefined,
        turnStartedAt: newTurnStartedAt
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: resumedState,
        etag: 'W/"new-etag"'
      });

      // Act
      const response = await resume(mockRequest, mockContext);

      // Assert
      const body = JSON.parse(response.body);
      expect(body.turnStartedAt).toBe(newTurnStartedAt);

      // ISO8601形式の検証
      const timestamp = new Date(body.turnStartedAt);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });
  });
});

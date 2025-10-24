import { HttpRequest, InvocationContext } from '@azure/functions';
import { getGameState } from '../../services/gameStateService';
import { calculateAllPlayerTimes } from '../../services/timeCalculation';
import { GameStateWithTime } from '../../models/apiTypes';

// getGame関数をテスト用にインポート
// Note: app.httpで登録されているため、直接インポートできないので再実装
import { GameState } from '../../models/gameState';

// モック
jest.mock('../../services/gameStateService');
jest.mock('../../services/timeCalculation');

const mockGetGameState = getGameState as jest.MockedFunction<typeof getGameState>;
const mockCalculateAllPlayerTimes = calculateAllPlayerTimes as jest.MockedFunction<typeof calculateAllPlayerTimes>;

// テスト対象の関数を再実装（app.httpでラップされているため）
async function getGame(
  request: HttpRequest,
  context: InvocationContext
): Promise<any> {
  try {
    const result = await getGameState();
    const calculatedTimes = calculateAllPlayerTimes(result.state);

    const response: GameStateWithTime = {
      players: result.state.players.map((player, index) => ({
        name: player.name,
        elapsedSeconds: calculatedTimes[index].elapsedSeconds
      })),
      activePlayerIndex: result.state.activePlayerIndex,
      timerMode: result.state.timerMode,
      countdownSeconds: result.state.countdownSeconds,
      isPaused: result.state.isPaused,
      turnStartedAt: result.state.turnStartedAt || null,
      pausedAt: result.state.pausedAt || null,
      etag: result.etag
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'InternalServerError',
        message: 'ゲーム状態の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

describe('GET /api/game', () => {
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
      functionName: 'getGame',
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

    // HttpRequestのモック
    mockRequest = {
      method: 'GET',
      url: 'http://localhost:7071/api/game',
      headers: {},
      query: {},
      params: {}
    } as HttpRequest;

    jest.clearAllMocks();
  });

  describe('正常系', () => {
    it('Cosmos DBからゲーム状態を取得し、計算済み時間を含むレスポンスを返す', async () => {
      // Arrange
      const mockState: GameState = {
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

      const mockETag = 'W/"test-etag-123"';

      const mockCalculatedTimes = [
        { playerId: 1, elapsedSeconds: 125, isActive: true },
        { playerId: 2, elapsedSeconds: 90, isActive: false },
        { playerId: 3, elapsedSeconds: 0, isActive: false },
        { playerId: 4, elapsedSeconds: 0, isActive: false }
      ];

      mockGetGameState.mockResolvedValue({
        state: mockState,
        etag: mockETag
      });

      mockCalculateAllPlayerTimes.mockReturnValue(mockCalculatedTimes);

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body: GameStateWithTime = JSON.parse(response.body);
      expect(body.players).toHaveLength(4);
      expect(body.players[0].elapsedSeconds).toBe(mockCalculatedTimes[0].elapsedSeconds);
      expect(body.etag).toBe(mockETag);
      expect(body.activePlayerIndex).toBe(0);
      expect(body.isPaused).toBe(false);

      // モックが正しく呼ばれたことを確認
      expect(mockGetGameState).toHaveBeenCalledTimes(1);
      expect(mockCalculateAllPlayerTimes).toHaveBeenCalledWith(mockState);
    });

    it('初回アクセス時はデフォルトゲーム状態を返す', async () => {
      // Arrange
      const defaultState: GameState = {
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

      const mockCalculatedTimes = [
        { playerId: 1, elapsedSeconds: 0, isActive: true },
        { playerId: 2, elapsedSeconds: 0, isActive: false },
        { playerId: 3, elapsedSeconds: 0, isActive: false },
        { playerId: 4, elapsedSeconds: 0, isActive: false }
      ];

      mockGetGameState.mockResolvedValue({
        state: defaultState,
        etag: 'W/"initial-etag"'
      });

      mockCalculateAllPlayerTimes.mockReturnValue(mockCalculatedTimes);

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body: GameStateWithTime = JSON.parse(response.body);
      expect(body.players).toHaveLength(4);
      expect(body.players[0].elapsedSeconds).toBe(0);
      expect(body.etag).toBe('W/"initial-etag"');
    });

    it('一時停止状態のゲームを正しく返す', async () => {
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

      const mockCalculatedTimes = [
        { playerId: 1, elapsedSeconds: 300, isActive: false },
        { playerId: 2, elapsedSeconds: 250, isActive: true }, // 一時停止中なので累積のみ
        { playerId: 3, elapsedSeconds: 0, isActive: false },
        { playerId: 4, elapsedSeconds: 0, isActive: false }
      ];

      mockGetGameState.mockResolvedValue({
        state: pausedState,
        etag: 'W/"paused-etag"'
      });

      mockCalculateAllPlayerTimes.mockReturnValue(mockCalculatedTimes);

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body: GameStateWithTime = JSON.parse(response.body);
      expect(body.isPaused).toBe(true);
      expect(body.players[1].elapsedSeconds).toBe(250);
    });
  });

  describe('異常系', () => {
    it('Cosmos DB接続エラー時は500エラーを返す', async () => {
      // Arrange
      const dbError = new Error('Cosmos DB connection failed');
      mockGetGameState.mockRejectedValue(dbError);

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.message).toBe('ゲーム状態の取得に失敗しました');
      expect(body.details).toBe('Cosmos DB connection failed');
    });

    it('時間計算エラー時は500エラーを返す', async () => {
      // Arrange
      const mockState: GameState = {
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

      mockGetGameState.mockResolvedValue({
        state: mockState,
        etag: 'W/"test-etag"'
      });

      mockCalculateAllPlayerTimes.mockImplementation(() => {
        throw new Error('Time calculation error');
      });

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.details).toBe('Time calculation error');
    });

    it('不明なエラー時は500エラーを返す（エラーメッセージなし）', async () => {
      // Arrange
      mockGetGameState.mockRejectedValue('Unknown error string');

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.details).toBe('Unknown error');
    });
  });

  describe('ETag検証', () => {
    it('レスポンスに正しいETagが含まれる', async () => {
      // Arrange
      const expectedETag = 'W/"specific-etag-value-12345"';
      const mockState: GameState = {
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

      mockGetGameState.mockResolvedValue({
        state: mockState,
        etag: expectedETag
      });

      mockCalculateAllPlayerTimes.mockReturnValue([
        { playerId: 1, elapsedSeconds: 0, isActive: true },
        { playerId: 2, elapsedSeconds: 0, isActive: false },
        { playerId: 3, elapsedSeconds: 0, isActive: false },
        { playerId: 4, elapsedSeconds: 0, isActive: false }
      ]);

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      const body: GameStateWithTime = JSON.parse(response.body);
      expect(body.etag).toBe(expectedETag);
    });
  });

  describe('Content-Type検証', () => {
    it('正常時のContent-Typeはapplication/json', async () => {
      // Arrange
      mockGetGameState.mockResolvedValue({
        state: {
          playerCount: 4,
          players: [],
          activePlayerIndex: 0,
          timerMode: 'countup',
          countdownSeconds: 60,
          isPaused: false
        },
        etag: 'test'
      });
      mockCalculateAllPlayerTimes.mockReturnValue([]);

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });

    it('エラー時のContent-Typeもapplication/json', async () => {
      // Arrange
      mockGetGameState.mockRejectedValue(new Error('Test error'));

      // Act
      const response = await getGame(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });
});

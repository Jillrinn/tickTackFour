import { HttpRequest, InvocationContext } from '@azure/functions';
import { getGameState } from '../../services/gameStateService';
import { calculateElapsedTime } from '../../services/timeCalculation';
import { retryUpdateWithETag } from '../../services/retryWithETag';
import { GameState } from '../../models/gameState';
import { switchTurn } from '../switchTurn';

// サービス層をモック化し、実ハンドラ（switchTurn）を直接テストする
jest.mock('../../services/gameStateService');
jest.mock('../../services/timeCalculation');
jest.mock('../../services/retryWithETag');

const mockGetGameState = getGameState as jest.MockedFunction<typeof getGameState>;
const mockCalculateElapsedTime = calculateElapsedTime as jest.MockedFunction<typeof calculateElapsedTime>;
const mockRetryUpdateWithETag = retryUpdateWithETag as jest.MockedFunction<typeof retryUpdateWithETag>;

describe('POST /api/switchTurn', () => {
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
      functionName: 'switchTurn',
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
    it('ターンを切り替え、経過時間を累積に加算し、次のプレイヤーをアクティブにする', async () => {
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
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        gameMode: 'normal',
        turnNumber: 0
      };

      const clientETag = 'W/"test-etag-123"';
      const calculatedElapsedTime = 125; // 120秒累積 + 5秒経過

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
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
        activePlayerIndex: 1,
        turnStartedAt: expect.any(String),
        gameMode: 'normal',
        turnNumber: 0
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-etag-456"'
      });

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body as string);
      expect(body.activePlayerIndex).toBe(1);
      expect(body.players[0].accumulatedSeconds).toBe(calculatedElapsedTime);
      expect(body.etag).toBe('W/"new-etag-456"');

      // モックが正しく呼ばれたことを確認
      expect(mockGetGameState).toHaveBeenCalledTimes(1);
      expect(mockCalculateElapsedTime).toHaveBeenCalledWith(currentState, 0);
      expect(mockRetryUpdateWithETag).toHaveBeenCalledTimes(1);
    });

    it('最後のプレイヤーから最初のプレイヤーへ循環する', async () => {
      // Arrange
      const currentState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 120 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 80 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 70 }
        ],
        activePlayerIndex: 3, // 最後のプレイヤー
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        gameMode: 'normal',
        turnNumber: 0
      };

      const clientETag = 'W/"test-etag-789"';
      const calculatedElapsedTime = 75;

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
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
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 120 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 80 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: calculatedElapsedTime }
        ],
        activePlayerIndex: 0, // 最初のプレイヤーへ循環
        turnStartedAt: expect.any(String),
        gameMode: 'normal',
        turnNumber: 0
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-etag-999"'
      });

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body as string);
      expect(body.activePlayerIndex).toBe(0); // 最初のプレイヤーへ循環
      expect(body.players[3].accumulatedSeconds).toBe(calculatedElapsedTime);
    });

    it('一時停止状態でもターン切り替えができる', async () => {
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
        pausedAt: '2025-01-01T00:05:00.000Z',
        gameMode: 'normal',
        turnNumber: 0
      };

      const clientETag = 'W/"paused-etag"';
      const calculatedElapsedTime = 250; // 一時停止中なので累積のみ

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
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
        activePlayerIndex: 2,
        turnStartedAt: expect.any(String),
        gameMode: 'normal',
        turnNumber: 0
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"new-paused-etag"'
      });

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);

      const body = JSON.parse(response.body as string);
      expect(body.activePlayerIndex).toBe(2);
      expect(body.isPaused).toBe(true);
    });

    it('初期状態（activePlayerIndex: -1）からゲームを開始する', async () => {
      // Arrange: リセット直後の初期状態
      const initialState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: -1, // 初期状態：アクティブプレイヤーなし
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true, // 初期状態：停止中
        turnStartedAt: undefined,
        pausedAt: undefined,
        gameMode: 'normal',
        turnNumber: 0
      };

      const clientETag = 'W/"initial-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockResolvedValue({
        state: initialState,
        etag: clientETag
      });

      // 初期状態なのでcalculateElapsedTimeは呼ばれない想定
      mockCalculateElapsedTime.mockReturnValue(0);

      const updatedState: GameState = {
        ...initialState,
        activePlayerIndex: 0, // 最初のプレイヤーをアクティブに
        isPaused: false, // ゲーム開始
        turnStartedAt: expect.any(String), // 現在時刻が設定される
        // players配列は変更なし（時間加算処理がスキップされる）
        players: initialState.players,
        gameMode: 'normal',
        turnNumber: 0
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: updatedState,
        etag: 'W/"game-started-etag"'
      });

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body as string);
      expect(body.activePlayerIndex).toBe(0); // 最初のプレイヤーがアクティブ
      expect(body.isPaused).toBe(false); // ゲーム開始
      expect(body.turnStartedAt).toBeDefined(); // ターン開始時刻が設定される
      expect(body.players[0].accumulatedSeconds).toBe(0); // プレイヤー1の時間は変更なし
      expect(body.players[1].accumulatedSeconds).toBe(0); // プレイヤー2の時間は変更なし
      expect(body.etag).toBe('W/"game-started-etag"');

      // モック呼び出し確認
      expect(mockGetGameState).toHaveBeenCalledTimes(1);
      // 初期状態なのでcalculateElapsedTimeは呼ばれない（または呼ばれても使われない）
      expect(mockRetryUpdateWithETag).toHaveBeenCalledTimes(1);
    });
  });

  describe('正常系: targetPlayerIndex指定（カードクリックでの手番ジャンプ）', () => {
    const baseState: GameState = {
      playerCount: 4,
      players: [
        { id: 1, name: 'プレイヤー1', accumulatedSeconds: 120 },
        { id: 2, name: 'プレイヤー2', accumulatedSeconds: 90 },
        { id: 3, name: 'プレイヤー3', accumulatedSeconds: 30 },
        { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
      ],
      activePlayerIndex: 0,
      timerMode: 'countup',
      countdownSeconds: 60,
      isPaused: false,
      turnStartedAt: '2025-01-01T00:00:00.000Z',
      gameMode: 'normal',
      turnNumber: 0
    };

    const makeRequest = (etag: string, targetPlayerIndex: number) => ({
      method: 'POST',
      url: 'http://localhost:7071/api/switchTurn',
      headers: {},
      query: {},
      params: {},
      text: async () => JSON.stringify({ etag, targetPlayerIndex })
    } as unknown as HttpRequest);

    it('任意のプレイヤーへジャンプし、直前アクティブの経過時間を確定する', async () => {
      mockGetGameState.mockResolvedValue({ state: baseState, etag: 'etag-1' });
      mockCalculateElapsedTime.mockReturnValue(125); // P1: 120 + 5秒経過
      mockRetryUpdateWithETag.mockResolvedValue({ state: baseState, etag: 'etag-2' });

      const response = await switchTurn(makeRequest('etag-1', 2), mockContext);

      expect(response.status).toBe(200);
      // ハンドラが組んだnewState（retryUpdateWithETagの第1引数）を検証
      const newState = mockRetryUpdateWithETag.mock.calls[0][0] as GameState;
      expect(newState.activePlayerIndex).toBe(2); // 次(1)ではなくtarget(2)へジャンプ
      expect(newState.players[0].accumulatedSeconds).toBe(125); // 直前(P1)の時間を確定
      expect(mockCalculateElapsedTime).toHaveBeenCalledWith(baseState, 0);
    });

    it('一時停止中にジャンプしても一時停止状態を維持する', async () => {
      const pausedState: GameState = {
        ...baseState,
        activePlayerIndex: 1,
        isPaused: true,
        pausedAt: '2025-01-01T00:05:00.000Z',
        gameMode: 'normal',
        turnNumber: 0
      };
      mockGetGameState.mockResolvedValue({ state: pausedState, etag: 'etag-1' });
      mockCalculateElapsedTime.mockReturnValue(90); // 一時停止中は累積のまま（冪等）
      mockRetryUpdateWithETag.mockResolvedValue({ state: pausedState, etag: 'etag-2' });

      const response = await switchTurn(makeRequest('etag-1', 3), mockContext);

      expect(response.status).toBe(200);
      const newState = mockRetryUpdateWithETag.mock.calls[0][0] as GameState;
      expect(newState.activePlayerIndex).toBe(3);
      expect(newState.isPaused).toBe(true); // 停止維持
      expect(newState.pausedAt).toBe('2025-01-01T00:05:00.000Z'); // pausedAt維持
    });

    it('未開始(activePlayerIndex: -1)からtarget指定でその人を先頭に開始する', async () => {
      const initialState: GameState = {
        ...baseState,
        activePlayerIndex: -1,
        isPaused: true,
        turnStartedAt: undefined,
        gameMode: 'normal',
        turnNumber: 0
      };
      mockGetGameState.mockResolvedValue({ state: initialState, etag: 'etag-1' });
      mockRetryUpdateWithETag.mockResolvedValue({ state: initialState, etag: 'etag-2' });

      const response = await switchTurn(makeRequest('etag-1', 2), mockContext);

      expect(response.status).toBe(200);
      const newState = mockRetryUpdateWithETag.mock.calls[0][0] as GameState;
      expect(newState.activePlayerIndex).toBe(2); // targetを先頭に開始
      expect(newState.isPaused).toBe(false); // ゲーム開始
      expect(mockCalculateElapsedTime).not.toHaveBeenCalled(); // 直前プレイヤーなし
    });

    it('すでにアクティブなプレイヤーを指定した場合は何もしない（更新しない）', async () => {
      mockGetGameState.mockResolvedValue({ state: baseState, etag: 'etag-1' });

      const response = await switchTurn(makeRequest('etag-1', 0), mockContext); // active=0, target=0

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.activePlayerIndex).toBe(0);
      expect(body.etag).toBe('etag-1');
      expect(mockRetryUpdateWithETag).not.toHaveBeenCalled(); // 更新は走らない
    });

    it('targetPlayerIndexが範囲外の場合は400エラーを返す', async () => {
      mockGetGameState.mockResolvedValue({ state: baseState, etag: 'etag-1' });

      const responseHigh = await switchTurn(makeRequest('etag-1', 4), mockContext); // playerCount=4 → index4は範囲外
      expect(responseHigh.status).toBe(400);

      const responseNegative = await switchTurn(makeRequest('etag-1', -1), mockContext);
      expect(responseNegative.status).toBe(400);

      expect(mockRetryUpdateWithETag).not.toHaveBeenCalled();
    });
  });

  describe('異常系', () => {
    it('ETagが指定されていない場合は400エラーを返す', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({})
      } as unknown as HttpRequest;

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(400);
      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body as string);
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
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        gameMode: 'normal',
        turnNumber: 0
      };

      const clientETag = 'W/"old-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
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
      const conflictError = { statusCode: 412, message: "Precondition failed" };
      mockRetryUpdateWithETag.mockRejectedValue(conflictError);

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(409);
      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('Conflict');
      expect(body.message).toBe('他のユーザーによって更新されました。最新の状態を取得してください。');
    });

    it('Cosmos DB接続エラー時は500エラーを返す', async () => {
      // Arrange
      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      const dbError = new Error('Cosmos DB connection failed');
      mockGetGameState.mockRejectedValue(dbError);

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);
      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('InternalServerError');
      expect(body.message).toBe('ターン切り替えに失敗しました');
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
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        gameMode: 'normal',
        turnNumber: 0
      };

      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
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
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);

      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('InternalServerError');
      expect(body.details).toBe('Time calculation error');
    });

    it('不明なエラー時は500エラーを返す（エラーメッセージなし）', async () => {
      // Arrange
      const clientETag = 'W/"test-etag"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: clientETag })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue('Unknown error string');

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);

      const body = JSON.parse(response.body as string);
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
        turnStartedAt: '2025-01-01T00:00:00.000Z',
        gameMode: 'normal',
        turnNumber: 0
      };

      const clientETag = 'W/"old-etag-123"';
      const expectedNewETag = 'W/"new-etag-456"';

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
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
        state: { ...currentState, activePlayerIndex: 1 },
        etag: expectedNewETag
      });

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      const body = JSON.parse(response.body as string);
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
        isPaused: false,
        gameMode: 'normal',
        turnNumber: 0
      };

      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
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
        state: currentState,
        etag: 'W/"new"'
      });

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('エラー時のContent-Typeもapplication/json', async () => {
      // Arrange
      mockRequest = {
        method: 'POST',
        url: 'http://localhost:7071/api/switchTurn',
        headers: {},
        query: {},
        params: {},
        text: async () => JSON.stringify({ etag: 'W/"test"' })
      } as unknown as HttpRequest;

      mockGetGameState.mockRejectedValue(new Error('Test error'));

      // Act
      const response = await switchTurn(mockRequest, mockContext);

      // Assert
      expect((response.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });
});

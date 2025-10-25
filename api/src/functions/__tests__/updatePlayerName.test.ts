import { app, HttpRequest, InvocationContext } from '@azure/functions';
import * as gameStateService from '../../services/gameStateService';
import * as retryService from '../../services/retryWithETag';
import { GameState } from '../../models/gameState';
import { updatePlayerName } from '../updatePlayerName';

describe('updatePlayerName API', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      invocationId: 'test-id',
      functionName: 'updatePlayerName',
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

    // モックをリセット
    jest.clearAllMocks();
  });

  describe('正常系', () => {
    test('プレイヤー名更新成功（200 OK）', async () => {
      // Arrange: モックデータ準備
      const initialState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: -1,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true
      };

      const expectedState: GameState = {
        ...initialState,
        players: [
          { id: 1, name: 'Alice', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ]
      };

      // サービス層のモック
      jest.spyOn(gameStateService, 'getGameState').mockResolvedValue({
        state: initialState,
        etag: 'test-etag-001'
      });

      jest.spyOn(retryService, 'retryUpdateWithETag').mockResolvedValue({
        state: expectedState,
        etag: 'test-etag-002'
      });

      // Act: リクエスト作成と実行
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'test-etag-001'
        },
        body: {
          string: JSON.stringify({
            playerIndex: 0,
            name: 'Alice'
          })
        }
      });

      // Act: 実際の関数を呼び出す
      const response = await updatePlayerName(request, mockContext);

      // Assert: レスポンスを検証
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players[0].name).toBe('Alice');
      expect(body.etag).toBe('test-etag-002');

      // サービス層の呼び出しを確認
      expect(gameStateService.getGameState).toHaveBeenCalled();
      expect(retryService.retryUpdateWithETag).toHaveBeenCalled();
    });
  });

  describe('異常系: バリデーションエラー（400 Bad Request）', () => {
    test('playerIndexが範囲外（負の値）', async () => {
      // Arrange
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'test-etag'
        },
        body: {
          string: JSON.stringify({
            playerIndex: -1,
            name: 'Alice'
          })
        }
      });

      const initialState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: -1,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true
      };

      jest.spyOn(gameStateService, 'getGameState').mockResolvedValue({
        state: initialState,
        etag: 'test-etag'
      });

      // Act & Assert
      const response = await updatePlayerName(request, mockContext);
      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('playerIndex');
    });

    test('playerIndexが範囲外（players.length以上）', async () => {
      // Arrange
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'test-etag'
        },
        body: {
          string: JSON.stringify({
            playerIndex: 5,
            name: 'Alice'
          })
        }
      });

      const initialState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: -1,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true
      };

      jest.spyOn(gameStateService, 'getGameState').mockResolvedValue({
        state: initialState,
        etag: 'test-etag'
      });

      // Act & Assert
      const response = await updatePlayerName(request, mockContext);
      expect(response.status).toBe(400);
    });

    test('nameが空文字', async () => {
      // Arrange
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'test-etag'
        },
        body: {
          string: JSON.stringify({
            playerIndex: 0,
            name: ''
          })
        }
      });

      // Act & Assert
      const response = await updatePlayerName(request, mockContext);
      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.message).toContain('name');
    });

    test('nameが101文字（上限超過）', async () => {
      // Arrange
      const longName = 'A'.repeat(101);
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'test-etag'
        },
        body: {
          string: JSON.stringify({
            playerIndex: 0,
            name: longName
          })
        }
      });

      // Act & Assert
      const response = await updatePlayerName(request, mockContext);
      expect(response.status).toBe(400);
    });

    test('If-Matchヘッダーが未指定', async () => {
      // Arrange
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json'
          // If-Matchヘッダーなし
        },
        body: {
          string: JSON.stringify({
            playerIndex: 0,
            name: 'Alice'
          })
        }
      });

      // Act & Assert
      const response = await updatePlayerName(request, mockContext);
      expect(response.status).toBe(400);
      // const body = JSON.parse(response.body as string);
      // expect(body.message).toContain('If-Match');
    });
  });

  describe('異常系: ETag競合（409 Conflict）', () => {
    test('ETag不一致時に409 Conflictを返す', async () => {
      // Arrange
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'old-etag'
        },
        body: {
          string: JSON.stringify({
            playerIndex: 0,
            name: 'Alice'
          })
        }
      });

      const initialState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: -1,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true
      };

      jest.spyOn(gameStateService, 'getGameState').mockResolvedValue({
        state: initialState,
        etag: 'test-etag'
      });

      // 412 Precondition Failedエラーをシミュレート
      const error412 = new Error('Precondition Failed');
      (error412 as any).statusCode = 412;
      jest.spyOn(retryService, 'retryUpdateWithETag').mockRejectedValue(error412);

      // Act & Assert
      const response = await updatePlayerName(request, mockContext);
      expect(response.status).toBe(409);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('Conflict');
    });
  });

  describe('異常系: サーバーエラー（500 Internal Server Error）', () => {
    test('Cosmos DBエラー時に500を返す', async () => {
      // Arrange
      const request = new HttpRequest({
        method: 'PUT',
        url: 'http://localhost:7071/api/updatePlayerName',
        headers: {
          'Content-Type': 'application/json',
          'If-Match': 'test-etag'
        },
        body: {
          string: JSON.stringify({
            playerIndex: 0,
            name: 'Alice'
          })
        }
      });

      // Cosmos DBエラーをシミュレート
      jest.spyOn(gameStateService, 'getGameState').mockRejectedValue(new Error('Cosmos DB connection failed'));

      // Act & Assert
      const response = await updatePlayerName(request, mockContext);
      expect(response.status).toBe(500);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('InternalServerError');
    });
  });
});

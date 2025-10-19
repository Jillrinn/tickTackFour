import { TableClient, RestError } from '@azure/data-tables';
import { getGameState, createGameState, updateGameState } from '../gameStateService';
import { GameState, GameStateEntity } from '../../models/gameState';

// TableClientのモック
jest.mock('../cosmosClient', () => ({
  getTableClient: jest.fn(() => mockTableClient)
}));

const mockTableClient = {
  getEntity: jest.fn(),
  createEntity: jest.fn(),
  updateEntity: jest.fn()
} as unknown as TableClient;

describe('GameStateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGameState', () => {
    it('既存のゲーム状態が存在する場合、それを返す', async () => {
      // Arrange
      const mockEntity: GameStateEntity = {
        partitionKey: 'game',
        rowKey: 'default',
        etag: 'test-etag',
        timestamp: new Date(),
        playerCount: 4,
        players: JSON.stringify([
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 10 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ]),
        activePlayerIndex: 1,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:00:00.000Z'
      };

      (mockTableClient.getEntity as jest.Mock).mockResolvedValue(mockEntity);

      // Act
      const result = await getGameState();

      // Assert
      expect(mockTableClient.getEntity).toHaveBeenCalledWith('game', 'default');
      expect(result.state.playerCount).toBe(4);
      expect(result.state.players).toHaveLength(4);
      expect(result.state.players[0].accumulatedSeconds).toBe(10);
      expect(result.state.activePlayerIndex).toBe(1);
      expect(result.etag).toBe('test-etag');
    });

    it('ゲーム状態が存在しない場合、デフォルト状態を作成して返す', async () => {
      // Arrange
      const notFoundError = new RestError('Not Found', { statusCode: 404 });
      (mockTableClient.getEntity as jest.Mock).mockRejectedValue(notFoundError);

      const mockCreatedEntity: GameStateEntity = {
        partitionKey: 'game',
        rowKey: 'default',
        etag: 'new-etag',
        timestamp: new Date(),
        playerCount: 4,
        players: JSON.stringify([
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ]),
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: expect.any(String)
      };

      (mockTableClient.createEntity as jest.Mock).mockResolvedValue({ etag: 'new-etag' });

      // Act
      const result = await getGameState();

      // Assert
      expect(mockTableClient.getEntity).toHaveBeenCalledWith('game', 'default');
      expect(mockTableClient.createEntity).toHaveBeenCalled();
      expect(result.state.playerCount).toBe(4);
      expect(result.state.players).toHaveLength(4);
      expect(result.state.players[0].accumulatedSeconds).toBe(0);
      expect(result.state.activePlayerIndex).toBe(0);
      expect(result.etag).toBe('new-etag');
    });

    it('予期しないエラーが発生した場合、エラーをスローする', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected error');
      (mockTableClient.getEntity as jest.Mock).mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(getGameState()).rejects.toThrow('Unexpected error');
    });
  });

  describe('createGameState', () => {
    it('デフォルトゲーム状態を作成する', async () => {
      // Arrange
      (mockTableClient.createEntity as jest.Mock).mockResolvedValue({ etag: 'created-etag' });

      // Act
      const result = await createGameState();

      // Assert
      expect(mockTableClient.createEntity).toHaveBeenCalled();
      const calledEntity = (mockTableClient.createEntity as jest.Mock).mock.calls[0][0];
      expect(calledEntity.partitionKey).toBe('game');
      expect(calledEntity.rowKey).toBe('default');
      expect(calledEntity.playerCount).toBe(4);
      expect(JSON.parse(calledEntity.players)).toHaveLength(4);
      expect(result.etag).toBe('created-etag');
    });
  });

  describe('updateGameState', () => {
    it('ETagを使用してゲーム状態を更新する', async () => {
      // Arrange
      const updatedState: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 2,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: '2025-01-01T00:01:00.000Z'
      };

      (mockTableClient.updateEntity as jest.Mock).mockResolvedValue({ etag: 'updated-etag' });

      // Act
      const result = await updateGameState(updatedState, 'old-etag');

      // Assert
      expect(mockTableClient.updateEntity).toHaveBeenCalled();
      const calledEntity = (mockTableClient.updateEntity as jest.Mock).mock.calls[0][0];
      const calledMode = (mockTableClient.updateEntity as jest.Mock).mock.calls[0][1];
      const calledOptions = (mockTableClient.updateEntity as jest.Mock).mock.calls[0][2];

      expect(calledEntity.partitionKey).toBe('game');
      expect(calledEntity.rowKey).toBe('default');
      expect(JSON.parse(calledEntity.players)[0].accumulatedSeconds).toBe(30);
      expect(calledEntity.activePlayerIndex).toBe(2);
      expect(calledMode).toBe('Replace');
      expect(calledOptions.etag).toBe('old-etag');
      expect(result.etag).toBe('updated-etag');
    });

    it('プレイヤー配列のJSON文字列化が正しく動作する', async () => {
      // Arrange
      const stateWithPlayers: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'テスト1', accumulatedSeconds: 100 },
          { id: 2, name: 'テスト2', accumulatedSeconds: 200 },
          { id: 3, name: 'テスト3', accumulatedSeconds: 300 },
          { id: 4, name: 'テスト4', accumulatedSeconds: 400 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countdown',
        countdownSeconds: 120,
        isPaused: true,
        pausedAt: '2025-01-01T00:02:00.000Z'
      };

      (mockTableClient.updateEntity as jest.Mock).mockResolvedValue({ etag: 'json-etag' });

      // Act
      await updateGameState(stateWithPlayers, 'test-etag');

      // Assert
      const calledEntity = (mockTableClient.updateEntity as jest.Mock).mock.calls[0][0];
      const parsedPlayers = JSON.parse(calledEntity.players);

      expect(parsedPlayers).toHaveLength(4);
      expect(parsedPlayers[0].name).toBe('テスト1');
      expect(parsedPlayers[0].accumulatedSeconds).toBe(100);
      expect(parsedPlayers[3].accumulatedSeconds).toBe(400);
    });
  });
});

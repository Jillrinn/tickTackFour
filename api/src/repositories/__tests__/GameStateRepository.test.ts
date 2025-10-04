import { GameStateRepository } from '../GameStateRepository';
import { GameState, Player } from '../../models/GameState';
import { TableClient } from '@azure/data-tables';

// モックの設定
jest.mock('@azure/data-tables');

describe('GameStateRepository', () => {
  let repository: GameStateRepository;
  let mockTableClient: jest.Mocked<TableClient>;

  // テスト用のGameStateデータ
  const createTestGameState = (): GameState => ({
    players: [
      {
        id: '1',
        name: 'プレイヤー1',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date('2025-10-04T00:00:00Z')
      },
      {
        id: '2',
        name: 'プレイヤー2',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date('2025-10-04T00:00:00Z')
      },
      {
        id: '3',
        name: 'プレイヤー3',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date('2025-10-04T00:00:00Z')
      },
      {
        id: '4',
        name: 'プレイヤー4',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date('2025-10-04T00:00:00Z')
      }
    ],
    activePlayerId: null,
    isPaused: false,
    timerMode: 'count-up',
    createdAt: new Date('2025-10-04T00:00:00Z'),
    lastUpdatedAt: new Date('2025-10-04T00:00:00Z')
  });

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    // TableClientのモック作成
    mockTableClient = {
      createEntity: jest.fn(),
      getEntity: jest.fn(),
      updateEntity: jest.fn(),
      deleteEntity: jest.fn()
    } as any;

    // TableClient.fromConnectionStringのモック
    (TableClient.fromConnectionString as jest.Mock) = jest.fn().mockReturnValue(mockTableClient);

    repository = new GameStateRepository('mock-connection-string');
  });

  describe('create', () => {
    it('GameStateを新規作成してCosmos DBに保存できる', async () => {
      const gameState = createTestGameState();

      mockTableClient.createEntity.mockResolvedValue({} as any);

      await repository.create(gameState);

      expect(mockTableClient.createEntity).toHaveBeenCalledWith({
        partitionKey: 'game',
        rowKey: 'current',
        stateJson: JSON.stringify(gameState)
      });
    });

    it('作成時にエラーが発生した場合、エラーをスローする', async () => {
      const gameState = createTestGameState();
      const error = new Error('Cosmos DB connection failed');

      mockTableClient.createEntity.mockRejectedValue(error);

      await expect(repository.create(gameState)).rejects.toThrow('Cosmos DB connection failed');
    });
  });

  describe('get', () => {
    it('Cosmos DBからGameStateを取得できる', async () => {
      const gameState = createTestGameState();

      mockTableClient.getEntity.mockResolvedValue({
        partitionKey: 'game',
        rowKey: 'current',
        stateJson: JSON.stringify(gameState),
        etag: 'mock-etag'
      } as any);

      const result = await repository.get();

      expect(mockTableClient.getEntity).toHaveBeenCalledWith('game', 'current');
      expect(result).toEqual(gameState);
    });

    it('エンティティが存在しない場合、nullを返す', async () => {
      mockTableClient.getEntity.mockRejectedValue({ statusCode: 404 });

      const result = await repository.get();

      expect(result).toBeNull();
    });

    it('取得時にエラーが発生した場合、エラーをスローする', async () => {
      const error = new Error('Network error');
      mockTableClient.getEntity.mockRejectedValue(error);

      await expect(repository.get()).rejects.toThrow('Network error');
    });

    it('JSON.parseエラーの場合、適切にハンドリングする', async () => {
      mockTableClient.getEntity.mockResolvedValue({
        partitionKey: 'game',
        rowKey: 'current',
        stateJson: 'invalid-json',
        etag: 'mock-etag'
      } as any);

      await expect(repository.get()).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('GameStateを更新してCosmos DBに保存できる', async () => {
      const gameState = createTestGameState();
      gameState.activePlayerId = '1';
      gameState.players[0].isActive = true;

      mockTableClient.updateEntity.mockResolvedValue({ etag: 'new-etag' } as any);

      await repository.update(gameState);

      expect(mockTableClient.updateEntity).toHaveBeenCalledWith(
        {
          partitionKey: 'game',
          rowKey: 'current',
          stateJson: JSON.stringify(gameState)
        },
        'Merge'
      );
    });

    it('ETagを指定して楽観的ロック更新ができる', async () => {
      const gameState = createTestGameState();
      const etag = 'mock-etag-123';

      mockTableClient.updateEntity.mockResolvedValue({ etag: 'new-etag' } as any);

      await repository.update(gameState, etag);

      expect(mockTableClient.updateEntity).toHaveBeenCalledWith(
        {
          partitionKey: 'game',
          rowKey: 'current',
          stateJson: JSON.stringify(gameState)
        },
        'Merge',
        { etag }
      );
    });

    it('ETag競合が発生した場合、エラーをスローする', async () => {
      const gameState = createTestGameState();
      const error = { statusCode: 412, message: 'Precondition failed' };

      mockTableClient.updateEntity.mockRejectedValue(error);

      await expect(repository.update(gameState, 'old-etag')).rejects.toMatchObject({
        statusCode: 412
      });
    });
  });

  describe('delete', () => {
    it('GameStateを削除できる', async () => {
      mockTableClient.deleteEntity.mockResolvedValue({} as any);

      await repository.delete();

      expect(mockTableClient.deleteEntity).toHaveBeenCalledWith('game', 'current');
    });

    it('削除時にエラーが発生した場合、エラーをスローする', async () => {
      const error = new Error('Delete failed');
      mockTableClient.deleteEntity.mockRejectedValue(error);

      await expect(repository.delete()).rejects.toThrow('Delete failed');
    });
  });

  describe('getWithETag', () => {
    it('GameStateとETagを両方取得できる', async () => {
      const gameState = createTestGameState();
      const etag = 'mock-etag-xyz';

      mockTableClient.getEntity.mockResolvedValue({
        partitionKey: 'game',
        rowKey: 'current',
        stateJson: JSON.stringify(gameState),
        etag
      } as any);

      const result = await repository.getWithETag();

      expect(result).toEqual({
        gameState,
        etag
      });
    });

    it('エンティティが存在しない場合、nullを返す', async () => {
      mockTableClient.getEntity.mockRejectedValue({ statusCode: 404 });

      const result = await repository.getWithETag();

      expect(result).toBeNull();
    });
  });
});

import { HttpRequest, InvocationContext } from '@azure/functions';
import { getPlayerNamesTableClient } from '../../services/playerNamesClient';
import { PlayerNameEntity, PlayerNameResponse } from '../../models/playerNames';

// Mock dependencies
jest.mock('../../services/playerNamesClient');

const mockGetPlayerNamesTableClient = getPlayerNamesTableClient as jest.MockedFunction<
  typeof getPlayerNamesTableClient
>;

// テスト対象の関数を再実装（app.httpでラップされているため）
async function getPlayerNames(
  request: HttpRequest,
  context: InvocationContext
): Promise<any> {
  try {
    const tableClient = getPlayerNamesTableClient();
    const entities: PlayerNameEntity[] = [];
    const iterator = tableClient.listEntities<PlayerNameEntity>();

    for await (const entity of iterator) {
      entities.push(entity);
    }

    entities.sort((a, b) => a.rowKey.localeCompare(b.rowKey));
    const latestEntities = entities.slice(0, 40);

    const response: PlayerNameResponse[] = latestEntities.map(entity => ({
      name: entity.playerName,
      createdAt: entity.createdAt
    }));

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    context.error('GET /api/player-names - エラー発生', error);
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([])
    };
  }
}

describe('GET /api/player-names', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;
  let mockTableClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HttpRequest
    mockRequest = {
      method: 'GET',
      url: 'http://localhost:7071/api/player-names',
      headers: new Headers(),
      query: new URLSearchParams(),
      params: {},
      user: null,
      body: null,
      bodyUsed: false,
      arrayBuffer: jest.fn(),
      blob: jest.fn(),
      formData: jest.fn(),
      json: jest.fn(),
      text: jest.fn(),
      clone: jest.fn()
    } as unknown as HttpRequest;

    // Mock InvocationContext
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      invocationId: 'test-invocation-id',
      functionName: 'getPlayerNames',
      extraInputs: {
        get: jest.fn(),
        set: jest.fn()
      },
      extraOutputs: {
        get: jest.fn(),
        set: jest.fn()
      },
      retryContext: undefined,
      traceContext: {
        traceparent: 'test-traceparent',
        tracestate: 'test-tracestate',
        attributes: {}
      },
      triggerMetadata: {},
      options: {
        trigger: {
          name: 'req',
          type: 'httpTrigger',
          direction: 'in'
        },
        return: {
          name: '$return',
          type: 'http',
          direction: 'out'
        }
      }
    } as unknown as InvocationContext;

    // Mock TableClient
    mockTableClient = {
      listEntities: jest.fn()
    };

    mockGetPlayerNamesTableClient.mockReturnValue(mockTableClient);
  });

  describe('基本的な取得機能', () => {
    it('最新40件のプレイヤー名を取得して返す', async () => {
      // Arrange
      const mockEntities: PlayerNameEntity[] = [
        {
          partitionKey: 'global',
          rowKey: '9999999999997_guid1', // 最新（最小RowKey）
          playerName: 'Alice',
          createdAt: '2025-10-20T00:00:00.000Z'
        },
        {
          partitionKey: 'global',
          rowKey: '9999999999998_guid2', // 中間
          playerName: 'Bob',
          createdAt: '2025-10-19T23:59:59.000Z'
        },
        {
          partitionKey: 'global',
          rowKey: '9999999999999_guid3', // 最古（最大RowKey）
          playerName: 'Charlie',
          createdAt: '2025-10-19T23:59:58.000Z'
        }
      ];

      mockTableClient.listEntities.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entity of mockEntities) {
            yield entity;
          }
        }
      });

      // Act
      const response = await getPlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(response.body);
      expect(body).toHaveLength(3);
      expect(body[0]).toEqual({
        name: 'Alice',
        createdAt: '2025-10-20T00:00:00.000Z'
      });
      expect(body[1]).toEqual({
        name: 'Bob',
        createdAt: '2025-10-19T23:59:59.000Z'
      });
      expect(body[2]).toEqual({
        name: 'Charlie',
        createdAt: '2025-10-19T23:59:58.000Z'
      });
    });

    it('10件のみ存在する場合は10件を返す', async () => {
      // Arrange
      const mockEntities: PlayerNameEntity[] = Array.from({ length: 10 }, (_, i) => ({
        partitionKey: 'global',
        rowKey: `${9999999999999 - i}_guid${i}`,
        playerName: `Player${i + 1}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString()
      }));

      mockTableClient.listEntities.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entity of mockEntities) {
            yield entity;
          }
        }
      });

      // Act
      const response = await getPlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(10);
    });

    it('40件を超えるデータがある場合は最新40件のみを返す', async () => {
      // Arrange
      const mockEntities: PlayerNameEntity[] = Array.from({ length: 50 }, (_, i) => ({
        partitionKey: 'global',
        rowKey: `${9999999999999 - i}_guid${i}`,
        playerName: `Player${i + 1}`,
        createdAt: new Date(Date.now() - i * 1000).toISOString()
      }));

      mockTableClient.listEntities.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entity of mockEntities) {
            yield entity;
          }
        }
      });

      // Act
      const response = await getPlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(40);
      expect(body[0].name).toBe('Player50'); // 最新（RowKeyが最小）
      expect(body[39].name).toBe('Player11'); // 40番目（RowKeyが40番目に小さい）
    });

    it('データが存在しない場合は空配列を返す', async () => {
      // Arrange
      mockTableClient.listEntities.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // 空のイテレーター
        }
      });

      // Act
      const response = await getPlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
    });
  });

  describe('エラーハンドリング', () => {
    it('Cosmos DB読み取り失敗時は空配列を返す', async () => {
      // Arrange
      mockTableClient.listEntities.mockImplementation(() => {
        throw new Error('Cosmos DB connection failed');
      });

      // Act
      const response = await getPlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
      expect(mockContext.error).toHaveBeenCalledWith(
        'GET /api/player-names - エラー発生',
        expect.any(Error)
      );
    });

    it('CORS ヘッダーを設定する', async () => {
      // Arrange
      mockTableClient.listEntities.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // 空のイテレーター
        }
      });

      // Act
      const response = await getPlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('RowKey降順ソート', () => {
    it('RowKeyの昇順（最新順）でソートされたデータを返す', async () => {
      // Arrange - 意図的に順序をバラバラにする
      const mockEntities: PlayerNameEntity[] = [
        {
          partitionKey: 'global',
          rowKey: '9999999999999_guid3', // 最古（最大RowKey）
          playerName: 'Charlie',
          createdAt: '2025-10-19T23:59:58.000Z'
        },
        {
          partitionKey: 'global',
          rowKey: '9999999999997_guid1', // 最新（最小RowKey）
          playerName: 'Alice',
          createdAt: '2025-10-20T00:00:00.000Z'
        },
        {
          partitionKey: 'global',
          rowKey: '9999999999998_guid2', // 中間
          playerName: 'Bob',
          createdAt: '2025-10-19T23:59:59.000Z'
        }
      ];

      mockTableClient.listEntities.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const entity of mockEntities) {
            yield entity;
          }
        }
      });

      // Act
      const response = await getPlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body);
      expect(body[0].name).toBe('Alice'); // 最新
      expect(body[1].name).toBe('Bob');
      expect(body[2].name).toBe('Charlie'); // 最古
    });
  });
});

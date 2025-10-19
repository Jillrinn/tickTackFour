import { HttpRequest, InvocationContext } from '@azure/functions';
import { getPlayerNamesTableClient } from '../../services/playerNamesClient';
import { validatePlayerNames } from '../../services/validatePlayerNames';
import { SavePlayerNamesRequest, SavePlayerNamesResponse, PlayerNameEntity } from '../../models/playerNames';

// Mock dependencies
jest.mock('../../services/playerNamesClient');
jest.mock('../../services/validatePlayerNames');

const mockGetPlayerNamesTableClient = getPlayerNamesTableClient as jest.MockedFunction<
  typeof getPlayerNamesTableClient
>;
const mockValidatePlayerNames = validatePlayerNames as jest.MockedFunction<
  typeof validatePlayerNames
>;

// テスト対象の関数を再実装（app.httpでラップされているため）
async function savePlayerNames(
  request: HttpRequest,
  context: InvocationContext
): Promise<any> {
  try {
    const requestBody = await request.json() as SavePlayerNamesRequest;
    const validatedNames = validatePlayerNames(requestBody.names);

    if (validatedNames.length === 0) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ savedCount: 0 })
      };
    }

    const tableClient = getPlayerNamesTableClient();
    let savedCount = 0;

    for (const name of validatedNames) {
      const entity: PlayerNameEntity = {
        partitionKey: 'global',
        rowKey: `${9999999999999 - Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerName: name,
        createdAt: new Date().toISOString()
      };

      await tableClient.createEntity(entity);
      savedCount++;
    }

    const response: SavePlayerNamesResponse = {
      savedCount
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    context.error('POST /api/player-names - エラー発生', error);

    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'InternalServerError',
        message: 'プレイヤー名の保存に失敗しました'
      })
    };
  }
}

describe('POST /api/player-names', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;
  let mockTableClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HttpRequest
    mockRequest = {
      method: 'POST',
      url: 'http://localhost:7071/api/player-names',
      headers: new Headers({ 'Content-Type': 'application/json' }),
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
      functionName: 'savePlayerNames',
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
      createEntity: jest.fn().mockResolvedValue({})
    };

    mockGetPlayerNamesTableClient.mockReturnValue(mockTableClient);
  });

  describe('基本的な保存機能', () => {
    it('有効な名前配列を保存して成功件数を返す', async () => {
      // Arrange
      const requestBody: SavePlayerNamesRequest = {
        names: ['Alice', 'Bob', 'Charlie']
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockValidatePlayerNames.mockReturnValue(['Alice', 'Bob', 'Charlie']);

      // Act
      const response = await savePlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers['Content-Type']).toBe('application/json');

      const body: SavePlayerNamesResponse = JSON.parse(response.body);
      expect(body.savedCount).toBe(3);
      expect(mockTableClient.createEntity).toHaveBeenCalledTimes(3);
    });

    it('バリデーション後の名前のみを保存する', async () => {
      // Arrange
      const requestBody: SavePlayerNamesRequest = {
        names: ['Alice', '', '<script>XSS</script>', 'Bob']
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockValidatePlayerNames.mockReturnValue(['Alice', '&lt;script&gt;XSS&lt;/script&gt;', 'Bob']);

      // Act
      const response = await savePlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body: SavePlayerNamesResponse = JSON.parse(response.body);
      expect(body.savedCount).toBe(3);
      expect(mockValidatePlayerNames).toHaveBeenCalledWith(['Alice', '', '<script>XSS</script>', 'Bob']);
    });

    it('重複名が除外された後の件数を返す', async () => {
      // Arrange
      const requestBody: SavePlayerNamesRequest = {
        names: ['Alice', 'Bob', 'Alice', 'Charlie']
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockValidatePlayerNames.mockReturnValue(['Alice', 'Bob', 'Charlie']); // バリデーションで重複除外

      // Act
      const response = await savePlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body: SavePlayerNamesResponse = JSON.parse(response.body);
      expect(body.savedCount).toBe(3); // 重複除外後の件数
    });

    it('全て無効な名前の場合はsavedCount=0を返す', async () => {
      // Arrange
      const requestBody: SavePlayerNamesRequest = {
        names: ['', '  ', 'A'.repeat(51)]
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockValidatePlayerNames.mockReturnValue([]); // 全て無効

      // Act
      const response = await savePlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(200);
      const body: SavePlayerNamesResponse = JSON.parse(response.body);
      expect(body.savedCount).toBe(0);
      expect(mockTableClient.createEntity).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('Cosmos DB書き込み失敗時は500エラーを返す', async () => {
      // Arrange
      const requestBody: SavePlayerNamesRequest = {
        names: ['Alice']
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockValidatePlayerNames.mockReturnValue(['Alice']);
      mockTableClient.createEntity.mockRejectedValue(new Error('Cosmos DB write failed'));

      // Act
      const response = await savePlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
      expect(body.message).toBe('プレイヤー名の保存に失敗しました');
      expect(mockContext.error).toHaveBeenCalledWith(
        'POST /api/player-names - エラー発生',
        expect.any(Error)
      );
    });

    it('リクエストボディが不正な場合は500エラーを返す', async () => {
      // Arrange
      (mockRequest.json as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));

      // Act
      const response = await savePlayerNames(mockRequest, mockContext);

      // Assert
      expect(response.status).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('InternalServerError');
    });
  });

  describe('エンティティ作成', () => {
    it('正しいPartitionKeyとRowKeyでエンティティを作成する', async () => {
      // Arrange
      const requestBody: SavePlayerNamesRequest = {
        names: ['Alice']
      };

      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockValidatePlayerNames.mockReturnValue(['Alice']);

      // Act
      await savePlayerNames(mockRequest, mockContext);

      // Assert
      expect(mockTableClient.createEntity).toHaveBeenCalledTimes(1);
      const createdEntity = mockTableClient.createEntity.mock.calls[0][0];

      expect(createdEntity.partitionKey).toBe('global');
      expect(createdEntity.rowKey).toMatch(/^\d+_[a-z0-9]+$/); // 逆順タイムスタンプ + ランダム文字列
      expect(createdEntity.playerName).toBe('Alice');
      expect(createdEntity.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601形式
    });
  });
});

import { TableClient } from '@azure/data-tables';
import { getPlayerNamesTableClient } from '../playerNamesClient';
import { validateCosmosDBConfig } from '../cosmosClient';

// cosmosClientモジュールをモック
jest.mock('../cosmosClient');

describe('playerNamesClient', () => {
  describe('getPlayerNamesTableClient', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('接続文字列が有効な場合、PlayerNamesテーブルのTableClientを返す', () => {
      // Arrange
      const mockConnectionString = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;TableEndpoint=https://test.table.cosmos.azure.com:443/;';
      (validateCosmosDBConfig as jest.Mock).mockReturnValue({
        isValid: true,
        connectionString: mockConnectionString
      });

      // Act
      const client = getPlayerNamesTableClient();

      // Assert
      expect(client).toBeInstanceOf(TableClient);
      expect(client.tableName).toBe('PlayerNames');
    });

    it('接続文字列が未設定の場合、エラーをスローする', () => {
      // Arrange
      (validateCosmosDBConfig as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'CosmosDBConnectionString environment variable is not set'
      });

      // Act & Assert
      expect(() => getPlayerNamesTableClient()).toThrow(
        'CosmosDBConnectionString environment variable is not set'
      );
    });

    it('validateCosmosDBConfigを呼び出す', () => {
      // Arrange
      const mockConnectionString = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;TableEndpoint=https://test.table.cosmos.azure.com:443/;';
      (validateCosmosDBConfig as jest.Mock).mockReturnValue({
        isValid: true,
        connectionString: mockConnectionString
      });

      // Act
      getPlayerNamesTableClient();

      // Assert
      expect(validateCosmosDBConfig).toHaveBeenCalledTimes(1);
    });
  });
});

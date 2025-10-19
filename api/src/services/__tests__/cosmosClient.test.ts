import { getTableClient, validateCosmosDBConfig } from '../cosmosClient';

describe('Cosmos DB Client', () => {
  describe('validateCosmosDBConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('接続文字列が設定されている場合、有効と判定する', () => {
      process.env.CosmosDBConnectionString = 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=testkey==';

      const result = validateCosmosDBConfig();

      expect(result.isValid).toBe(true);
      expect(result.connectionString).toBe(process.env.CosmosDBConnectionString);
      expect(result.error).toBeUndefined();
    });

    it('接続文字列が未設定の場合、無効と判定しエラーメッセージを返す', () => {
      delete process.env.CosmosDBConnectionString;

      const result = validateCosmosDBConfig();

      expect(result.isValid).toBe(false);
      expect(result.connectionString).toBeUndefined();
      expect(result.error).toBe('CosmosDBConnectionString environment variable is not set');
    });

    it('接続文字列が空文字列の場合、無効と判定しエラーメッセージを返す', () => {
      process.env.CosmosDBConnectionString = '';

      const result = validateCosmosDBConfig();

      expect(result.isValid).toBe(false);
      expect(result.connectionString).toBeUndefined();
      expect(result.error).toBe('CosmosDBConnectionString environment variable is not set');
    });
  });

  describe('getTableClient', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('有効な接続文字列が設定されている場合、TableClientを返す', () => {
      // 有効な形式のモック接続文字列（実際のCosmos DBに接続しない）
      process.env.CosmosDBConnectionString = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdGtleQ==;TableEndpoint=https://test.table.cosmos.azure.com:443/';

      const client = getTableClient();

      expect(client).toBeDefined();
      expect(client.tableName).toBe('GameState');
    });

    it('接続文字列が未設定の場合、エラーをスローする', () => {
      delete process.env.CosmosDBConnectionString;

      expect(() => getTableClient()).toThrow('CosmosDBConnectionString environment variable is not set');
    });

    it('接続文字列が空文字列の場合、エラーをスローする', () => {
      process.env.CosmosDBConnectionString = '';

      expect(() => getTableClient()).toThrow('CosmosDBConnectionString environment variable is not set');
    });
  });
});

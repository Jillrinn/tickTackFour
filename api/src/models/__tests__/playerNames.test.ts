import {
  PlayerNameEntity,
  PlayerNameResponse,
  SavePlayerNamesRequest,
  SavePlayerNamesResponse,
  generateRowKey
} from '../playerNames';

describe('playerNames models', () => {
  describe('generateRowKey', () => {
    it('逆順タイムスタンプ + GU IDのRowKeyを生成する', () => {
      // Act
      const rowKey = generateRowKey();

      // Assert
      expect(rowKey).toMatch(/^\d+_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('逆順タイムスタンプが現在時刻より小さいことを確認', () => {
      // Arrange
      const now = Date.now();
      const maxReversedTimestamp = 9999999999999;

      // Act
      const rowKey = generateRowKey();
      const reversedTimestamp = parseInt(rowKey.split('_')[0], 10);

      // Assert
      expect(reversedTimestamp).toBeLessThanOrEqual(maxReversedTimestamp - now);
      expect(reversedTimestamp).toBeGreaterThan(0);
    });

    it('連続呼び出しでユニークなRowKeyを生成する', () => {
      // Act
      const rowKey1 = generateRowKey();
      const rowKey2 = generateRowKey();
      const rowKey3 = generateRowKey();

      // Assert
      expect(rowKey1).not.toBe(rowKey2);
      expect(rowKey2).not.toBe(rowKey3);
      expect(rowKey1).not.toBe(rowKey3);
    });

    it('生成されたRowKeyが降順ソート可能であることを確認', async () => {
      // Act
      const rowKeys: string[] = [];
      for (let i = 0; i < 3; i++) {
        rowKeys.push(generateRowKey());
        // 異なるタイムスタンプを保証するため1ms待機
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Assert - 逆順タイムスタンプなので、後で生成されたものほどRowKeyは小さい（文字列として）
      // つまり、昇順ソートすると新しいものが先頭に来る
      const timestamps = rowKeys.map(rk => parseInt(rk.split('_')[0], 10));
      expect(timestamps[2]).toBeLessThan(timestamps[1]);
      expect(timestamps[1]).toBeLessThan(timestamps[0]);
    });
  });

  describe('型定義の構造', () => {
    it('PlayerNameEntity型が正しいフィールドを持つ', () => {
      // Arrange
      const entity: PlayerNameEntity = {
        partitionKey: 'global',
        rowKey: generateRowKey(),
        playerName: 'Alice',
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
        etag: 'W/"datetime\'2025-10-19T12%3A34%3A56.789Z\'"'
      };

      // Assert
      expect(entity.partitionKey).toBe('global');
      expect(entity.rowKey).toMatch(/^\d+_[0-9a-f-]+$/);
      expect(entity.playerName).toBe('Alice');
      expect(entity.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('PlayerNameResponse型が正しいフィールドを持つ', () => {
      // Arrange
      const response: PlayerNameResponse = {
        name: 'Bob',
        createdAt: '2025-10-19T12:34:56.789Z'
      };

      // Assert
      expect(response.name).toBe('Bob');
      expect(response.createdAt).toBe('2025-10-19T12:34:56.789Z');
    });

    it('SavePlayerNamesRequest型が正しいフィールドを持つ', () => {
      // Arrange
      const request: SavePlayerNamesRequest = {
        names: ['Alice', 'Bob', 'Charlie']
      };

      // Assert
      expect(request.names).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(Array.isArray(request.names)).toBe(true);
    });

    it('SavePlayerNamesResponse型が正しいフィールドを持つ', () => {
      // Arrange
      const response: SavePlayerNamesResponse = {
        savedCount: 3
      };

      // Assert
      expect(response.savedCount).toBe(3);
      expect(typeof response.savedCount).toBe('number');
    });
  });
});

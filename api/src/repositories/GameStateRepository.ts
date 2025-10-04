import { TableClient } from '@azure/data-tables';
import { GameState, GameStateEntity } from '../models/GameState';

/**
 * Cosmos DB Table APIを使用したGameStateの永続化リポジトリ
 * PartitionKey: "game", RowKey: "current" の単一エンティティで管理
 */
export class GameStateRepository {
  private tableClient: TableClient;
  private readonly PARTITION_KEY = 'game';
  private readonly ROW_KEY = 'current';

  constructor(connectionString: string) {
    this.tableClient = TableClient.fromConnectionString(
      connectionString,
      'gameState'
    );
  }

  /**
   * 新規GameStateを作成してCosmos DBに保存
   */
  async create(gameState: GameState): Promise<void> {
    const entity: GameStateEntity = {
      partitionKey: this.PARTITION_KEY,
      rowKey: this.ROW_KEY,
      stateJson: JSON.stringify(gameState)
    };

    await this.tableClient.createEntity(entity);
  }

  /**
   * Cosmos DBからGameStateを取得
   * @returns GameState または null（存在しない場合）
   */
  async get(): Promise<GameState | null> {
    try {
      const entity = await this.tableClient.getEntity<GameStateEntity>(
        this.PARTITION_KEY,
        this.ROW_KEY
      );

      return this.deserializeGameState(entity.stateJson);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * JSON文字列からGameStateを復元（Date型の復元含む）
   */
  private deserializeGameState(json: string): GameState {
    const parsed = JSON.parse(json);

    // Date型の復元
    parsed.createdAt = new Date(parsed.createdAt);
    parsed.lastUpdatedAt = new Date(parsed.lastUpdatedAt);
    parsed.players = parsed.players.map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt)
    }));

    return parsed;
  }

  /**
   * GameStateを更新してCosmos DBに保存
   * @param gameState 更新するGameState
   * @param etag ETag（楽観的ロック用、省略可）
   */
  async update(gameState: GameState, etag?: string): Promise<void> {
    const entity: GameStateEntity = {
      partitionKey: this.PARTITION_KEY,
      rowKey: this.ROW_KEY,
      stateJson: JSON.stringify(gameState)
    };

    if (etag) {
      await this.tableClient.updateEntity(entity, 'Merge', { etag });
    } else {
      await this.tableClient.updateEntity(entity, 'Merge');
    }
  }

  /**
   * GameStateを削除
   */
  async delete(): Promise<void> {
    await this.tableClient.deleteEntity(this.PARTITION_KEY, this.ROW_KEY);
  }

  /**
   * GameStateとETagを両方取得（楽観的ロック用）
   * @returns GameStateとETag、または null（存在しない場合）
   */
  async getWithETag(): Promise<{ gameState: GameState; etag: string } | null> {
    try {
      const entity = await this.tableClient.getEntity<GameStateEntity>(
        this.PARTITION_KEY,
        this.ROW_KEY
      );

      return {
        gameState: this.deserializeGameState(entity.stateJson),
        etag: entity.etag || ''
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}

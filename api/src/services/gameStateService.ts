import { RestError } from '@azure/data-tables';
import { getTableClient } from './cosmosClient';
import {
  GameState,
  GameStateEntity,
  createDefaultGameState,
  toEntity,
  fromEntity
} from '../models/gameState';

/**
 * ゲーム状態取得結果
 */
export interface GameStateResult {
  state: GameState;
  etag: string;
}

/**
 * ゲーム状態を取得（存在しない場合はデフォルト状態を作成）
 */
export async function getGameState(): Promise<GameStateResult> {
  const client = getTableClient();

  try {
    // 既存のゲーム状態を取得
    const entity = await client.getEntity<GameStateEntity>('game', 'default');

    return {
      state: fromEntity(entity),
      etag: entity.etag || ''
    };
  } catch (error) {
    // 404エラーの場合は新規作成
    if (error instanceof RestError && error.statusCode === 404) {
      const result = await createGameState();
      return result;
    }

    // その他のエラーは再スロー
    throw error;
  }
}

/**
 * デフォルトゲーム状態を作成
 */
export async function createGameState(): Promise<GameStateResult> {
  const client = getTableClient();
  const defaultState = createDefaultGameState();
  const entity = toEntity(defaultState);

  const response = await client.createEntity(entity);

  return {
    state: defaultState,
    etag: response.etag || ''
  };
}

/**
 * ゲーム状態を更新（ETag楽観的ロック）
 */
export async function updateGameState(
  state: GameState,
  etag: string
): Promise<GameStateResult> {
  const client = getTableClient();
  const entity = toEntity(state);

  const response = await client.updateEntity(entity, 'Replace', { etag });

  return {
    state,
    etag: response.etag || ''
  };
}

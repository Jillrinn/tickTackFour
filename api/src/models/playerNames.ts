import { randomUUID } from 'crypto';

/**
 * Cosmos DB PlayerNamesテーブルのエンティティ型
 */
export interface PlayerNameEntity {
  /** パーティションキー（固定値: "global"） */
  partitionKey: string;
  /** 行キー（逆順タイムスタンプ + GUID） */
  rowKey: string;
  /** プレイヤー名（1-50文字、サニタイズ済み） */
  playerName: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** Cosmos DB自動生成タイムスタンプ */
  timestamp?: Date;
  /** Cosmos DB自動生成ETag */
  etag?: string;
}

/**
 * GET /api/player-names レスポンス型
 */
export interface PlayerNameResponse {
  /** プレイヤー名 */
  name: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
}

/**
 * POST /api/player-names リクエスト型
 */
export interface SavePlayerNamesRequest {
  /** プレイヤー名配列（デフォルト名除外済み） */
  names: string[];
}

/**
 * POST /api/player-names レスポンス型
 */
export interface SavePlayerNamesResponse {
  /** 実際に保存された件数（重複除外後） */
  savedCount: number;
}

/**
 * RowKey生成関数
 *
 * 逆順タイムスタンプ + GUIDの形式でRowKeyを生成します。
 * 逆順タイムスタンプにより、RowKeyの昇順ソートで最新のエンティティが先頭に来ます。
 *
 * @returns {string} RowKey（例: "8274031043210_a1b2c3d4-e5f6-7890-abcd-ef1234567890"）
 */
export function generateRowKey(): string {
  const now = Date.now();
  const reversedTimestamp = 9999999999999 - now;  // 逆順ソート用
  const guid = randomUUID();
  return `${reversedTimestamp}_${guid}`;
}

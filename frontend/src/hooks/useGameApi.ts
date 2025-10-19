import { useCallback } from 'react';
import type { GameStateWithTime } from '../types/GameState';

/**
 * 汎用更新リクエストのパラメータ
 */
export interface UpdateGameParams {
  playerCount?: number;
  timerMode?: 'count-up' | 'count-down';
  countdownSeconds?: number;
  players?: Array<{ name: string; elapsedSeconds: number }>;
}

/**
 * 412 Conflictエラー型
 *
 * Requirements: 3.4, 6.3
 * - 3回再試行後の失敗検出
 * - ユーザーフレンドリーなエラーメッセージ表示
 * - 手動リロード促進メッセージとボタン
 */
export interface ConflictError {
  type: 'conflict';
  message: string;
  action: 'reload';
}

/**
 * API呼び出し結果型
 */
export type ApiResult = GameStateWithTime | ConflictError | null;

/**
 * ゲームAPI呼び出し用のカスタムフック
 *
 * Requirements: 1.3, 1.5.8, 4.1-4.6
 * - ターン切り替えボタンクリック時にPOST /api/switchTurn送信
 * - 一時停止ボタンクリック時にPOST /api/pause送信
 * - 再開ボタンクリック時にPOST /api/resume送信
 * - リセットボタンクリック時にPOST /api/reset送信
 * - プレイヤー数/モード変更時にPOST /api/updateGame送信
 * - リクエストにETagを含める（経過時間は含めない）
 *
 * @returns API呼び出し関数群
 */
export function useGameApi() {
  /**
   * ターン切り替えAPI呼び出し
   * POST /api/switchTurn
   *
   * @param etag - 現在のETag
   * @returns 更新されたゲーム状態、またはConflictError、またはエラー時null
   */
  const switchTurn = useCallback(async (etag: string): Promise<ApiResult> => {
    try {
      const response = await fetch('/api/switchTurn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag })
      });

      if (!response.ok) {
        // 412 Precondition Failed検出（Cosmos DBの楽観的ロック競合時のステータスコード）
        if (response.status === 412) {
          const errorData = await response.json().catch(() => ({ error: 'Conflict occurred' }));
          const errorMessage = errorData.error || 'Update failed due to conflicts';
          console.error('Conflict detected (412):', {
            endpoint: '/api/switchTurn',
            status: response.status,
            message: errorMessage
          });
          return {
            type: 'conflict',
            message: errorMessage,
            action: 'reload'
          };
        }

        console.error(`Failed to switch turn: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error switching turn:', error);
      return null;
    }
  }, []);

  /**
   * 一時停止API呼び出し
   * POST /api/pause
   *
   * @param etag - 現在のETag
   * @returns 更新されたゲーム状態、またはConflictError、またはエラー時null
   */
  const pauseGame = useCallback(async (etag: string): Promise<ApiResult> => {
    try {
      const response = await fetch('/api/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag })
      });

      if (!response.ok) {
        // 412 Precondition Failed検出（Cosmos DBの楽観的ロック競合時のステータスコード）
        if (response.status === 412) {
          const errorData = await response.json().catch(() => ({ error: 'Conflict occurred' }));
          const errorMessage = errorData.error || 'Update failed due to conflicts';
          console.error('Conflict detected (412):', {
            endpoint: '/api/pause',
            status: response.status,
            message: errorMessage
          });
          return {
            type: 'conflict',
            message: errorMessage,
            action: 'reload'
          };
        }

        console.error(`Failed to pause game: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error pausing game:', error);
      return null;
    }
  }, []);

  /**
   * 再開API呼び出し
   * POST /api/resume
   *
   * @param etag - 現在のETag
   * @returns 更新されたゲーム状態、またはConflictError、またはエラー時null
   */
  const resumeGame = useCallback(async (etag: string): Promise<ApiResult> => {
    try {
      const response = await fetch('/api/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag })
      });

      if (!response.ok) {
        // 412 Precondition Failed検出（Cosmos DBの楽観的ロック競合時のステータスコード）
        if (response.status === 412) {
          const errorData = await response.json().catch(() => ({ error: 'Conflict occurred' }));
          const errorMessage = errorData.error || 'Update failed due to conflicts';
          console.error('Conflict detected (412):', {
            endpoint: '/api/resume',
            status: response.status,
            message: errorMessage
          });
          return {
            type: 'conflict',
            message: errorMessage,
            action: 'reload'
          };
        }

        console.error(`Failed to resume game: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error resuming game:', error);
      return null;
    }
  }, []);

  /**
   * リセットAPI呼び出し
   * POST /api/reset
   *
   * @param etag - 現在のETag
   * @returns 更新されたゲーム状態、またはConflictError、またはエラー時null
   */
  const resetGame = useCallback(async (etag: string): Promise<ApiResult> => {
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag })
      });

      if (!response.ok) {
        // 412 Precondition Failed検出（Cosmos DBの楽観的ロック競合時のステータスコード）
        if (response.status === 412) {
          const errorData = await response.json().catch(() => ({ error: 'Conflict occurred' }));
          const errorMessage = errorData.error || 'Update failed due to conflicts';
          console.error('Conflict detected (412):', {
            endpoint: '/api/reset',
            status: response.status,
            message: errorMessage
          });
          return {
            type: 'conflict',
            message: errorMessage,
            action: 'reload'
          };
        }

        console.error(`Failed to reset game: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error resetting game:', error);
      return null;
    }
  }, []);

  /**
   * 汎用更新API呼び出し
   * POST /api/updateGame
   *
   * @param etag - 現在のETag
   * @param params - 更新パラメータ（プレイヤー数、タイマーモード、プレイヤー名等）
   * @returns 更新されたゲーム状態、またはConflictError、またはエラー時null
   */
  const updateGame = useCallback(
    async (etag: string, params: UpdateGameParams): Promise<ApiResult> => {
      try {
        const response = await fetch('/api/updateGame', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            etag,
            ...params
          })
        });

        if (!response.ok) {
          // 412 Precondition Failed検出（Cosmos DBの楽観的ロック競合時のステータスコード）
          if (response.status === 412) {
            const errorData = await response.json().catch(() => ({ error: 'Conflict occurred' }));
            const errorMessage = errorData.error || 'Update failed due to conflicts';
            console.error('Conflict detected (412):', {
              endpoint: '/api/updateGame',
              status: response.status,
              message: errorMessage
            });
            return {
              type: 'conflict',
              message: errorMessage,
              action: 'reload'
            };
          }

          console.error(`Failed to update game: ${response.status} ${response.statusText}`);
          return null;
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating game:', error);
        return null;
      }
    },
    []
  );

  return {
    switchTurn,
    pauseGame,
    resumeGame,
    resetGame,
    updateGame
  };
}

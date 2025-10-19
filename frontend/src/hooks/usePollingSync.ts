import { useEffect, useRef } from 'react';
import type { GameStateWithTime } from '../types/GameState';

/**
 * ポーリング同期のオプション
 */
export interface UsePollingSyncOptions {
  enabled?: boolean; // ポーリングの有効化/無効化（デフォルト: true）
  interval?: number; // ポーリング間隔（ミリ秒、デフォルト: 5000）
}

/**
 * 5秒間隔でバックエンドからゲーム状態を取得するカスタムフック
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 * - 5秒ごとにGET /api/gameを呼び出す
 * - レスポンスからGameStateWithTimeを取得してコールバックを実行
 * - アンマウント時にクリーンアップ（clearInterval）
 * - ポーリングエラー時も継続処理を行う
 *
 * @param onUpdate - ゲーム状態更新時のコールバック
 * @param options - ポーリングのオプション
 */
export function usePollingSync(
  onUpdate: (state: GameStateWithTime) => void,
  options: UsePollingSyncOptions = {}
): void {
  const { enabled = true, interval = 5000 } = options;
  const onUpdateRef = useRef(onUpdate);

  // コールバック関数の最新版を保持
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    /**
     * ゲーム状態を取得してコールバックを実行
     */
    const fetchGameState = async (): Promise<void> => {
      try {
        const response = await fetch('/api/game');

        if (!response.ok) {
          console.error(`Failed to fetch game state: ${response.status} ${response.statusText}`);
          return;
        }

        const state: GameStateWithTime = await response.json();
        onUpdateRef.current(state);
      } catch (error) {
        console.error('Error fetching game state:', error);
        // エラー時も次回ポーリングを継続（何もしない）
      }
    };

    // 初回即座に実行
    fetchGameState();

    // 定期的にポーリング
    const intervalId = setInterval(fetchGameState, interval);

    // クリーンアップ
    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, interval]);
}

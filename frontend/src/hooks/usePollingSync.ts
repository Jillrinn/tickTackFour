import { useEffect, useRef, useState } from 'react';
import type { GameStateWithTime } from '../types/GameState';

/**
 * エラー情報の型定義
 */
export interface PollingErrorInfo {
  type: 'consecutive_failures'; // エラーの種類
  count: number; // 連続失敗回数
  lastError: Error; // 最後のエラー
}

/**
 * ポーリング同期のオプション
 */
export interface UsePollingSyncOptions {
  enabled?: boolean; // ポーリングの有効化/無効化（デフォルト: true）
  interval?: number; // ポーリング間隔（ミリ秒、デフォルト: 5000）
  onError?: (errorInfo: PollingErrorInfo) => void; // 連続失敗時のコールバック
}

/**
 * 5秒間隔でバックエンドからゲーム状態を取得するカスタムフック
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 4.4
 * - 5秒ごとにGET /api/gameを呼び出す
 * - レスポンスからGameStateWithTimeを取得してコールバックを実行
 * - アンマウント時にクリーンアップ（clearInterval）
 * - ポーリングエラー時も継続処理を行う
 * - 連続3回失敗時にonErrorコールバックを呼び出す
 * - 成功時に失敗カウントをリセット
 *
 * @param onUpdate - ゲーム状態更新時のコールバック
 * @param options - ポーリングのオプション
 */
export function usePollingSync(
  onUpdate: (state: GameStateWithTime) => void,
  options: UsePollingSyncOptions = {}
): void {
  const { enabled = true, interval = 5000, onError } = options;
  const onUpdateRef = useRef(onUpdate);
  const onErrorRef = useRef(onError);
  const [, setConsecutiveFailures] = useState<number>(0);
  const lastErrorRef = useRef<Error | null>(null);

  // コールバック関数の最新版を保持
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

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
          const error = new Error(`Failed to fetch game state: ${response.status} ${response.statusText}`);
          console.error(error.message);
          lastErrorRef.current = error;

          // 失敗カウントを増やす
          setConsecutiveFailures(prev => {
            const newCount = prev + 1;
            // 3回連続失敗時にonErrorコールバックを呼び出す
            if (newCount === 3 && onErrorRef.current) {
              onErrorRef.current({
                type: 'consecutive_failures',
                count: newCount,
                lastError: error
              });
            }
            // 3回ごとにカウントをリセット（4回目から再度カウント開始）
            return newCount >= 3 ? 0 : newCount;
          });
          return;
        }

        const state: GameStateWithTime = await response.json();

        // 成功時は失敗カウントをリセット
        setConsecutiveFailures(0);
        lastErrorRef.current = null;

        onUpdateRef.current(state);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        console.error('Error fetching game state:', err);
        lastErrorRef.current = err;

        // 失敗カウントを増やす
        setConsecutiveFailures(prev => {
          const newCount = prev + 1;
          // 3回連続失敗時にonErrorコールバックを呼び出す
          if (newCount === 3 && onErrorRef.current) {
            onErrorRef.current({
              type: 'consecutive_failures',
              count: newCount,
              lastError: err
            });
          }
          // 3回ごとにカウントをリセット（4回目から再度カウント開始）
          return newCount >= 3 ? 0 : newCount;
        });
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

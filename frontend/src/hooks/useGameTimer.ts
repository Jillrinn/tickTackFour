import { useEffect, useRef } from 'react';
import type { GameState } from '../types/GameState';

/**
 * タイマーティックのコールバック型
 * @param playerId - プレイヤーID
 * @param newElapsedTime - 新しい経過時間（秒）
 */
export type TimerTickCallback = (playerId: string, newElapsedTime: number) => void;

/**
 * サーバー同期のコールバック型
 * @param playerId - プレイヤーID
 * @param elapsedTime - 経過時間（秒）
 */
export type ServerSyncCallback = (playerId: string, elapsedTime: number) => void;

/**
 * 時間切れのコールバック型
 * @param playerId - プレイヤーID
 */
export type TimeExpiredCallback = (playerId: string) => void;

/**
 * クライアントサイドタイマーロジックのカスタムフック
 *
 * 機能:
 * - 1秒ごとのタイマー更新（カウントアップ/カウントダウン）
 * - 5秒ごとのサーバー同期
 * - カウントダウンモードでの時間切れ検出
 * - 一時停止状態の処理
 *
 * @param gameState - ゲーム状態
 * @param onTimerTick - 1秒ごとのタイマー更新コールバック
 * @param onServerSync - 5秒ごとのサーバー同期コールバック（オプション）
 * @param onTimeExpired - 時間切れコールバック（オプション）
 */
export function useGameTimer(
  gameState: GameState,
  onTimerTick: TimerTickCallback,
  onServerSync?: ServerSyncCallback,
  onTimeExpired?: TimeExpiredCallback
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const syncCounterRef = useRef(0);
  const currentElapsedTimeRef = useRef<number>(0);

  useEffect(() => {
    // アクティブプレイヤーを取得
    const activePlayer = gameState.players.find(p => p.id === gameState.activePlayerId);

    // タイマー実行条件をチェック
    if (!activePlayer || gameState.isPaused || activePlayer.elapsedTimeSeconds === 0 && gameState.timerMode === 'count-down') {
      // タイマーをクリア
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      syncCounterRef.current = 0;
      return;
    }

    // 現在の経過時間を記録
    currentElapsedTimeRef.current = activePlayer.elapsedTimeSeconds;

    // 1秒ごとのタイマー
    timerRef.current = setInterval(() => {
      const currentPlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
      if (!currentPlayer) return;

      let newElapsedTime: number;

      if (gameState.timerMode === 'count-up') {
        // カウントアップモード: 経過時間を増やす
        newElapsedTime = currentElapsedTimeRef.current + 1;
      } else {
        // カウントダウンモード: 残り時間を減らす
        newElapsedTime = Math.max(0, currentElapsedTimeRef.current - 1);
      }

      // 経過時間を更新
      currentElapsedTimeRef.current = newElapsedTime;
      onTimerTick(currentPlayer.id, newElapsedTime);

      // カウントダウンモードで時間切れ検出
      if (gameState.timerMode === 'count-down' && newElapsedTime === 0) {
        if (onTimeExpired) {
          onTimeExpired(currentPlayer.id);
        }
        // タイマー停止
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      // 5秒ごとのサーバー同期
      syncCounterRef.current++;
      if (syncCounterRef.current >= 5 && onServerSync) {
        onServerSync(currentPlayer.id, newElapsedTime);
        syncCounterRef.current = 0;
      }
    }, 1000);

    // クリーンアップ
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState, onTimerTick, onServerSync, onTimeExpired]);
}

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useServerTimeDisplayのオプション
 */
export interface UseServerTimeDisplayOptions {
  isPaused?: boolean; // 一時停止状態（デフォルト: false）
  activePlayerId?: string | null; // アクティブプレイヤーID（変更検出用）
}

/**
 * useServerTimeDisplayの戻り値
 */
export interface UseServerTimeDisplayResult {
  serverTime: number; // サーバーから取得した基準時間（秒）
  displayTime: number; // 表示用時間（秒、小数点あり）
  lastSyncTime: number; // 最終同期時刻（Date.now()）
  updateServerTime: (newServerTime: number) => void; // サーバー時間更新関数
}

/**
 * バックエンド計算済み時間の表示ロジック実装
 *
 * Requirements: 1.5.7, 3.2
 * - サーバー時間（serverTime）をuseStateで管理
 * - 最終同期時刻（lastSyncTime）を記録
 * - 表示用ローカルタイマー（100ms間隔）で滑らかなUI更新
 * - 一時停止時はserverTimeのみ表示（ローカル補間なし）
 * - アクティブプレイヤー切替時の時間リセット処理
 *
 * @param options - 一時停止状態とアクティブプレイヤーID
 * @returns サーバー時間、表示時間、最終同期時刻、更新関数
 */
export function useServerTimeDisplay(
  options: UseServerTimeDisplayOptions = {}
): UseServerTimeDisplayResult {
  const { isPaused = false, activePlayerId = null } = options;

  // サーバー時間（バックエンドから取得した基準値）
  const [serverTime, setServerTime] = useState(0);

  // 表示用時間（滑らかなUI更新用）
  const [displayTime, setDisplayTime] = useState(0);

  // 最終同期時刻（サーバー時間取得時のタイムスタンプ）
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  // 表示用タイマーのクリーンアップ用ref
  const displayTimerRef = useRef<number | null>(null);

  /**
   * サーバー時間を更新し、最終同期時刻を記録
   */
  const updateServerTime = useCallback((newServerTime: number) => {
    const now = Date.now();
    setServerTime(newServerTime);
    setLastSyncTime(now);
    setDisplayTime(newServerTime);
  }, []);

  /**
   * 表示用ローカルタイマー（100ms間隔で滑らかな更新）
   */
  useEffect(() => {
    // タイマーをクリア
    if (displayTimerRef.current !== null) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }

    if (isPaused) {
      // 一時停止中はserverTimeのみ表示
      setDisplayTime(serverTime);
      return;
    }

    // アクティブ時は100ms間隔で表示時間を更新
    displayTimerRef.current = setInterval(() => {
      const localElapsed = (Date.now() - lastSyncTime) / 1000; // ミリ秒→秒
      setDisplayTime(serverTime + localElapsed);
    }, 100);

    // クリーンアップ
    return () => {
      if (displayTimerRef.current !== null) {
        clearInterval(displayTimerRef.current);
        displayTimerRef.current = null;
      }
    };
  }, [serverTime, lastSyncTime, isPaused]);

  /**
   * アクティブプレイヤー切り替え時に表示時間をリセット
   */
  useEffect(() => {
    // activePlayerIdが変更されたら、現在のserverTimeで表示時間をリセット
    setDisplayTime(serverTime);
  }, [activePlayerId, serverTime]);

  return {
    serverTime,
    displayTime,
    lastSyncTime,
    updateServerTime
  };
}

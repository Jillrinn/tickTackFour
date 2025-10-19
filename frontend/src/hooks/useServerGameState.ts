import { useState, useEffect, useCallback } from 'react';
import type { GameStateWithTime } from '../types/GameState';

/**
 * サーバー状態管理用hook（Phase 2 API連携専用）
 *
 * Requirements: multiplayer-sync Phase 2
 * - design.md lines 402-436のserverTime/displayTimeパターンを実装
 * - ポーリングで取得したGameStateWithTimeを管理
 * - アクティブプレイヤーの滑らかなタイマー表示
 *
 * 設計書準拠実装:
 * ```typescript
 * // バックエンドから計算済み時間を取得し、ローカルタイマーの基準とする
 * const [serverTime, setServerTime] = useState(0);     // バックエンド計算の経過時間
 * const [displayTime, setDisplayTime] = useState(0);   // 表示用時間（滑らか）
 * const [lastSyncTime, setLastSyncTime] = useState(Date.now());
 *
 * // 5秒ごとにバックエンドから最新状態を取得
 * useEffect(() => {
 *   const intervalId = setInterval(async () => {
 *     const response = await fetch('/api/game');
 *     const state = await response.json();
 *     const serverElapsed = state.players[activePlayerIndex].elapsedSeconds;
 *     setServerTime(serverElapsed);
 *     setLastSyncTime(Date.now());
 *   }, 5000);
 *   return () => clearInterval(intervalId);
 * }, [activePlayerIndex]);
 *
 * // 表示用ローカルタイマー（滑らかなUI更新のみ）
 * useEffect(() => {
 *   const displayTimer = setInterval(() => {
 *     if (!isPaused) {
 *       const localElapsed = (Date.now() - lastSyncTime) / 1000;
 *       setDisplayTime(serverTime + localElapsed);
 *     } else {
 *       setDisplayTime(serverTime);
 *     }
 *   }, 100);
 *   return () => clearInterval(displayTimer);
 * }, [serverTime, lastSyncTime, isPaused]);
 * ```
 */
export function useServerGameState() {
  // サーバー状態（ポーリングで更新）
  const [serverState, setServerState] = useState<GameStateWithTime | null>(null);

  // 設計書準拠: serverTime/displayTimeパターン（design.md lines 404-406）
  const [serverTime, setServerTime] = useState(0);     // バックエンド計算の経過時間
  const [displayTime, setDisplayTime] = useState(0);   // 表示用時間（滑らか）
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  /**
   * ポーリングコールバックで状態更新
   * GameTimer.tsxのusePollingSync内から呼び出される
   *
   * design.md lines 410-421の実装
   */
  const updateFromServer = useCallback((state: GameStateWithTime) => {
    setServerState(state);

    // アクティブプレイヤーの経過時間を基準に設定
    if (state.activePlayerIndex !== -1) {
      const serverElapsed = state.players[state.activePlayerIndex]?.elapsedSeconds || 0;
      setServerTime(serverElapsed);
      setLastSyncTime(Date.now());
    }
  }, []);

  /**
   * 表示用ローカルタイマー（100msごとに滑らか更新）
   * design.md lines 424-436の実装
   *
   * 一時停止中: serverTimeのみ表示（ローカル補間なし）
   * 非一時停止中: serverTime + (現在時刻 - 最終同期時刻) / 1000
   */
  useEffect(() => {
    if (!serverState) return;

    const displayTimer = setInterval(() => {
      if (!serverState.isPaused && serverState.activePlayerIndex !== -1) {
        const localElapsed = (Date.now() - lastSyncTime) / 1000;
        setDisplayTime(serverTime + localElapsed);
      } else {
        setDisplayTime(serverTime);
      }
    }, 100);  // 100msごとに更新（滑らかな表示）

    return () => clearInterval(displayTimer);
  }, [serverState, serverTime, lastSyncTime]);

  /**
   * UI用のヘルパー関数
   * MM:SS形式にフォーマット
   */
  const formatTime = useCallback((seconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  /**
   * 最長時間プレイヤーを取得（カウントアップモード専用）
   *
   * Requirements: top-time-player-indicator
   * - カウントアップモードのみ表示
   * - 全員0秒の場合は非表示
   * - 同点の場合は最初に見つかったプレイヤーを返す
   */
  const getLongestTimePlayer = useCallback(() => {
    if (!serverState || serverState.timerMode !== 'count-up') return null;

    const maxSeconds = Math.max(...serverState.players.map(p => p.elapsedSeconds));
    if (maxSeconds === 0) return null;

    const longestPlayerIndex = serverState.players.findIndex(p => p.elapsedSeconds === maxSeconds);
    if (longestPlayerIndex === -1) return null;

    return {
      ...serverState.players[longestPlayerIndex],
      index: longestPlayerIndex
    };
  }, [serverState]);

  return {
    serverState,
    displayTime,
    updateFromServer,
    formatTime,
    getLongestTimePlayer
  };
}

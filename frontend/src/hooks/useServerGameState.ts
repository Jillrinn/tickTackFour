import { useState, useEffect, useCallback, useRef } from 'react';
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

  // ターン時間表示用の状態（displayTimeと同じパターン）
  const [turnDisplayTime, setTurnDisplayTime] = useState(0);   // ターン時間表示用（滑らか）

  /**
   * ポーリングコールバックで状態更新
   * GameTimer.tsxのusePollingSync内から呼び出される
   *
   * design.md lines 410-421の実装
   *
   * @param state - サーバーから取得した最新のゲーム状態
   * @param editingPlayerIndex - 現在編集中のプレイヤーのインデックス（編集中でない場合はnull）
   */
  const updateFromServer = useCallback((state: GameStateWithTime, editingPlayerIndex: number | null = null) => {
    // 編集中のプレイヤー名を保持する
    if (editingPlayerIndex !== null && serverState) {
      const editingPlayerName = serverState.players[editingPlayerIndex]?.name;
      if (editingPlayerName !== undefined) {
        // 編集中のプレイヤー名は上書きせず、現在のローカル値を保持
        const updatedPlayers = [...state.players];
        updatedPlayers[editingPlayerIndex] = {
          ...updatedPlayers[editingPlayerIndex],
          name: editingPlayerName
        };
        state = { ...state, players: updatedPlayers };
      }
    }

    setServerState(state);

    // アクティブプレイヤーの経過時間を基準に設定
    if (state.activePlayerIndex !== -1) {
      const serverElapsed = state.players[state.activePlayerIndex]?.elapsedSeconds || 0;
      setServerTime(serverElapsed);
      setLastSyncTime(Date.now());
    }
  }, [serverState]);

  /**
   * 統合タイマー: displayTimeとturnDisplayTimeを同一のsetIntervalで更新
   *
   * 要件: 秒が切り替わる瞬間を完全に同期させる
   * - 2つの独立したsetIntervalは異なるタイミングで発火する
   * - 単一のsetIntervalで両方を更新することで、同じDate.now()を使用
   * - 結果: 秒の切り替えが完全に同期
   */
  useEffect(() => {
    if (!serverState) return;

    const syncedTimer = setInterval(() => {
      const now = Date.now(); // 両方の計算で同じタイムスタンプを使用

      // displayTimeの更新
      if (!serverState.isPaused && serverState.activePlayerIndex !== -1) {
        const localElapsed = (now - lastSyncTime) / 1000;
        setDisplayTime(serverTime + localElapsed);
      } else {
        setDisplayTime(serverTime);
      }

      // turnDisplayTimeの更新
      if (serverState.activePlayerIndex === -1) {
        setTurnDisplayTime(0);
      } else if (!serverState.turnStartedAt) {
        setTurnDisplayTime(0);
      } else {
        const turnStart = new Date(serverState.turnStartedAt).getTime();

        if (serverState.isPaused && serverState.pausedAt) {
          // 一時停止中: pausedAt - turnStartedAtの差分
          const pausedTime = new Date(serverState.pausedAt).getTime();
          const elapsedMs = pausedTime - turnStart;
          setTurnDisplayTime(Math.max(0, elapsedMs / 1000));
        } else {
          // 通常: 現在時刻 - turnStartedAtの差分
          const elapsedMs = now - turnStart;
          setTurnDisplayTime(Math.max(0, elapsedMs / 1000));
        }
      }
    }, 100);  // 100msごとに両方を同時更新

    return () => clearInterval(syncedTimer);
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

  /**
   * Task 5.1: ゲーム全体のプレイ時間を秒単位で取得
   *
   * Requirements: turn-time-tracking spec 2.2
   * - アクティブプレイヤーのdisplayTime + 非アクティブプレイヤーのelapsedSecondsの合計
   * - これにより、アクティブプレイヤーの滑らかな時間増加が反映される
   * - プレイヤーが0人の場合は0を返す
   */
  const getTotalGameTime = useCallback((): number => {
    if (!serverState || serverState.players.length === 0) return 0;

    // アクティブプレイヤーがいない場合（ゲーム開始前）は全員の合計
    if (serverState.activePlayerIndex === -1) {
      return serverState.players.reduce((total, player) => total + player.elapsedSeconds, 0);
    }

    // 非アクティブプレイヤーの合計 + アクティブプレイヤーのdisplayTime
    const inactiveTotal = serverState.players
      .filter((_, idx) => idx !== serverState.activePlayerIndex)
      .reduce((total, player) => total + player.elapsedSeconds, 0);

    return inactiveTotal + displayTime;
  }, [serverState, displayTime, serverState?.activePlayerIndex]);

  /**
   * Task 5.1: ゲーム全体時間をフォーマット（HH:MM:SSまたはMM:SS）
   *
   * Requirements: turn-time-tracking spec 2.3
   * - 1時間未満: MM:SS形式
   * - 1時間以上: HH:MM:SS形式
   */
  const formatGameTime = useCallback((seconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      // 1時間以上: HH:MM:SS形式
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } else {
      // 1時間未満: MM:SS形式
      return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
  }, []);

  /**
   * アクティブプレイヤーの現在のターン経過時間を秒単位で取得
   *
   * Requirements: turn-time-tracking spec 1.3
   * - タイマー同期要件を満たすため、turnDisplayTime stateを返す
   * - turnDisplayTimeは100msごとに更新され、displayTimeと同期
   * - 一時停止中の時間を除外
   * - turnStartedAtがnullの場合は0を返す
   */
  const getCurrentTurnTime = useCallback((): number => {
    return Math.floor(turnDisplayTime);
  }, [turnDisplayTime]);

  // Task 1.1-1.4: サーバー状態の即座取得機能
  const syncInProgress = useRef(false);
  const syncDebounceTimer = useRef<number | null>(null);

  /**
   * サーバー状態を強制的に取得するメソッド
   *
   * Requirements: button-response-optimization spec 3.1-3.5
   * - /api/gameエンドポイントへのGETリクエスト送信
   * - 取得した最新状態を内部状態管理システムに反映
   * - 100ms以内の連続呼び出しを自動的にキャンセル（デバウンス）
   * - 実行中のリクエストがある場合、新しいリクエストをスキップ（重複防止）
   * - エラー発生時は静かに失敗させる（nullを返す）
   */
  const syncWithServer = useCallback(async (): Promise<GameStateWithTime | null> => {
    // デバウンス: 100ms以内の連続呼び出しをスキップ
    if (syncDebounceTimer.current !== null) {
      window.clearTimeout(syncDebounceTimer.current);
    }

    return new Promise<GameStateWithTime | null>((resolve) => {
      syncDebounceTimer.current = window.setTimeout(async () => {
        // 既に進行中のリクエストがある場合はスキップ
        if (syncInProgress.current) {
          console.log('[syncWithServer] Skipped (already in progress)');
          resolve(null);
          return;
        }

        syncInProgress.current = true;
        try {
          const response = await fetch('/api/game');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const state: GameStateWithTime = await response.json();
          updateFromServer(state);
          resolve(state);
        } catch (error) {
          console.error('[syncWithServer] Failed:', error);
          resolve(null);
        } finally {
          syncInProgress.current = false;
        }
      }, 100); // 100ms デバウンス
    });
  }, [updateFromServer]);

  /**
   * Task 4.2: プレイヤー名を楽観的に更新（即座にUIに反映）
   *
   * Requirements: api-mode-ui-fixes spec 2.6
   * - ローカル状態を即座に更新してUIに反映
   * - API呼び出し結果を待たずに更新（楽観的更新）
   */
  const updatePlayerNameOptimistic = useCallback((playerIndex: number, newName: string) => {
    if (!serverState) return;

    const updatedPlayers = [...serverState.players];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      name: newName
    };

    setServerState({
      ...serverState,
      players: updatedPlayers
    });
  }, [serverState]);

  return {
    serverState,
    displayTime,
    updateFromServer,
    formatTime,
    getLongestTimePlayer,
    getTotalGameTime,
    formatGameTime,
    getCurrentTurnTime,
    syncWithServer,
    updatePlayerNameOptimistic
  };
}

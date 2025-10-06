import { useState, useCallback, useEffect } from 'react';
import type { GameState, Player, TimerMode } from '../types/GameState';
import {
  DEFAULT_PLAYER_COUNT,
  DEFAULT_TIMER_MODE,
  DEFAULT_INITIAL_TIME_SECONDS,
  GameStateValidator
} from '../types/GameState';

/**
 * ユニークなIDを生成（簡易版UUID v4）
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * デフォルトのプレイヤーを生成
 */
function createDefaultPlayer(index: number): Player {
  return {
    id: generateId(),
    name: `プレイヤー${index + 1}`,
    elapsedTimeSeconds: 0,
    initialTimeSeconds: DEFAULT_INITIAL_TIME_SECONDS,
    isActive: false,
    createdAt: new Date()
  };
}

/**
 * デフォルトのゲーム状態を生成
 */
function createDefaultGameState(playerCount: number = DEFAULT_PLAYER_COUNT): GameState {
  const players = Array.from({ length: playerCount }, (_, i) => createDefaultPlayer(i));

  return {
    players,
    activePlayerId: null,
    isPaused: false,
    timerMode: DEFAULT_TIMER_MODE,
    createdAt: new Date(),
    lastUpdatedAt: new Date()
  };
}

/**
 * GameStateのuseState実装
 *
 * Phase 1: インメモリータイマー
 * - React useStateのみで状態管理
 * - プレイヤー配列、アクティブプレイヤーID、タイマーモード、一時停止状態を管理
 * - デフォルト状態（4人プレイヤー、カウントアップモード）の初期化
 * - プレイヤー数変更機能（4〜6人）
 */
export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(() => createDefaultGameState());

  /**
   * プレイヤー数を変更
   */
  const setPlayerCount = useCallback((count: number) => {
    if (!GameStateValidator.validatePlayerCount(count)) {
      throw new Error('プレイヤー数は4〜6人の範囲でなければなりません');
    }

    setGameState((prev) => {
      const currentPlayers = prev.players;
      const currentCount = currentPlayers.length;

      if (count === currentCount) {
        return prev;
      }

      let newPlayers: Player[];

      if (count > currentCount) {
        // プレイヤーを追加
        const additionalPlayers = Array.from(
          { length: count - currentCount },
          (_, i) => createDefaultPlayer(currentCount + i)
        );
        newPlayers = [...currentPlayers, ...additionalPlayers];
      } else {
        // プレイヤーを削除（最後から削除）
        newPlayers = currentPlayers.slice(0, count);
      }

      return {
        ...prev,
        players: newPlayers,
        lastUpdatedAt: new Date()
      };
    });
  }, []);

  /**
   * プレイヤーの経過時間を更新
   */
  const updatePlayerTime = useCallback((playerId: string, elapsedTimeSeconds: number) => {
    setGameState((prev) => {
      const playerExists = prev.players.some(p => p.id === playerId);
      if (!playerExists) {
        return prev;
      }

      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, elapsedTimeSeconds } : p
        ),
        lastUpdatedAt: new Date()
      };
    });
  }, []);

  /**
   * アクティブプレイヤーを設定
   */
  const setActivePlayer = useCallback((playerId: string | null) => {
    setGameState((prev) => ({
      ...prev,
      activePlayerId: playerId,
      players: prev.players.map(p => ({
        ...p,
        isActive: p.id === playerId
      })),
      lastUpdatedAt: new Date()
    }));
  }, []);

  /**
   * 一時停止状態を設定
   */
  const setPaused = useCallback((isPaused: boolean) => {
    setGameState((prev) => ({
      ...prev,
      isPaused,
      lastUpdatedAt: new Date()
    }));
  }, []);

  /**
   * タイマーモードを設定
   */
  const setTimerMode = useCallback((mode: TimerMode, initialTimeSeconds: number = DEFAULT_INITIAL_TIME_SECONDS) => {
    setGameState((prev) => ({
      ...prev,
      timerMode: mode,
      players: prev.players.map(p => ({
        ...p,
        elapsedTimeSeconds: mode === 'count-down' ? initialTimeSeconds : 0,
        initialTimeSeconds
      })),
      lastUpdatedAt: new Date()
    }));
  }, []);

  /**
   * 次のプレイヤーへターン切り替え（Task 10.3）
   * - 現在のアクティブプレイヤーから次のプレイヤーへターンを切り替える
   * - 最後のプレイヤーから最初のプレイヤーへ循環
   * - アクティブプレイヤーがいない場合は最初のプレイヤーをアクティブに
   */
  const switchToNextPlayer = useCallback(() => {
    setGameState((prev) => {
      const currentIndex = prev.activePlayerId
        ? prev.players.findIndex(p => p.id === prev.activePlayerId)
        : -1;

      // 次のプレイヤーのインデックスを計算（循環ロジック）
      const nextIndex = (currentIndex + 1) % prev.players.length;
      const nextPlayerId = prev.players[nextIndex].id;

      return {
        ...prev,
        activePlayerId: nextPlayerId,
        players: prev.players.map(p => ({
          ...p,
          isActive: p.id === nextPlayerId
        })),
        lastUpdatedAt: new Date()
      };
    });
  }, []);

  /**
   * ゲームをリセット
   */
  const resetGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.map(p => ({
        ...p,
        elapsedTimeSeconds: prev.timerMode === 'count-down' ? p.initialTimeSeconds : 0,
        isActive: false
      })),
      activePlayerId: null,
      isPaused: false,
      lastUpdatedAt: new Date()
    }));
  }, []);

  /**
   * タイマーロジック（Task 10.2）
   * - setIntervalによる1秒ごとの更新
   * - カウントアップ: 経過時間+1秒
   * - カウントダウン: 残り時間-1秒、0:00で停止
   * - アクティブプレイヤーのみタイマー動作
   */
  useEffect(() => {
    // アクティブプレイヤーがいない、または一時停止中はタイマー停止
    if (!gameState.activePlayerId || gameState.isPaused) {
      return;
    }

    const timerId = setInterval(() => {
      setGameState((prev) => {
        // アクティブプレイヤーがいない場合は更新しない
        if (!prev.activePlayerId) {
          return prev;
        }

        const activePlayer = prev.players.find(p => p.id === prev.activePlayerId);
        if (!activePlayer) {
          return prev;
        }

        // カウントダウンモードで0秒に達した場合は停止
        if (prev.timerMode === 'count-down' && activePlayer.elapsedTimeSeconds <= 0) {
          return {
            ...prev,
            activePlayerId: null,
            players: prev.players.map(p => ({
              ...p,
              isActive: false
            })),
            lastUpdatedAt: new Date()
          };
        }

        // タイマー更新
        const newElapsedTime = prev.timerMode === 'count-up'
          ? activePlayer.elapsedTimeSeconds + 1
          : Math.max(0, activePlayer.elapsedTimeSeconds - 1);

        const updatedPlayers = prev.players.map(p =>
          p.id === prev.activePlayerId
            ? { ...p, elapsedTimeSeconds: newElapsedTime }
            : p
        );

        // カウントダウンモードで0秒に達した場合はアクティブ解除
        const shouldStopTimer = prev.timerMode === 'count-down' && newElapsedTime === 0;

        return {
          ...prev,
          players: shouldStopTimer
            ? updatedPlayers.map(p => ({ ...p, isActive: false }))
            : updatedPlayers,
          activePlayerId: shouldStopTimer ? null : prev.activePlayerId,
          lastUpdatedAt: new Date()
        };
      });
    }, 1000);

    // クリーンアップ
    return () => clearInterval(timerId);
  }, [gameState.activePlayerId, gameState.isPaused]);

  /**
   * タイマー値をMM:SS形式にフォーマット（Task 12.1）
   */
  const formatTime = useCallback((seconds: number): string => {
    // 負の値は0として扱う
    const totalSeconds = Math.max(0, seconds);

    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    // MM:SS形式（分は2桁ゼロ埋め、秒も2桁ゼロ埋め）
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  /**
   * カウントダウンモードで時間切れになったプレイヤーIDを返す（Task 12.2）
   */
  const getTimedOutPlayerId = useCallback((): string | null => {
    // カウントアップモードでは常にnull
    if (gameState.timerMode === 'count-up') {
      return null;
    }

    // カウントダウンモードで0秒のプレイヤーを検索
    const timedOutPlayer = gameState.players.find(p => p.elapsedTimeSeconds === 0);
    return timedOutPlayer ? timedOutPlayer.id : null;
  }, [gameState.timerMode, gameState.players]);

  /**
   * プレイヤー操作が無効化されているかを判定（Task 12.3）
   * 他のプレイヤーがアクティブな時、そのプレイヤー以外の操作を無効化
   */
  const isPlayerControlDisabled = useCallback((playerId: string): boolean => {
    // アクティブプレイヤーがいない場合は全プレイヤー有効
    if (!gameState.activePlayerId) {
      return false;
    }

    // 自分がアクティブなら有効、他のプレイヤーがアクティブなら無効
    return playerId !== gameState.activePlayerId;
  }, [gameState.activePlayerId]);

  /**
   * プレイヤー名を更新（Task 1.1）
   * - プレイヤー名を動的に変更できる状態管理機能
   * - 名前変更時に状態を即座に更新
   */
  const updatePlayerName = useCallback((playerId: string, newName: string) => {
    setGameState((prev) => {
      const playerExists = prev.players.some(p => p.id === playerId);
      if (!playerExists) {
        return prev;
      }

      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, name: newName } : p
        ),
        lastUpdatedAt: new Date()
      };
    });
  }, []);

  /**
   * プレイヤー数が有効な範囲（4〜6人）かを判定（Task 12.4）
   */
  const validatePlayerCount = useCallback((count: number): boolean => {
    return GameStateValidator.validatePlayerCount(count);
  }, []);

  /**
   * プレイヤー数のエラーメッセージを取得（Task 12.4）
   */
  const getPlayerCountError = useCallback((count: number): string | null => {
    if (validatePlayerCount(count)) {
      return null;
    }
    return 'プレイヤー数は4〜6人の範囲で入力してください';
  }, [validatePlayerCount]);

  /**
   * 最も累積時間が長いプレイヤーを取得（Task 1.1）
   * - カウントアップモード専用機能
   * - カウントダウンモードではnullを返す
   * - 全員の時間が0の場合はnullを返す
   * - 同点の場合は最初に見つかったプレイヤーを返す
   *
   * 要件トレーサビリティ:
   * - 要件1.1: カウントアップモードで最長プレイヤー表示
   * - 要件1.2: プレイヤー名と累積時間を表示
   * - 要件1.3: 同点時は1人を選択表示
   * - 要件1.4: カウントダウンモードで非表示
   * - 要件1.5: 全員0秒時は非表示
   */
  const getLongestTimePlayer = useCallback((): Player | null => {
    // カウントアップモードでない場合は非表示
    if (gameState.timerMode !== 'count-up') {
      return null;
    }

    // プレイヤーが存在しない場合は非表示
    if (gameState.players.length === 0) {
      return null;
    }

    // 全員の時間が0の場合は非表示
    const hasNonZeroTime = gameState.players.some(p => p.elapsedTimeSeconds > 0);
    if (!hasNonZeroTime) {
      return null;
    }

    // 最長時間のプレイヤーを検索（同点の場合は最初に見つかったプレイヤー）
    let longestPlayer = gameState.players[0];
    for (const player of gameState.players) {
      if (player.elapsedTimeSeconds > longestPlayer.elapsedTimeSeconds) {
        longestPlayer = player;
      }
    }

    return longestPlayer;
  }, [gameState.timerMode, gameState.players]);

  return {
    gameState,
    setPlayerCount,
    updatePlayerTime,
    setActivePlayer,
    switchToNextPlayer,
    setPaused,
    setTimerMode,
    resetGame,
    updatePlayerName,
    formatTime,
    getTimedOutPlayerId,
    isPlayerControlDisabled,
    validatePlayerCount,
    getPlayerCountError,
    getLongestTimePlayer
  };
}

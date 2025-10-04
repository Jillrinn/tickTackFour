import { useState, useEffect, useCallback } from 'react';
import { SignalRConnectionManager, ConnectionState } from '../services/SignalRConnectionManager';
import { PlayerList } from './PlayerList';
import { TimerControls } from './TimerControls';
import { useGameTimer } from '../hooks/useGameTimer';
import type { GameState, TimerMode } from '../types/GameState';
import './GameTimer.css';

const API_BASE_URL = '/api';

/**
 * GameTimerルートコンポーネント
 * - アプリケーション全体の状態管理
 * - SignalR接続のライフサイクル管理
 * - APIとの通信
 */
export function GameTimer() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [error, setError] = useState<string | null>(null);
  const [_signalRManager, setSignalRManager] = useState<SignalRConnectionManager | null>(null);

  // ゲーム状態をAPIから取得
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/game`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      const data = await response.json();

      // Date型に変換
      const state: GameState = {
        ...data,
        players: data.players.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt)
        })),
        createdAt: new Date(data.createdAt),
        lastUpdatedAt: new Date(data.lastUpdatedAt)
      };

      setGameState(state);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch game state:', err);
      setError('ゲーム状態の取得に失敗しました');
    }
  }, []);

  // SignalR接続の初期化
  useEffect(() => {
    const manager = new SignalRConnectionManager(`${API_BASE_URL}/negotiate`);

    // 接続状態変化のコールバック
    manager.onConnectionStateChanged((state) => {
      setConnectionState(state);
    });

    // SignalRイベントリスナー
    manager.on('TurnSwitched', (data: { activePlayerId: string }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activePlayerId: data.activePlayerId,
          players: prev.players.map((p) => ({
            ...p,
            isActive: p.id === data.activePlayerId
          }))
        };
      });
    });

    manager.on('TimerUpdated', (data: { playerId: string; elapsedTimeSeconds: number }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === data.playerId ? { ...p, elapsedTimeSeconds: data.elapsedTimeSeconds } : p
          )
        };
      });
    });

    manager.on('GameReset', (data: { players: any[] }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: data.players.map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt)
          })),
          activePlayerId: null,
          isPaused: false
        };
      });
    });

    manager.on('PlayersUpdated', (data: { players: any[] }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: data.players.map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt)
          }))
        };
      });
    });

    // 接続開始
    manager.start().catch((err) => {
      console.error('SignalR connection failed:', err);
      setError('リアルタイム接続に失敗しました');
    });

    setSignalRManager(manager);

    // クリーンアップ
    return () => {
      manager.stop().catch(console.error);
    };
  }, []);

  // 初回ゲーム状態取得
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // タイマーティックコールバック
  const handleTimerTick = useCallback((playerId: string, newElapsedTime: number) => {
    setGameState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, elapsedTimeSeconds: newElapsedTime } : p
        )
      };
    });
  }, []);

  // サーバー同期コールバック
  const handleServerSync = useCallback(async (playerId: string, elapsedTime: number) => {
    try {
      await fetch(`${API_BASE_URL}/syncTimer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, elapsedTimeSeconds: elapsedTime })
      });
    } catch (err) {
      console.error('Failed to sync timer:', err);
    }
  }, []);

  // 時間切れコールバック
  const handleTimeExpired = useCallback((playerId: string) => {
    console.log(`Time expired for player: ${playerId}`);
    // 必要に応じて追加処理（通知など）
  }, []);

  // useGameTimerフックを使用
  useGameTimer(
    gameState || {
      players: [],
      activePlayerId: null,
      isPaused: false,
      timerMode: 'count-up',
      createdAt: new Date(),
      lastUpdatedAt: new Date()
    },
    handleTimerTick,
    handleServerSync,
    handleTimeExpired
  );

  // ターン切り替え
  const handleSwitchTurn = useCallback(async () => {
    if (!gameState || !gameState.activePlayerId) return;

    const currentIndex = gameState.players.findIndex((p) => p.id === gameState.activePlayerId);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    const nextPlayerId = gameState.players[nextIndex].id;

    try {
      await fetch(`${API_BASE_URL}/switchTurn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPlayerId: gameState.activePlayerId, nextPlayerId })
      });
    } catch (err) {
      console.error('Failed to switch turn:', err);
      setError('ターン切り替えに失敗しました');
    }
  }, [gameState]);

  // ゲーム一時停止
  const handlePauseGame = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/pauseGame`, { method: 'POST' });
      setGameState((prev) => (prev ? { ...prev, isPaused: true } : prev));
    } catch (err) {
      console.error('Failed to pause game:', err);
      setError('一時停止に失敗しました');
    }
  }, []);

  // ゲーム再開
  const handleResumeGame = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/resumeGame`, { method: 'POST' });
      setGameState((prev) => (prev ? { ...prev, isPaused: false } : prev));
    } catch (err) {
      console.error('Failed to resume game:', err);
      setError('再開に失敗しました');
    }
  }, []);

  // ゲームリセット
  const handleResetGame = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/resetGame`, { method: 'POST' });
      await fetchGameState();
    } catch (err) {
      console.error('Failed to reset game:', err);
      setError('リセットに失敗しました');
    }
  }, [fetchGameState]);

  // プレイヤー数更新
  const handleUpdatePlayers = useCallback(async (count: number) => {
    try {
      await fetch(`${API_BASE_URL}/updatePlayers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerCount: count })
      });
      await fetchGameState();
    } catch (err) {
      console.error('Failed to update players:', err);
      setError('プレイヤー数の更新に失敗しました');
    }
  }, [fetchGameState]);

  // タイマーモード設定
  const handleSetTimerMode = useCallback(
    async (mode: TimerMode, initialTimeSeconds?: number) => {
      try {
        await fetch(`${API_BASE_URL}/setTimerMode`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, initialTimeSeconds })
        });
        await fetchGameState();
      } catch (err) {
        console.error('Failed to set timer mode:', err);
        setError('タイマーモードの設定に失敗しました');
      }
    },
    [fetchGameState]
  );

  if (error) {
    return (
      <div className="game-timer error">
        <h1>エラーが発生しました</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>再読み込み</button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-timer loading">
        <h1>読み込み中...</h1>
      </div>
    );
  }

  return (
    <div className="game-timer">
      <header className="game-header">
        <h1>マルチプレイヤー・ゲームタイマー</h1>
        <div className="connection-status">
          接続状態:{' '}
          <span className={`status-${connectionState.toLowerCase()}`}>{connectionState}</span>
        </div>
      </header>

      <main className="game-main">
        <PlayerList
          players={gameState.players}
          activePlayerId={gameState.activePlayerId}
          timerMode={gameState.timerMode}
        />

        <TimerControls
          gameState={gameState}
          onSwitchTurn={handleSwitchTurn}
          onPauseGame={handlePauseGame}
          onResumeGame={handleResumeGame}
          onResetGame={handleResetGame}
          onUpdatePlayers={handleUpdatePlayers}
          onSetTimerMode={handleSetTimerMode}
        />
      </main>
    </div>
  );
}

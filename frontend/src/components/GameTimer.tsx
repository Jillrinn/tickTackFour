import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { usePollingSync, type PollingErrorInfo } from '../hooks/usePollingSync';
import { useGameApi } from '../hooks/useGameApi';
import { useETagManager } from '../hooks/useETagManager';
import { useFallbackMode } from '../hooks/useFallbackMode';
import { TopTimePlayerIndicator } from './TopTimePlayerIndicator';
import type { GameStateWithTime } from '../types/GameState';
import './GameTimer.css';

/**
 * GameTimerルートコンポーネント（Phase 1→2移行中）
 * - Phase 1: useStateによるインメモリー状態管理（既存）
 * - Phase 2: バックエンドAPI連携とポーリング同期（追加中）
 */
export function GameTimer() {
  const {
    gameState,
    setPlayerCount,
    updatePlayerTime,
    updatePlayerName,
    setActivePlayer,
    switchToNextPlayer,
    setPaused,
    setTimerMode,
    resetGame,
    formatTime,
    getTimedOutPlayerId,
    isPlayerControlDisabled,
    getLongestTimePlayer
  } = useGameState();

  // カウントダウンモード用の初期時間設定（秒単位）
  const [countdownSeconds, setCountdownSeconds] = React.useState(600);

  // Task 3.1: ポーリング同期サービスの実装
  // バックエンドから取得したゲーム状態を管理
  const [serverGameState, setServerGameState] = React.useState<GameStateWithTime | null>(null);

  // Task 3.4: ETag管理と楽観的ロック対応
  const { etag, updateEtag, isConflict, conflictMessage, setConflictMessage, clearConflictMessage, showReloadPrompt, setShowReloadPrompt } = useETagManager();

  // Task 4.1: インメモリーモードへのフォールバック機能
  const { isInFallbackMode, lastError, retryCount, activateFallbackMode, deactivateFallbackMode } = useFallbackMode();

  // ポーリング失敗時のエラーハンドラ
  const handlePollingError = React.useCallback((errorInfo: PollingErrorInfo) => {
    console.warn('[GameTimer] ポーリング3回連続失敗、フォールバックモードに切り替えます', errorInfo);
    activateFallbackMode(errorInfo.lastError);
  }, [activateFallbackMode]);

  // 5秒ごとにバックエンドからゲーム状態を取得
  // テスト環境では無効化（jsdomで相対URLが使えないため）
  usePollingSync((state: GameStateWithTime) => {
    console.log('[PollingSync] Server state updated:', state);
    setServerGameState(state);
    updateEtag(state.etag);

    // API接続成功時、フォールバックモードから復帰
    if (isInFallbackMode) {
      deactivateFallbackMode();
    }
  }, {
    enabled: import.meta.env.MODE !== 'test',
    onError: handlePollingError
  });

  // Task 3.3: API呼び出し用のカスタムフック
  const { switchTurn, pauseGame: pauseGameApi, resumeGame: resumeGameApi, resetGame: resetGameApi, updateGame } = useGameApi();

  // Task 3.3: API呼び出しハンドラ
  // テスト環境ではローカル状態管理を使用、本番環境ではAPI呼び出しを実行
  const handleSwitchTurn = React.useCallback(async () => {
    if (import.meta.env.MODE === 'test') {
      switchToNextPlayer();
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot switch turn');
      return;
    }
    const result = await switchTurn(etag);
    if (result) {
      updateEtag(result.etag);
      clearConflictMessage();
      setShowReloadPrompt(false);
    }
  }, [etag, switchTurn, switchToNextPlayer, updateEtag, clearConflictMessage, setShowReloadPrompt]);

  const handlePauseResume = React.useCallback(async () => {
    if (import.meta.env.MODE === 'test') {
      setPaused(!gameState.isPaused);
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot pause/resume');
      return;
    }
    const result = gameState.isPaused
      ? await resumeGameApi(etag)
      : await pauseGameApi(etag);
    if (result) {
      updateEtag(result.etag);
      clearConflictMessage();
      setShowReloadPrompt(false);
    }
  }, [etag, gameState.isPaused, pauseGameApi, resumeGameApi, setPaused, updateEtag, clearConflictMessage, setShowReloadPrompt]);

  const handleResetGame = React.useCallback(async () => {
    if (import.meta.env.MODE === 'test') {
      resetGame();
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot reset game');
      return;
    }
    const result = await resetGameApi(etag);
    if (result) {
      updateEtag(result.etag);
      clearConflictMessage();
      setShowReloadPrompt(false);
    }
  }, [etag, resetGameApi, resetGame, updateEtag, clearConflictMessage, setShowReloadPrompt]);

  const handlePlayerCountChange = React.useCallback(async (playerCount: number) => {
    if (import.meta.env.MODE === 'test') {
      setPlayerCount(playerCount);
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot change player count');
      return;
    }
    const result = await updateGame(etag, { playerCount });
    if (result) {
      updateEtag(result.etag);
      clearConflictMessage();
      setShowReloadPrompt(false);
    }
  }, [etag, updateGame, setPlayerCount, updateEtag, clearConflictMessage, setShowReloadPrompt]);

  const handleTimerModeChange = React.useCallback(async (checked: boolean) => {
    if (import.meta.env.MODE === 'test') {
      if (checked) {
        setTimerMode('count-down', countdownSeconds);
      } else {
        setTimerMode('count-up');
      }
      return;
    }
    if (!etag) {
      console.warn('ETag not available, cannot change timer mode');
      return;
    }
    const params = checked
      ? { timerMode: 'count-down' as const, countdownSeconds }
      : { timerMode: 'count-up' as const };
    const result = await updateGame(etag, params);
    if (result) {
      updateEtag(result.etag);
      clearConflictMessage();
      setShowReloadPrompt(false);
    }
  }, [etag, countdownSeconds, updateGame, setTimerMode, updateEtag, clearConflictMessage, setShowReloadPrompt]);

  // タイムアウトしたプレイヤーID（Task 12.2）
  const timedOutPlayerId = getTimedOutPlayerId();

  // 最長時間プレイヤーを取得
  const longestPlayer = getLongestTimePlayer();

  return (
    <div className="game-timer">
      <header className="game-header">
        <h1>マルチプレイヤー・ゲームタイマー (Phase 1: インメモリー版)</h1>
      </header>

      <main className="game-main">
        {/* Task 4.1: フォールバックモード警告 */}
        {isInFallbackMode && (
          <div className="fallback-mode-warning" role="alert" aria-live="assertive" data-testid="fallback-warning">
            ⚠️ API接続が失敗しました。インメモリーモードで動作しています。
            （再接続試行: {retryCount}回）
          </div>
        )}

        {/* Task 2.1-2.3: 固定ヘッダー */}
        <div className="sticky-header" data-testid="sticky-header">
          <div className="sticky-header-content" data-testid="sticky-header-content">
            <div className="sticky-header-info" data-testid="active-player-info">
              {gameState.activePlayerId ? (
                <>
                  <span className="sticky-header-label">現在のプレイヤー:</span>
                  <span className="sticky-header-player">
                    {gameState.players.find(p => p.id === gameState.activePlayerId)?.name || 'プレイヤー'}
                  </span>
                  <span className="sticky-header-time">
                    {formatTime(gameState.players.find(p => p.id === gameState.activePlayerId)?.elapsedTimeSeconds || 0)}
                  </span>
                </>
              ) : (
                <span className="sticky-header-status">ゲーム未開始</span>
              )}
            </div>
            <div className="sticky-header-actions">
              <button
                onClick={handlePauseResume}
                className="pause-btn sticky-header-btn"
                aria-label={gameState.isPaused ? 'ゲームを再開' : 'ゲームを一時停止'}
              >
                {gameState.isPaused ? '▶️ 再開' : '⏸️ 一時停止'}
              </button>
              <button
                onClick={handleSwitchTurn}
                className="next-player-btn sticky-header-btn"
                aria-label="次のプレイヤーに切り替え"
              >
                次のプレイヤーへ →
              </button>
            </div>
          </div>
        </div>

        {/* 最長時間プレイヤー表示（カウントアップモード時のみ） */}
        <TopTimePlayerIndicator longestPlayer={longestPlayer} />

        <div className="players-section">
          <h3>プレイヤー一覧</h3>
          <ul className="players-grid">
            {gameState.players.map((player) => {
              const isTimedOut = player.id === timedOutPlayerId;
              const isDisabled = isPlayerControlDisabled(player.id);
              return (
              <li key={player.id} className={`player-card ${player.isActive ? 'active' : ''} ${isTimedOut ? 'timeout' : ''}`}>
                <div className="player-info">
                  <input
                    type="text"
                    className="player-name-input"
                    value={player.name}
                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                    aria-label="プレイヤー名"
                  />
                </div>
                <div className="player-time">経過時間: {formatTime(player.elapsedTimeSeconds)}</div>
                <div className="player-actions">
                  <button
                    onClick={() => updatePlayerTime(player.id, player.elapsedTimeSeconds + 10)}
                    disabled={isDisabled}
                  >
                    +10秒
                  </button>
                  <button
                    onClick={() => setActivePlayer(player.id)}
                    disabled={isDisabled}
                  >
                    アクティブに設定
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        </div>

        <div className="controls-section" data-testid="controls-section">
          <h3>設定</h3>

          {/* 設定セクション */}
          <div className="settings-controls" data-testid="settings-controls">
            <div className="settings-grid">
              {/* Task 3.1: プレイヤー人数ドロップダウン */}
              <div className="setting-item">
                <label htmlFor="player-count" className="setting-label">プレイヤー人数</label>
                <select
                  id="player-count"
                  className="styled-select"
                  value={gameState.players.length}
                  onChange={(e) => handlePlayerCountChange(Number(e.target.value))}
                  disabled={gameState.activePlayerId !== null && !gameState.isPaused}
                  data-testid="player-count-dropdown"
                  aria-label="プレイヤー人数選択"
                >
                  <option value={4}>4人</option>
                  <option value={5}>5人</option>
                  <option value={6}>6人</option>
                </select>
              </div>

              {/* Task 4.1 & 4.2: カウントモードトグルスイッチ */}
              <div className="setting-item">
                <label className="setting-label">タイマーモード</label>
                <label className="toggle-switch-enhanced">
                  <input
                    type="checkbox"
                    checked={gameState.timerMode === 'count-down'}
                    onChange={(e) => handleTimerModeChange(e.target.checked)}
                    disabled={gameState.activePlayerId !== null && !gameState.isPaused}
                    data-testid="timer-mode-toggle"
                    aria-label="カウントモード切替"
                  />
                  <span className="toggle-slider">
                    <span className="toggle-label-left">カウントアップ</span>
                    <span className="toggle-label-right">カウントダウン</span>
                  </span>
                </label>
              </div>
              {gameState.timerMode === 'count-down' && (
                <div className="countdown-control">
                  <input
                    type="number"
                    value={countdownSeconds}
                    onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                    min="1"
                    max="3600"
                  />
                  <span>秒</span>
                </div>
              )}
              <div className="setting-item">
                <button onClick={handleResetGame} className="reset-btn">リセット</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
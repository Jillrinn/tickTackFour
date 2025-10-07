import React from 'react';
import { useGameState } from '../hooks/useGameState';
import { TopTimePlayerIndicator } from './TopTimePlayerIndicator';
import './GameTimer.css';

/**
 * GameTimerルートコンポーネント（Phase 1: インメモリー版）
 * - useStateのみで状態管理
 * - DB/SignalR接続なし
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
        {/* Task 2.1-2.3: 固定ヘッダー */}
        <div className="sticky-header" data-testid="sticky-header">
          <div className="sticky-header-content">
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
            <button onClick={switchToNextPlayer} className="next-player-btn sticky-header-btn">
              次のプレイヤーへ
            </button>
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
                  <div className="player-id">ID: {player.id.substring(0, 8)}...</div>
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
          <h3>操作</h3>

          {/* 主要操作セクション（Task 1.2 & Task 5.1） */}
          <div className="primary-controls" data-testid="primary-controls">
            <h4>主要操作</h4>
            {/* Task 5.1: 「次のプレイヤーへ」ボタンは固定ヘッダーに移動済み */}
            <button onClick={() => setPaused(!gameState.isPaused)}>
              {gameState.isPaused ? '再開' : '一時停止'}
            </button>
          </div>

          {/* 設定・その他セクション（Task 1.2 & 1.3） */}
          <div className="settings-controls" data-testid="settings-controls">
            <h4>設定・その他</h4>
            <div className="settings-grid">
              {/* Task 3.1: プレイヤー人数ドロップダウン */}
              <select
                value={gameState.players.length}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
                disabled={gameState.activePlayerId !== null && !gameState.isPaused}
                data-testid="player-count-dropdown"
                aria-label="プレイヤー人数選択"
              >
                <option value={4}>4人</option>
                <option value={5}>5人</option>
                <option value={6}>6人</option>
              </select>
              {/* Task 4.1 & 4.2: カウントモードトグルスイッチ */}
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={gameState.timerMode === 'count-down'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTimerMode('count-down', countdownSeconds);
                    } else {
                      setTimerMode('count-up');
                    }
                  }}
                  disabled={gameState.activePlayerId !== null && !gameState.isPaused}
                  data-testid="timer-mode-toggle"
                  aria-label="カウントモード切替"
                />
                <span className="slider"></span>
                <span className="label">
                  {gameState.timerMode === 'count-down' ? 'カウントダウン' : 'カウントアップ'}
                </span>
              </label>
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
              <button onClick={resetGame}>リセット</button>
            </div>
          </div>
        </div>

        <div className="test-info">
          <p><strong>動作確認ポイント（Task 11 レスポンシブデザイン）:</strong></p>
          <ul>
            <li>✅ スマートフォン(375px以下): 単列レイアウト</li>
            <li>✅ タブレット(768px以上): 2列グリッドレイアウト</li>
            <li>✅ PC(1024px以上): 3列グリッドレイアウト</li>
            <li>✅ 大画面PC(1440px以上): 4列グリッドレイアウト</li>
            <li>✅ 読みやすいフォントサイズとボタンサイズ</li>
          </ul>
          <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
            <strong>Chrome DevTools確認方法:</strong><br/>
            1. F12でDevToolsを開く<br/>
            2. デバイスツールバー（Ctrl+Shift+M）でレスポンシブモード有効化<br/>
            3. 画面幅を375px/768px/1024px/1440pxに変更して確認
          </p>
        </div>
      </main>
    </div>
  );
}
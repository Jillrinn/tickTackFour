import React from 'react';
import { useGameState } from '../hooks/useGameState';
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
    isPlayerControlDisabled
  } = useGameState();

  // カウントダウンモード用の初期時間設定（秒単位）
  const [countdownSeconds, setCountdownSeconds] = React.useState(600);

  // タイムアウトしたプレイヤーID（Task 12.2）
  const timedOutPlayerId = getTimedOutPlayerId();

  return (
    <div className="game-timer">
      <header className="game-header">
        <h1>マルチプレイヤー・ゲームタイマー (Phase 1: インメモリー版)</h1>
      </header>

      <main className="game-main">
        <div className="game-status">
          <h2>ゲーム状態</h2>
          <div className="status-info">
            <p>プレイヤー数: {gameState.players.length}</p>
            <p>タイマーモード: {gameState.timerMode}</p>
            <p>一時停止中: {gameState.isPaused ? 'はい' : 'いいえ'}</p>
            <p>アクティブプレイヤー: {gameState.activePlayerId || 'なし'}</p>
          </div>
        </div>

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

        <div className="controls-section">
          <h3>操作</h3>
          <div className="controls-grid">
            <button onClick={() => setPlayerCount(4)}>4人</button>
            <button onClick={() => setPlayerCount(5)}>5人</button>
            <button onClick={() => setPlayerCount(6)}>6人</button>
            <button onClick={() => setTimerMode('count-up')}>カウントアップ</button>
            <div className="countdown-control">
              <button onClick={() => setTimerMode('count-down', countdownSeconds)}>カウントダウン</button>
              <input
                type="number"
                value={countdownSeconds}
                onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                min="1"
                max="3600"
              />
              <span>秒</span>
            </div>
            <button onClick={switchToNextPlayer} className="next-player-btn">
              次のプレイヤーへ
            </button>
            <button onClick={() => setPaused(!gameState.isPaused)}>
              {gameState.isPaused ? '再開' : '一時停止'}
            </button>
            <button onClick={() => setActivePlayer(null)}>アクティブ解除</button>
            <button onClick={resetGame}>リセット</button>
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
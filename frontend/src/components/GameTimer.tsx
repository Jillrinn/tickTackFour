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
    setActivePlayer,
    switchToNextPlayer,
    setPaused,
    setTimerMode,
    resetGame
  } = useGameState();

  // カウントダウンモード用の初期時間設定（秒単位）
  const [countdownSeconds, setCountdownSeconds] = React.useState(600);

  return (
    <div className="game-timer">
      <header className="game-header">
        <h1>マルチプレイヤー・ゲームタイマー (Phase 1: インメモリー版)</h1>
      </header>

      <main className="game-main">
        <div style={{ padding: '20px' }}>
          <h2>ゲーム状態</h2>
          <div style={{ marginBottom: '20px' }}>
            <p>プレイヤー数: {gameState.players.length}</p>
            <p>タイマーモード: {gameState.timerMode}</p>
            <p>一時停止中: {gameState.isPaused ? 'はい' : 'いいえ'}</p>
            <p>アクティブプレイヤー: {gameState.activePlayerId || 'なし'}</p>
          </div>

          <h3>プレイヤー一覧</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {gameState.players.map((player) => (
              <li key={player.id} style={{ marginBottom: '10px', padding: '10px', background: player.isActive ? '#e3f2fd' : '#f5f5f5' }}>
                <div>
                  <strong>{player.name}</strong> (ID: {player.id.substring(0, 8)}...)
                </div>
                <div>経過時間: {player.elapsedTimeSeconds}秒</div>
                <div>
                  <button onClick={() => updatePlayerTime(player.id, player.elapsedTimeSeconds + 10)}>
                    +10秒
                  </button>
                  <button onClick={() => setActivePlayer(player.id)} style={{ marginLeft: '5px' }}>
                    アクティブに設定
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <h3>操作</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setPlayerCount(4)}>4人</button>
            <button onClick={() => setPlayerCount(5)}>5人</button>
            <button onClick={() => setPlayerCount(6)}>6人</button>
            <button onClick={() => setTimerMode('count-up')}>カウントアップ</button>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button onClick={() => setTimerMode('count-down', countdownSeconds)}>カウントダウン</button>
              <input
                type="number"
                value={countdownSeconds}
                onChange={(e) => setCountdownSeconds(Number(e.target.value))}
                min="1"
                max="3600"
                style={{ width: '80px', padding: '5px' }}
              />
              <span>秒</span>
            </div>
            <button onClick={switchToNextPlayer} style={{ fontWeight: 'bold', background: '#4CAF50', color: 'white' }}>
              次のプレイヤーへ
            </button>
            <button onClick={() => setPaused(!gameState.isPaused)}>
              {gameState.isPaused ? '再開' : '一時停止'}
            </button>
            <button onClick={() => setActivePlayer(null)}>アクティブ解除</button>
            <button onClick={resetGame}>リセット</button>
          </div>

          <h3>テスト用情報</h3>
          <div style={{ marginTop: '20px', padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
            <p><strong>動作確認ポイント（Task 10.4 ゲームコントロール機能）:</strong></p>
            <ul>
              <li>✅ リセットボタンで全プレイヤーのタイマーが初期値にリセット</li>
              <li>✅ 一時停止/再開ボタンでアクティブタイマーの制御</li>
              <li>✅ カウントアップ/カウントダウンモード切り替え</li>
              <li>🆕 カウントダウンモード時の初期時間設定（入力フィールド）</li>
              <li>🆕 初期時間を1〜3600秒の範囲で設定可能</li>
              <li>🆕 設定した初期時間でカウントダウンモード開始</li>
            </ul>
            <p style={{ marginTop: '10px', fontSize: '12px' }}>
              <strong>Chrome DevTools確認方法:</strong><br/>
              1. F12でDevToolsを開く<br/>
              2. Consoleタブで `window.gameState` を確認（開発時のみ）<br/>
              3. Reactタブ（React Developer Tools拡張機能）でstate確認
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
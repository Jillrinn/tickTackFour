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
            <button onClick={() => setTimerMode('count-down', 600)}>カウントダウン</button>
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
            <p><strong>動作確認ポイント（Task 10.3 ターン管理機能）:</strong></p>
            <ul>
              <li>✅ プレイヤー数を4→5→6と変更できる</li>
              <li>✅ プレイヤーの経過時間を更新できる</li>
              <li>✅ アクティブプレイヤーを設定すると背景色が変わる</li>
              <li>✅ タイマーモードを切り替えると経過時間がリセットされる</li>
              <li>✅ リセットボタンで全プレイヤーの時間が初期化される</li>
              <li>🆕 「次のプレイヤーへ」ボタンでターン切り替えができる</li>
              <li>🆕 最後のプレイヤーから最初のプレイヤーへ循環する</li>
              <li>🆕 アクティブプレイヤーのタイマーのみ動作し、他は停止する</li>
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
import { useState } from 'react';
import type { GameState, TimerMode } from '../types/GameState';
import { PLAYER_COUNT_MIN, PLAYER_COUNT_MAX, DEFAULT_INITIAL_TIME_SECONDS } from '../types/GameState';
import './TimerControls.css';

export interface TimerControlsProps {
  gameState: GameState;
  onSwitchTurn: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onResetGame: () => void;
  onUpdatePlayers: (count: number) => void;
  onSetTimerMode: (mode: TimerMode, initialTimeSeconds?: number) => void;
}

/**
 * タイマー操作コントロールコンポーネント
 * - ターン切り替え、一時停止、再開、リセット
 * - プレイヤー数変更
 * - タイマーモード切り替え
 */
export function TimerControls({
  gameState,
  onSwitchTurn,
  onPauseGame,
  onResumeGame,
  onResetGame,
  onUpdatePlayers,
  onSetTimerMode
}: TimerControlsProps) {
  const [initialTime, setInitialTime] = useState(DEFAULT_INITIAL_TIME_SECONDS);

  const handlePlayerCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value, 10);
    onUpdatePlayers(count);
  };

  const handleTimerModeToggle = () => {
    const newMode: TimerMode = gameState.timerMode === 'countup' ? 'countdown' : 'countup';
    onSetTimerMode(newMode, newMode === 'countdown' ? initialTime : undefined);
  };

  const handleInitialTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = parseInt(e.target.value, 10);
    if (!isNaN(seconds) && seconds > 0) {
      setInitialTime(seconds);
    }
  };

  const playerCountOptions = [];
  for (let i = PLAYER_COUNT_MIN; i <= PLAYER_COUNT_MAX; i++) {
    playerCountOptions.push(
      <option key={i} value={i}>
        {i}人
      </option>
    );
  }

  const hasActivePlayer = gameState.activePlayerId !== null;

  return (
    <div className="timer-controls">
      <div className="control-group">
        <button
          className="btn btn-primary"
          onClick={onSwitchTurn}
          disabled={!hasActivePlayer}
          title={!hasActivePlayer ? 'アクティブプレイヤーがいません' : ''}
        >
          次のプレイヤーへ
        </button>

        {!gameState.isPaused ? (
          <button
            className="btn btn-warning"
            onClick={onPauseGame}
            disabled={!hasActivePlayer}
            title={!hasActivePlayer ? 'アクティブプレイヤーがいません' : ''}
          >
            一時停止
          </button>
        ) : (
          <button className="btn btn-success" onClick={onResumeGame}>
            再開
          </button>
        )}

        <button className="btn btn-danger" onClick={onResetGame}>
          リセット
        </button>
      </div>

      <div className="control-group">
        <label htmlFor="player-count">プレイヤー数</label>
        <select
          id="player-count"
          className="select"
          value={gameState.players.length}
          onChange={handlePlayerCountChange}
        >
          {playerCountOptions}
        </select>
      </div>

      <div className="control-group">
        <button className="btn btn-secondary" onClick={handleTimerModeToggle}>
          {gameState.timerMode === 'countup' ? 'カウントダウンモードに切替' : 'カウントアップモードに切替'}
        </button>

        {gameState.timerMode === 'countdown' && (
          <div className="initial-time-input">
            <label htmlFor="initial-time">初期時間（秒）</label>
            <input
              id="initial-time"
              type="number"
              className="input"
              value={initialTime}
              onChange={handleInitialTimeChange}
              min="1"
              step="60"
            />
          </div>
        )}
      </div>
    </div>
  );
}

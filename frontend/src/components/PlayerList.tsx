import type { Player, TimerMode } from '../types/GameState';
import { TimeFormatter } from '../types/GameState';
import './PlayerList.css';

export interface PlayerListProps {
  players: Player[];
  activePlayerId: string | null;
  timerMode?: TimerMode;
}

/**
 * プレイヤー一覧コンポーネント
 * - プレイヤー名とタイマー値を表示
 * - アクティブプレイヤーをビジュアルハイライト
 * - カウントダウンモードでの時間切れを視覚通知
 */
export function PlayerList({
  players,
  activePlayerId,
  timerMode = 'count-up'
}: PlayerListProps) {
  const isPlayerActive = (playerId: string) => playerId === activePlayerId;

  const isTimeExpired = (player: Player) =>
    timerMode === 'count-down' && player.elapsedTimeSeconds === 0;

  return (
    <ul className="player-list" role="list">
      {players.map((player) => {
        const isActive = isPlayerActive(player.id);
        const expired = isTimeExpired(player);
        const cardClasses = [
          'player-card',
          isActive && 'active',
          expired && 'time-expired'
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li key={player.id} className={cardClasses} role="listitem">
            <div className="player-name">{player.name}</div>
            <div className="player-timer">
              {TimeFormatter.formatElapsedTime(player.elapsedTimeSeconds)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

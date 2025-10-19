import type { Player } from '../types/GameState';
import './TopTimePlayerIndicator.css';

/**
 * TopTimePlayerIndicator コンポーネント
 * 最も時間を使っているプレイヤーを別枠で表示する
 *
 * 表示条件:
 * - longestPlayer !== null（親コンポーネントで判定）
 *
 * 表示内容:
 * - "最も時間を使っているプレイヤー: [プレイヤー名] (HH:MM:SS)"
 *
 * 要件トレーサビリティ:
 * - 要件2.1: 指定フォーマットで表示
 * - 要件2.2: HH:MM:SS形式
 * - 要件2.3: 視覚的に目立つスタイル
 * - 要件2.4: プレイヤー名または番号表示
 */
/**
 * サーバー側とクライアント側の両方の型に対応
 */
type LongestPlayer = Player | { index: number; name: string; elapsedSeconds: number };

interface TopTimePlayerIndicatorProps {
  longestPlayer: LongestPlayer | null;
}

export function TopTimePlayerIndicator({ longestPlayer }: TopTimePlayerIndicatorProps) {
  // 表示条件を満たさない場合は非表示
  if (!longestPlayer) {
    return null;
  }

  // 時間をHH:MM:SS形式にフォーマット
  // formatTime()はMM:SS形式なので、HH:MM:SS形式に変換
  // elapsedTimeSeconds (Phase 1) または elapsedSeconds (Phase 2) を使用
  const totalSeconds = 'elapsedTimeSeconds' in longestPlayer
    ? longestPlayer.elapsedTimeSeconds
    : longestPlayer.elapsedSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="top-time-indicator">
      <span className="top-time-indicator__label">
        最も時間を使っているプレイヤー:
      </span>
      {' '}
      <span className="top-time-indicator__player-name">
        {longestPlayer.name}
      </span>
      {' '}
      <span className="top-time-indicator__time">
        ({formattedTime})
      </span>
    </div>
  );
}

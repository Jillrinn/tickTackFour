import './PrimaryControls.css';

interface PrimaryControlsProps {
  /** 一時停止状態 */
  isPaused: boolean;
  /** 一時停止/再開切り替え関数 */
  onPauseToggle: (paused: boolean) => void;
}

/**
 * 主要操作セクションコンポーネント
 * - 頻繁に使用する操作（一時停止/再開）を提供
 * - Requirement 1.2: 主要操作セクションの実装
 */
export function PrimaryControls({ isPaused, onPauseToggle }: PrimaryControlsProps) {
  const handlePauseToggle = () => {
    onPauseToggle(!isPaused);
  };

  return (
    <div className="primary-controls" data-testid="primary-controls">
      <button
        onClick={handlePauseToggle}
        data-testid="pause-toggle-btn"
        className="pause-toggle-btn"
      >
        {isPaused ? '再開' : '一時停止'}
      </button>
    </div>
  );
}

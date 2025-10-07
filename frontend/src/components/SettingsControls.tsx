import React from 'react';
import './SettingsControls.css';

interface SettingsControlsProps {
  /** リセット関数 */
  onReset: () => void;
  /** ゲーム進行中かどうか（無効化判定用） */
  isGameInProgress: boolean;
  /** 子要素（プレイヤー人数ドロップダウン、カウントモードトグルスイッチなど） */
  children?: React.ReactNode;
}

/**
 * 設定・その他セクションコンポーネント
 * - 低頻度の設定変更操作（プレイヤー人数、カウントモード、リセット）を提供
 * - Requirement 1.3: 設定・その他セクションの実装
 */
export function SettingsControls({ onReset, children }: SettingsControlsProps) {
  return (
    <div className="settings-controls" data-testid="settings-controls">
      <h3>設定・その他</h3>
      <div className="settings-grid">
        {children}
        <button
          onClick={onReset}
          data-testid="reset-btn"
          className="reset-btn"
        >
          リセット
        </button>
      </div>
    </div>
  );
}

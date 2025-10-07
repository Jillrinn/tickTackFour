import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameTimer } from '../GameTimer';

describe('GameTimer - Task 1.2: 設定・その他セクション', () => {
  it('主要操作セクション（primary-controls）が存在すること', () => {
    render(<GameTimer />);
    const primarySection = screen.getByTestId('primary-controls');
    expect(primarySection).toBeInTheDocument();
  });

  it('設定・その他セクション（settings-controls）が存在すること', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    expect(settingsSection).toBeInTheDocument();
  });

  it('主要操作セクションに一時停止/再開ボタンが配置されていること', () => {
    render(<GameTimer />);
    const primarySection = screen.getByTestId('primary-controls');
    const pauseButton = screen.getByText(/一時停止|再開/);
    expect(primarySection).toContainElement(pauseButton);
  });

  it('設定・その他セクションにプレイヤー人数ドロップダウンが配置されていること（Phase 3で変更）', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    const dropdown = screen.getByTestId('player-count-dropdown');
    expect(settingsSection).toContainElement(dropdown);
  });

  it('設定・その他セクションにカウントモードトグルスイッチが配置されていること（Phase 4で変更）', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    const toggleSwitch = screen.getByTestId('timer-mode-toggle');
    expect(settingsSection).toContainElement(toggleSwitch);
  });

  it('設定・その他セクションにリセットボタンが配置されていること', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    const resetButton = screen.getByText('リセット');
    expect(settingsSection).toContainElement(resetButton);
  });

  it('カウントダウン設定UIが存在し、条件付きで表示されること', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    // カウントダウンモード時のみ表示される設定UI要素を確認
    const countdownControl = settingsSection.querySelector('.countdown-control');
    // 初期状態（カウントアップモード）では非表示
    expect(countdownControl).not.toBeInTheDocument();
  });
});

describe('GameTimer - Task 1.3: セクション境界の視覚的区切り', () => {
  it('主要操作セクションと設定・その他セクションが視覚的に区別されるCSSクラスを持つこと', () => {
    render(<GameTimer />);
    const primarySection = screen.getByTestId('primary-controls');
    const settingsSection = screen.getByTestId('settings-controls');

    // CSSクラス名の存在確認
    expect(primarySection).toHaveClass('primary-controls');
    expect(settingsSection).toHaveClass('settings-controls');
  });

  it('主要操作セクションが設定・その他セクションの前に配置されていること（DOM順序）', () => {
    render(<GameTimer />);
    const controlsSection = screen.getByTestId('controls-section');
    const primarySection = screen.getByTestId('primary-controls');
    const settingsSection = screen.getByTestId('settings-controls');

    // DOM上でprimaryがsettingsより前にあることを確認
    const children = Array.from(controlsSection.children);
    const primaryIndex = children.indexOf(primarySection);
    const settingsIndex = children.indexOf(settingsSection);
    expect(primaryIndex).toBeLessThan(settingsIndex);
  });
});

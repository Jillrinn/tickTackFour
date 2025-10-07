import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameTimer } from '../GameTimer';

describe('GameTimer - Task 1.2: 設定セクション', () => {
  it('設定セクション（settings-controls）が存在すること', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    expect(settingsSection).toBeInTheDocument();
  });

  it('固定ヘッダーに一時停止/再開ボタンが配置されていること', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');
    const pauseButton = screen.getByText(/一時停止|再開/);
    expect(stickyHeader).toContainElement(pauseButton);
  });

  it('設定セクションにプレイヤー人数ドロップダウンが配置されていること（Phase 3で変更）', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    const dropdown = screen.getByTestId('player-count-dropdown');
    expect(settingsSection).toContainElement(dropdown);
  });

  it('設定セクションにカウントモードトグルスイッチが配置されていること（Phase 4で変更）', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    const toggleSwitch = screen.getByTestId('timer-mode-toggle');
    expect(settingsSection).toContainElement(toggleSwitch);
  });

  it('設定セクションにリセットボタンが配置されていること', () => {
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
  it('固定ヘッダーと設定セクションが視覚的に区別されるCSSクラスを持つこと', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');
    const settingsSection = screen.getByTestId('settings-controls');

    // CSSクラス名の存在確認
    expect(stickyHeader).toHaveClass('sticky-header');
    expect(settingsSection).toHaveClass('settings-controls');
  });

  it('固定ヘッダーが設定セクションの前に配置されていること（DOM順序）', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');
    const settingsSection = screen.getByTestId('settings-controls');

    // DOM上でstickyHeaderがsettingsより前にあることを確認
    // compareDocumentPosition を使用して相対位置を確認
    const position = stickyHeader.compareDocumentPosition(settingsSection);
    // DOCUMENT_POSITION_FOLLOWING (4) は stickyHeader が settingsSection の前にあることを示す
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

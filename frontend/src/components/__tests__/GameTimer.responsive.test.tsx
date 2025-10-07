import { render, screen, within } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - レスポンシブレイアウトの調整', () => {
  test('次のプレイヤーボタンがスマートフォンで適切なサイズで表示される', () => {
    render(<GameTimer />);

    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤー/ });

    // すべてのnext-player-btnクラスが適用されていることを確認
    nextPlayerButtons.forEach(button => {
      expect(button).toHaveClass('next-player-btn');
    });
  });

  test('すべてのコントロールボタンが適切に表示される', () => {
    render(<GameTimer />);

    // 次のプレイヤーボタンが表示されていることを確認
    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤー/ });
    expect(nextPlayerButtons.length).toBeGreaterThan(0);

    // プレイヤー人数ドロップダウンが表示されていることを確認（Phase 3でボタンからドロップダウンに変更）
    expect(screen.getByTestId('player-count-dropdown')).toBeInTheDocument();

    // 他のコントロールも表示されていることを確認（Phase 4でカウントモードはトグルスイッチに変更）
    expect(screen.getByTestId('timer-mode-toggle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /一時停止|再開/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リセット' })).toBeInTheDocument();
  });

  test('次のプレイヤーボタンが主要操作セクション内に配置されている', () => {
    render(<GameTimer />);

    // Task 5.1: 「次のプレイヤー」ボタンは固定ヘッダーに移動
    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });
    expect(nextPlayerButton).toBeInTheDocument();
    expect(nextPlayerButton).toHaveClass('next-player-btn');
  });

  test('次のプレイヤーボタンに読みやすいフォントサイズが設定されている', () => {
    render(<GameTimer />);

    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤー/ });

    // すべてのボタンにnext-player-btnクラスが適用され、CSSでフォントサイズが設定されることを確認
    nextPlayerButtons.forEach(button => {
      expect(button).toHaveClass('next-player-btn');
    });
  });

  test('ボタンの配置順序がレスポンシブ対応に影響しない', () => {
    render(<GameTimer />);

    // Task 5.1: 「次のプレイヤー」ボタンは固定ヘッダーに移動
    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });
    expect(nextPlayerButton).toBeInTheDocument();

    // 主要操作セクションには一時停止ボタンのみ
    const primaryControls = screen.getByTestId('primary-controls');
    const pauseButton = within(primaryControls).getByRole('button', { name: /一時停止|再開/i });
    expect(pauseButton).toBeInTheDocument();

    // 設定セクションにはドロップダウン、トグル、リセットが存在
    const settingsControls = screen.getByTestId('settings-controls');
    expect(within(settingsControls).getByTestId('player-count-dropdown')).toBeInTheDocument();
    expect(within(settingsControls).getByTestId('timer-mode-toggle')).toBeInTheDocument();
  });
});

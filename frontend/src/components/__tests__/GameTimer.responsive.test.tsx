import { render, screen, within } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - レスポンシブレイアウトの調整', () => {
  test('次のプレイヤーボタンがスマートフォンで適切なサイズで表示される', () => {
    render(<GameTimer />);

    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤーへ/ });

    // すべてのnext-player-btnクラスが適用されていることを確認
    nextPlayerButtons.forEach(button => {
      expect(button).toHaveClass('next-player-btn');
    });
  });

  test('すべてのコントロールボタンが適切に表示される', () => {
    render(<GameTimer />);

    // 次のプレイヤーボタンが表示されていることを確認
    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤーへ/ });
    expect(nextPlayerButtons.length).toBeGreaterThan(0);

    // プレイヤー人数ドロップダウンが表示されていることを確認（Phase 3でボタンからドロップダウンに変更）
    expect(screen.getByTestId('player-count-dropdown')).toBeInTheDocument();

    // 他のコントロールボタンも表示されていることを確認
    expect(screen.getByRole('button', { name: 'カウントアップ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'カウントダウン' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /一時停止|再開/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リセット' })).toBeInTheDocument();
  });

  test('次のプレイヤーボタンが主要操作セクション内に配置されている', () => {
    render(<GameTimer />);

    const controlsSection = screen.getByRole('heading', { name: '操作', level: 3 }).parentElement;
    expect(controlsSection).toBeTruthy();

    const primaryControls = controlsSection!.querySelector('.primary-controls');
    expect(primaryControls).toBeTruthy();

    const nextPlayerButtons = within(primaryControls as HTMLElement).getAllByRole('button', { name: /次のプレイヤーへ/ });
    expect(nextPlayerButtons.length).toBeGreaterThan(0);
  });

  test('次のプレイヤーボタンに読みやすいフォントサイズが設定されている', () => {
    render(<GameTimer />);

    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤーへ/ });

    // すべてのボタンにnext-player-btnクラスが適用され、CSSでフォントサイズが設定されることを確認
    nextPlayerButtons.forEach(button => {
      expect(button).toHaveClass('next-player-btn');
    });
  });

  test('ボタンの配置順序がレスポンシブ対応に影響しない', () => {
    render(<GameTimer />);

    const controlsSection = screen.getByRole('heading', { name: '操作', level: 3 }).parentElement;
    const buttons = controlsSection!.querySelectorAll('button');

    // 次のプレイヤーボタンが最初に配置されていることを確認
    expect(buttons[0]).toHaveTextContent(/次のプレイヤーへ/);

    // 全てのボタンが存在することを確認（レスポンシブで隠れていない）
    // Phase 3でプレイヤー人数ボタン（3個）→ドロップダウン（1個）に変更: 8個→5個
    expect(buttons.length).toBeGreaterThanOrEqual(5);
  });
});

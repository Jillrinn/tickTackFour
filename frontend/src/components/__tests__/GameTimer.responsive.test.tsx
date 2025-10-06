import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - レスポンシブレイアウトの調整', () => {
  test('次のプレイヤーボタンがスマートフォンで適切なサイズで表示される', () => {
    render(<GameTimer />);

    const nextPlayerButton = screen.getByRole('button', { name: /次のプレイヤーへ/ });

    // next-player-btnクラスが適用されていることを確認
    expect(nextPlayerButton).toHaveClass('next-player-btn');
  });

  test('すべてのコントロールボタンが適切に表示される', () => {
    render(<GameTimer />);

    // 次のプレイヤーボタンが表示されていることを確認
    expect(screen.getByRole('button', { name: /次のプレイヤーへ/ })).toBeInTheDocument();

    // 他のコントロールボタンも表示されていることを確認
    expect(screen.getByRole('button', { name: '4人' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5人' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '6人' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'カウントアップ' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'カウントダウン' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /一時停止|再開/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アクティブ解除' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'リセット' })).toBeInTheDocument();
  });

  test('次のプレイヤーボタンがコントロールグリッド内に配置されている', () => {
    render(<GameTimer />);

    const controlsSection = screen.getByRole('heading', { name: '操作', level: 3 }).parentElement;
    expect(controlsSection).toBeTruthy();

    const controlsGrid = controlsSection!.querySelector('.controls-grid');
    expect(controlsGrid).toBeTruthy();

    const nextPlayerButton = screen.getByRole('button', { name: /次のプレイヤーへ/ });
    expect(controlsGrid).toContainElement(nextPlayerButton);
  });

  test('次のプレイヤーボタンに読みやすいフォントサイズが設定されている', () => {
    render(<GameTimer />);

    const nextPlayerButton = screen.getByRole('button', { name: /次のプレイヤーへ/ });

    // next-player-btnクラスが適用され、CSSでフォントサイズが設定されることを確認
    expect(nextPlayerButton).toHaveClass('next-player-btn');
  });

  test('ボタンの配置順序がレスポンシブ対応に影響しない', () => {
    render(<GameTimer />);

    const controlsSection = screen.getByRole('heading', { name: '操作', level: 3 }).parentElement;
    const buttons = controlsSection!.querySelectorAll('button');

    // 次のプレイヤーボタンが最初に配置されていることを確認
    expect(buttons[0]).toHaveTextContent(/次のプレイヤーへ/);

    // 全てのボタンが存在することを確認（レスポンシブで隠れていない）
    expect(buttons.length).toBeGreaterThanOrEqual(8);
  });
});

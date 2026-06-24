import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameTimer } from '../GameTimer';

// テスト環境ではフォールバックモード（VITEST）でレンダリングされる前提
describe('GameTimer カタンモードUI', () => {
  it('設定にカタンモードトグルが表示される', () => {
    render(<GameTimer />);
    expect(screen.getByTestId('game-mode-toggle')).toBeInTheDocument();
  });

  it('カタンON＋ゲーム開始でフェーズバッジ（フェーズ1）が表示される', () => {
    render(<GameTimer />);
    fireEvent.click(screen.getByTestId('game-mode-toggle')); // カタンON
    fireEvent.click(screen.getByTestId('start-game-button')); // 開始（t=0）
    const badge = screen.getByTestId('phase-badge');
    expect(badge).toHaveTextContent('フェーズ1');
  });

  it('未開始ではフェーズバッジは表示されない', () => {
    render(<GameTimer />);
    fireEvent.click(screen.getByTestId('game-mode-toggle'));
    expect(screen.queryByTestId('phase-badge')).not.toBeInTheDocument();
  });
});

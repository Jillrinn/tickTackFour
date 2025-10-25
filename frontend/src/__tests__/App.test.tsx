import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('AppとGameTimerの両方をレンダリングする', () => {
    const { container } = render(<App />);

    // AppHeaderが存在することを確認
    const header = container.querySelector('header.app-header');
    expect(header).toBeTruthy();

    // GameTimerが存在することを確認（game-timerクラスで識別）
    const gameTimer = container.querySelector('.game-timer');
    expect(gameTimer).toBeTruthy();
  });

  it('AppHeaderがGameTimerより先に表示される（DOM順序）', () => {
    const { container } = render(<App />);

    // すべての要素を取得してindexを比較
    const allElements = container.querySelectorAll('*');
    let headerIndex = -1;
    let gameTimerIndex = -1;

    allElements.forEach((el, index) => {
      if (el.classList.contains('app-header')) {
        headerIndex = index;
      }
      if (el.classList.contains('game-timer')) {
        gameTimerIndex = index;
      }
    });

    // ヘッダーが見つかり、GameTimerより前にあることを確認
    expect(headerIndex).toBeGreaterThan(-1);
    expect(gameTimerIndex).toBeGreaterThan(-1);
    expect(headerIndex).toBeLessThan(gameTimerIndex);
  });

  it('AppHeaderロゴが正しく表示される', () => {
    render(<App />);

    const logo = screen.getByTestId('app-header-logo');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toBe('/ONEmore Turn LOGO.png');
  });
});

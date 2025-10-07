import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - 次のプレイヤーボタンの配置最適化', () => {
  test('次のプレイヤーボタンが固定ヘッダーに表示される（Task 5.1）', () => {
    render(<GameTimer />);

    // Task 5.1: 「次のプレイヤー」ボタンは固定ヘッダー内に移動
    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });

    // 固定ヘッダー内に「次のプレイヤー」ボタンが存在することを確認
    expect(nextPlayerButton).toBeInTheDocument();
  });

  test('次のプレイヤーボタンが最も視認しやすい位置に配置されている', () => {
    render(<GameTimer />);

    const nextPlayerButton = screen.getByRole('button', { name: /次のプレイヤー/i });

    // 次のプレイヤーボタンにnext-player-btnクラスが適用されていることを確認（強調表示用）
    expect(nextPlayerButton).toHaveClass('next-player-btn');
  });

  test('次のプレイヤーボタンをクリックするとターン切り替えが即座に実行される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const playerCards = screen.getAllByRole('listitem');

    // 初期状態: activeクラスを持つプレイヤーカードがない
    playerCards.forEach(card => {
      expect(card).not.toHaveClass('active');
    });

    // 次のプレイヤーボタンをクリック
    const nextPlayerButton = screen.getByRole('button', { name: /次のプレイヤー/i });
    await user.click(nextPlayerButton);

    // ターンが切り替わっていることを確認（1人目がactiveクラスを持つ）
    const updatedPlayerCards = screen.getAllByRole('listitem');
    expect(updatedPlayerCards[0]).toHaveClass('active');
  });

  test('固定ヘッダーに一時停止ボタンと次のプレイヤーボタンが存在する', () => {
    render(<GameTimer />);

    // 固定ヘッダー内に両方のボタンが存在
    const stickyHeader = screen.getByTestId('sticky-header');
    const pauseButton = within(stickyHeader).getByRole('button', { name: /一時停止|再開/i });
    const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });

    expect(pauseButton).toBeInTheDocument();
    expect(nextPlayerButton).toBeInTheDocument();
  });

  test('固定ヘッダーのボタンが適切に配置されている', () => {
    render(<GameTimer />);

    // 固定ヘッダー内のボタンを確認
    const stickyHeader = screen.getByTestId('sticky-header');
    const buttons = within(stickyHeader).getAllByRole('button');

    // 2つのボタンが存在（一時停止と次のプレイヤー）
    expect(buttons).toHaveLength(2);

    // 一時停止ボタンが最初
    expect(buttons[0]).toHaveClass('pause-btn');

    // 次のプレイヤーボタンが2番目
    expect(buttons[1]).toHaveClass('next-player-btn');
  });
});

import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - 次のプレイヤーボタンの配置最適化', () => {
  test('次のプレイヤーボタンが固定ヘッダーに表示される（Task 5.1）', () => {
    render(<GameTimer />);

    // Task 5.1: 「次のプレイヤーへ」ボタンは固定ヘッダー内に移動
    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤーへ/i });

    // 固定ヘッダー内に「次のプレイヤーへ」ボタンが存在することを確認
    expect(nextPlayerButton).toBeInTheDocument();
  });

  test('次のプレイヤーボタンが最も視認しやすい位置に配置されている', () => {
    render(<GameTimer />);

    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤーへ/ });

    // すべての次のプレイヤーボタンにnext-player-btnクラスが適用されていることを確認（強調表示用）
    nextPlayerButtons.forEach(button => {
      expect(button).toHaveClass('next-player-btn');
    });
  });

  test('次のプレイヤーボタンをクリックするとターン切り替えが即座に実行される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const playerCards = screen.getAllByRole('listitem');

    // 初期状態: activeクラスを持つプレイヤーカードがない
    playerCards.forEach(card => {
      expect(card).not.toHaveClass('active');
    });

    // 次のプレイヤーボタンをクリック（最初のボタンを使用）
    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤーへ/ });
    await user.click(nextPlayerButtons[0]);

    // ターンが切り替わっていることを確認（1人目がactiveクラスを持つ）
    const updatedPlayerCards = screen.getAllByRole('listitem');
    expect(updatedPlayerCards[0]).toHaveClass('active');
  });

  test('主要操作セクションには一時停止ボタンのみ存在する（Task 5.1）', () => {
    render(<GameTimer />);

    // Task 5.1: 主要操作セクションには一時停止ボタンのみ
    const primaryControls = screen.getByTestId('primary-controls');
    const buttonsInPrimaryControls = within(primaryControls).getAllByRole('button');

    // ボタンが1つのみ（一時停止/再開）
    expect(buttonsInPrimaryControls).toHaveLength(1);
    expect(buttonsInPrimaryControls[0]).toHaveTextContent(/一時停止|再開/);
  });

  test('固定ヘッダーと主要操作セクションが適切に分離される（Task 5.1）', () => {
    render(<GameTimer />);

    // 固定ヘッダーに「次のプレイヤーへ」ボタンが存在
    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtonInHeader = within(stickyHeader).getByRole('button', { name: /次のプレイヤーへ/i });
    expect(nextPlayerButtonInHeader).toBeInTheDocument();

    // 主要操作セクションには「次のプレイヤーへ」ボタンが存在しない
    const primaryControls = screen.getByTestId('primary-controls');
    const buttonsInPrimaryControls = within(primaryControls).queryAllByRole('button', { name: /次のプレイヤーへ/i });
    expect(buttonsInPrimaryControls).toHaveLength(0);

    // 主要操作セクションには一時停止ボタンのみ
    const pauseButton = within(primaryControls).getByRole('button', { name: /一時停止|再開/i });
    expect(pauseButton).toBeInTheDocument();
  });
});

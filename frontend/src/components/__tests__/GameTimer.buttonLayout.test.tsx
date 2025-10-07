import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - 次のプレイヤーボタンの配置最適化', () => {
  test('次のプレイヤーボタンがゲームコントロールエリアの最上部に表示される', () => {
    render(<GameTimer />);

    // 操作セクション内のすべてのボタンを取得
    const controlsSection = screen.getByRole('heading', { name: '操作', level: 3 }).parentElement;
    expect(controlsSection).toBeTruthy();

    const buttonsInControls = within(controlsSection!).getAllByRole('button');

    // 最初のボタンが「次のプレイヤーへ」であることを確認
    expect(buttonsInControls[0]).toHaveTextContent(/次のプレイヤーへ/);
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

  test('次のプレイヤーボタンが他のコントロールボタンより前に配置される', () => {
    render(<GameTimer />);

    const controlsSection = screen.getByRole('heading', { name: '操作', level: 3 }).parentElement;
    const buttonsInControls = within(controlsSection!).getAllByRole('button');

    // 次のプレイヤーボタンのインデックスを取得
    const nextPlayerIndex = buttonsInControls.findIndex(btn =>
      btn.textContent?.includes('次のプレイヤーへ')
    );

    // 4人/5人/6人ボタンのインデックスを取得
    const playerCountButtonIndex = buttonsInControls.findIndex(btn =>
      btn.textContent === '4人'
    );

    // 次のプレイヤーボタンがプレイヤー数ボタンより前にあることを確認
    expect(nextPlayerIndex).toBeLessThan(playerCountButtonIndex);
  });

  test('次のプレイヤーボタンの配置により操作フローが改善される', () => {
    render(<GameTimer />);

    const controlsSection = screen.getByRole('heading', { name: '操作', level: 3 }).parentElement;
    const buttonsInControls = within(controlsSection!).getAllByRole('button');

    // 最初のボタンが次のプレイヤーボタンであることを確認
    expect(buttonsInControls[0]).toHaveTextContent(/次のプレイヤーへ/);

    // 2番目以降に他の操作ボタンが配置されることを確認
    expect(buttonsInControls[1]).toHaveTextContent(/4人|5人|6人|カウントアップ|カウントダウン|一時停止|リセット/);
  });
});

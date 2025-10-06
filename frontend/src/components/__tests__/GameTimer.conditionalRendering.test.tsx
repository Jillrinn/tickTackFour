import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - 条件付きレンダリング', () => {
  test('カウントアップモード選択時にカウントダウン秒数設定UIが非表示', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // カウントアップボタンをクリック
    const countUpButton = screen.getByRole('button', { name: 'カウントアップ' });
    await user.click(countUpButton);

    // カウントダウン秒数入力フィールドが非表示
    expect(screen.queryByDisplayValue('600')).not.toBeInTheDocument();

    // 秒数ラベルも非表示
    expect(screen.queryByText('秒')).not.toBeInTheDocument();
  });

  test('カウントダウンモード選択時にカウントダウン秒数設定UIが表示', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // まずカウントアップモードに切り替え（初期状態確認）
    const countUpButton = screen.getByRole('button', { name: 'カウントアップ' });
    await user.click(countUpButton);

    // カウントダウンボタンをクリック
    const countDownButton = screen.getByRole('button', { name: 'カウントダウン' });
    await user.click(countDownButton);

    // カウントダウン秒数入力フィールドが表示
    expect(screen.getByDisplayValue('600')).toBeInTheDocument();

    // 秒数ラベルも表示
    expect(screen.getByText('秒')).toBeInTheDocument();
  });

  test('タイマーモード切り替え時に関連UI要素の表示・非表示を即座に切り替え', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // 初期状態: カウントダウン秒数設定UIが表示されている（デフォルトはカウントアップモード）
    // カウントダウンボタンをクリック
    const countDownButton = screen.getByRole('button', { name: 'カウントダウン' });
    await user.click(countDownButton);

    // カウントダウン秒数設定UIが表示される
    expect(screen.getByDisplayValue('600')).toBeInTheDocument();

    // カウントアップボタンをクリック
    const countUpButton = screen.getByRole('button', { name: 'カウントアップ' });
    await user.click(countUpButton);

    // カウントダウン秒数設定UIが即座に非表示
    expect(screen.queryByDisplayValue('600')).not.toBeInTheDocument();
  });

  test('カウントアップモード時にカウントダウン専用設定項目を一切表示しない', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // カウントアップボタンをクリック
    const countUpButton = screen.getByRole('button', { name: 'カウントアップ' });
    await user.click(countUpButton);

    // カウントダウン専用のUI要素が存在しないことを確認
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument(); // number input
    expect(screen.queryByText('秒')).not.toBeInTheDocument();
  });

  test('カウントダウンモードからカウントアップモードに切り替えても設定値が保持される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // カウントダウンモードに切り替え
    const countDownButton = screen.getByRole('button', { name: 'カウントダウン' });
    await user.click(countDownButton);

    // カウントダウン秒数を変更
    const countdownInput = screen.getByDisplayValue('600');
    await user.clear(countdownInput);
    await user.type(countdownInput, '300');

    // カウントアップモードに切り替え（UIは非表示になる）
    const countUpButton = screen.getByRole('button', { name: 'カウントアップ' });
    await user.click(countUpButton);

    // 再度カウントダウンモードに切り替え
    await user.click(countDownButton);

    // 設定値が保持されていることを確認
    expect(screen.getByDisplayValue('300')).toBeInTheDocument();
  });
});

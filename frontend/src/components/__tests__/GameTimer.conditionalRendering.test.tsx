import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - 条件付きレンダリング', () => {
  test('カウントアップモード選択時にカウントダウン秒数設定UIが非表示', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // トグルスイッチを使ってカウントダウンに切り替え（Phase 4で変更）
    const toggleSwitch = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    await user.click(toggleSwitch);

    // カウントダウン秒数設定UIが表示される
    expect(screen.getByDisplayValue('600')).toBeInTheDocument();

    // カウントアップモードに戻す
    await user.click(toggleSwitch);

    // カウントダウン秒数入力フィールドが非表示
    expect(screen.queryByDisplayValue('600')).not.toBeInTheDocument();

    // 秒数ラベルも非表示
    expect(screen.queryByText('秒')).not.toBeInTheDocument();
  });

  test('カウントダウンモード選択時にカウントダウン秒数設定UIが表示', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // 初期状態はカウントアップモードなのでUIは非表示
    expect(screen.queryByDisplayValue('600')).not.toBeInTheDocument();

    // トグルスイッチをクリックしてカウントダウンモードに切り替え（Phase 4で変更）
    const toggleSwitch = screen.getByTestId('timer-mode-toggle');
    await user.click(toggleSwitch);

    // カウントダウン秒数入力フィールドが表示
    expect(screen.getByDisplayValue('600')).toBeInTheDocument();

    // 秒数ラベルも表示
    expect(screen.getByText('秒')).toBeInTheDocument();
  });

  test('タイマーモード切り替え時に関連UI要素の表示・非表示を即座に切り替え', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // トグルスイッチをクリックしてカウントダウンモードに切り替え（Phase 4で変更）
    const toggleSwitch = screen.getByTestId('timer-mode-toggle');
    await user.click(toggleSwitch);

    // カウントダウン秒数設定UIが表示される
    expect(screen.getByDisplayValue('600')).toBeInTheDocument();

    // トグルスイッチをクリックしてカウントアップモードに切り替え
    await user.click(toggleSwitch);

    // カウントダウン秒数設定UIが即座に非表示
    expect(screen.queryByDisplayValue('600')).not.toBeInTheDocument();
  });

  test('カウントアップモード時にカウントダウン専用設定項目を一切表示しない', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // 初期状態はカウントアップモード
    const toggleSwitch = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    expect(toggleSwitch.checked).toBe(false);

    // カウントダウン専用のUI要素が存在しないことを確認
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument(); // number input
    expect(screen.queryByText('秒')).not.toBeInTheDocument();
  });

  test('カウントダウンモードからカウントアップモードに切り替えても設定値が保持される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // トグルスイッチでカウントダウンモードに切り替え（Phase 4で変更）
    const toggleSwitch = screen.getByTestId('timer-mode-toggle');
    await user.click(toggleSwitch);

    // カウントダウン秒数を変更
    const countdownInput = screen.getByDisplayValue('600');
    await user.clear(countdownInput);
    await user.type(countdownInput, '300');

    // カウントアップモードに切り替え（UIは非表示になる）
    await user.click(toggleSwitch);

    // 再度カウントダウンモードに切り替え
    await user.click(toggleSwitch);

    // 設定値が保持されていることを確認
    expect(screen.getByDisplayValue('300')).toBeInTheDocument();
  });
});

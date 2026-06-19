import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { GameTimer } from '../GameTimer';

// フォールバックモードを強制（テスト用）
vi.mock('../../hooks/useFallbackMode', () => ({
  useFallbackMode: () => ({
    isInFallbackMode: true,
    lastError: null,
    retryCount: 0,
    activateFallbackMode: vi.fn(),
    deactivateFallbackMode: vi.fn(),
    incrementRetryCount: vi.fn()
  })
}));

describe('GameTimer - プレイヤー名変更UI（設定カード）', () => {
  test('設定カードの「プレイヤー名変更」に各プレイヤーの入力フィールドが表示される', () => {
    render(<GameTimer />);

    // プレイヤー名入力フィールドは設定カードに集約される
    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });

    // デフォルトで4人のプレイヤーが表示される
    expect(nameInputs).toHaveLength(4);

    // 各入力フィールドにデフォルト名が表示される
    nameInputs.forEach((input, index) => {
      expect(input).toHaveValue(`プレイヤー${index + 1}`);
    });
  });

  test('プレイヤー名入力フィールドをクリックするとテキスト入力が可能', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const input = screen.getByTestId('player-name-edit-input-0');

    // クリックしてフォーカス
    await user.click(input);

    // フォーカスされていることを確認
    expect(input).toHaveFocus();
  });

  test('入力中はドラフト保持、「保存」で初めて一覧表示に反映する', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const input = screen.getByTestId('player-name-edit-input-0');

    // 名前を変更（入力欄＝ドラフトには即時反映）
    await user.clear(input);
    await user.type(input, 'アリス');
    expect(input).toHaveValue('アリス');

    // 保存前: プレイヤー一覧カードにはまだ反映されない
    const firstPlayerCard = screen.getAllByRole('listitem')[0];
    expect(within(firstPlayerCard).queryByText('アリス')).not.toBeInTheDocument();

    // 「保存」押下で初めて一覧に反映される
    await user.click(screen.getByTestId('save-player-names'));
    expect(within(firstPlayerCard).getByText('アリス')).toBeInTheDocument();
  });

  test('保存ボタンは未変更時は無効、変更があると有効になる', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const saveButton = screen.getByTestId('save-player-names');
    // 初期状態（変更なし）: 無効
    expect(saveButton).toBeDisabled();

    // 入力すると有効化
    const input = screen.getByTestId('player-name-edit-input-0');
    await user.type(input, 'X');
    expect(saveButton).toBeEnabled();

    // 保存すると再び無効（未保存変更なし）
    await user.click(saveButton);
    expect(saveButton).toBeDisabled();
  });

  test('プレイヤー名が未設定の場合はデフォルト名を表示', () => {
    render(<GameTimer />);

    // 設定カードの入力欄にデフォルト名が表示されていることを確認
    expect(screen.getByTestId('player-name-edit-input-0')).toHaveValue('プレイヤー1');
    expect(screen.getByTestId('player-name-edit-input-1')).toHaveValue('プレイヤー2');
    expect(screen.getByTestId('player-name-edit-input-2')).toHaveValue('プレイヤー3');
    expect(screen.getByTestId('player-name-edit-input-3')).toHaveValue('プレイヤー4');
  });

  test('複数のプレイヤー名を個別に変更できる', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // 1人目の名前を変更
    const input1 = screen.getByTestId('player-name-edit-input-0');
    await user.clear(input1);
    await user.type(input1, 'アリス');

    // 2人目の名前を変更
    const input2 = screen.getByTestId('player-name-edit-input-1');
    await user.clear(input2);
    await user.type(input2, 'ボブ');

    // それぞれ正しく反映されていることを確認
    expect(input1).toHaveValue('アリス');
    expect(input2).toHaveValue('ボブ');
    expect(screen.getByTestId('player-name-edit-input-2')).toHaveValue('プレイヤー3');
  });

  test('プレイヤー数を変更しても名前が保持される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // 1人目の名前を変更して保存（保存しないとゲーム状態に反映されない）
    const input0 = screen.getByTestId('player-name-edit-input-0');
    await user.clear(input0);
    await user.type(input0, 'アリス');
    await user.click(screen.getByTestId('save-player-names'));

    // プレイヤー数を5人に変更
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;
    await user.selectOptions(dropdown, '5');

    // 1人目の名前が保持されていることを確認
    const updatedInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    expect(updatedInputs).toHaveLength(5);
    expect(screen.getByTestId('player-name-edit-input-0')).toHaveValue('アリス');

    // 5人目はデフォルト名
    expect(screen.getByTestId('player-name-edit-input-4')).toHaveValue('プレイヤー5');
  });

  test('入力フィールドに適切なスタイリングが適用される', () => {
    render(<GameTimer />);

    const input = screen.getByTestId('player-name-edit-input-0');

    // クラス名が適用されていることを確認
    expect(input).toHaveClass('player-name-input');
  });

  test('ゲーム開始中（アクティブプレイヤーあり）でもプレイヤー名を変更できる', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // 1人目をアクティブにしてゲームを開始状態にする
    const firstPlayerCard = screen.getAllByRole('listitem')[0];
    await user.click(within(firstPlayerCard).getByText('アクティブに設定'));

    // 設定カードの入力欄はプレイ中でも編集可能（disabledではない）
    const input = screen.getByTestId('player-name-edit-input-0');
    expect(input).not.toBeDisabled();

    await user.clear(input);
    await user.type(input, 'プレイ中変更');
    expect(input).toHaveValue('プレイ中変更');

    // 「保存」で一覧カードの表示に反映される
    await user.click(screen.getByTestId('save-player-names'));
    expect(within(firstPlayerCard).getByText('プレイ中変更')).toBeInTheDocument();
  });
});

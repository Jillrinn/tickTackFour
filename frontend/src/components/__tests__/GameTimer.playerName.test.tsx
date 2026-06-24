import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';
import { useServerGameState } from '../../hooks/useServerGameState';
import { useGameApi } from '../../hooks/useGameApi';
import { usePollingSync } from '../../hooks/usePollingSync';
import { useETagManager } from '../../hooks/useETagManager';
import { usePlayerNameHistory } from '../../hooks/usePlayerNameHistory';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - プレイヤー名変更UI（設定カード）', () => {
  test('設定カードの「プレイヤー名変更」に各プレイヤーの入力フィールドが表示される', () => {
    renderGameTimer();

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
    renderGameTimer();

    const input = screen.getByTestId('player-name-edit-input-0');

    // クリックしてフォーカス
    await user.click(input);

    // フォーカスされていることを確認
    expect(input).toHaveFocus();
  });

  test('保存ボタンクリックでupdatePlayerName APIが呼ばれる（ドラフト変更後に保存）', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const input = screen.getByTestId('player-name-edit-input-0');

    // 名前を変更（ドラフトに即時反映）
    await user.clear(input);
    await user.type(input, 'アリス');
    expect(input).toHaveValue('アリス');

    // 「保存」押下でupdatePlayerName APIが呼ばれる
    await user.click(screen.getByTestId('save-player-names'));
    await vi.waitFor(() => {
      expect(mockApi.updatePlayerName).toHaveBeenCalledTimes(1);
      expect(mockApi.updatePlayerName).toHaveBeenCalledWith(0, 'アリス', 'mock-etag');
    });
  });

  test('保存ボタンは未変更時は無効、変更があると有効になり、保存でupdatePlayerName APIが呼ばれる', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const saveButton = screen.getByTestId('save-player-names');
    // 初期状態（変更なし）: 無効
    expect(saveButton).toBeDisabled();

    // 入力すると有効化
    const input = screen.getByTestId('player-name-edit-input-0');
    await user.type(input, 'X');
    expect(saveButton).toBeEnabled();

    // 保存でupdatePlayerName APIが呼ばれる
    await user.click(saveButton);
    await vi.waitFor(() => {
      expect(mockApi.updatePlayerName).toHaveBeenCalledTimes(1);
      expect(mockApi.updatePlayerName.mock.calls[0][2]).toBe('mock-etag');
    });
  });

  test('プレイヤー名が未設定の場合はデフォルト名を表示', () => {
    renderGameTimer();

    // 設定カードの入力欄にデフォルト名が表示されていることを確認
    expect(screen.getByTestId('player-name-edit-input-0')).toHaveValue('プレイヤー1');
    expect(screen.getByTestId('player-name-edit-input-1')).toHaveValue('プレイヤー2');
    expect(screen.getByTestId('player-name-edit-input-2')).toHaveValue('プレイヤー3');
    expect(screen.getByTestId('player-name-edit-input-3')).toHaveValue('プレイヤー4');
  });

  test('複数のプレイヤー名を個別に変更できる', async () => {
    const user = userEvent.setup();
    renderGameTimer();

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

  test('名前変更後に保存するとupdatePlayerName APIが正しい引数で呼ばれる', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    // 1人目の名前を変更して保存
    const input0 = screen.getByTestId('player-name-edit-input-0');
    await user.clear(input0);
    await user.type(input0, 'アリス');
    await user.click(screen.getByTestId('save-player-names'));

    await vi.waitFor(() => {
      expect(mockApi.updatePlayerName).toHaveBeenCalledWith(0, 'アリス', 'mock-etag');
    });
  });

  test('入力フィールドに適切なスタイリングが適用される', () => {
    renderGameTimer();

    const input = screen.getByTestId('player-name-edit-input-0');

    // クラス名が適用されていることを確認
    expect(input).toHaveClass('player-name-input');
  });

  test('ゲーム開始中でも入力フィールドはdisabledにならない（入力可能）', async () => {
    const user = userEvent.setup();
    // アクティブプレイヤーあり（ゲーム開始済み）の状態でレンダリング
    renderGameTimer({
      serverState: { activePlayerIndex: 0, isPaused: false },
    });

    // 設定カードの入力欄はプレイ中でも編集可能（disabledではない）
    const input = screen.getByTestId('player-name-edit-input-0');
    expect(input).not.toBeDisabled();

    await user.clear(input);
    await user.type(input, 'プレイ中変更');
    expect(input).toHaveValue('プレイ中変更');

    // 「保存」でupdatePlayerName APIが呼ばれる
    await user.click(screen.getByTestId('save-player-names'));
    await vi.waitFor(() => {
      expect(mockApi.updatePlayerName).toHaveBeenCalledTimes(1);
    });
  });
});

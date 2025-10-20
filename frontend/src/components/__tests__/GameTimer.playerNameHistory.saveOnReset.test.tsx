import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { GameTimer } from '../GameTimer';
import * as usePlayerNameHistoryModule from '../../hooks/usePlayerNameHistory';

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

describe('GameTimer - Task 8: ゲームリセット・ブラウザ閉じる時の名前保存トリガー', () => {
  let saveNamesMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // saveNamesをモック（デバウンスなしで即座に呼び出し）
    saveNamesMock = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(usePlayerNameHistoryModule, 'usePlayerNameHistory').mockReturnValue({
      names: [],
      isLoading: false,
      error: null,
      fetchNames: vi.fn().mockResolvedValue(undefined),
      saveNames: saveNamesMock
    });
  });

  it('ゲームリセット時にデフォルト名以外のプレイヤー名が保存される', async () => {
    const user = userEvent.setup();

    render(<GameTimer />);

    // プレイヤー名を変更
    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    await user.clear(nameInputs[0]);
    await user.type(nameInputs[0], 'Alice');
    await user.clear(nameInputs[1]);
    await user.type(nameInputs[1], 'Bob');

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されることを確認
    expect(saveNamesMock).toHaveBeenCalledTimes(1);

    // AliceとBobが含まれることを確認
    const callArgs = saveNamesMock.mock.calls[0][0];
    expect(callArgs).toContain('Alice');
    expect(callArgs).toContain('Bob');
  });

  it('ゲームリセット時にデフォルト名（「プレイヤー1」等）は保存されない', async () => {
    const user = userEvent.setup();

    render(<GameTimer />);

    // プレイヤー1の名前をAliceに変更、プレイヤー2はデフォルトのまま
    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    await user.clear(nameInputs[0]);
    await user.type(nameInputs[0], 'Alice');
    // nameInputs[1]はデフォルト名のまま

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されることを確認
    expect(saveNamesMock).toHaveBeenCalledTimes(1);

    // Aliceのみが含まれ、デフォルト名は含まれないことを確認
    const callArgs = saveNamesMock.mock.calls[0][0];
    expect(callArgs).toContain('Alice');
    expect(callArgs).not.toContain('プレイヤー2');
    expect(callArgs.length).toBe(1);
  });

  it('全てのプレイヤー名がデフォルトの場合、リセット時にsaveNamesは呼び出されない', async () => {
    const user = userEvent.setup();

    render(<GameTimer />);

    // 全てのプレイヤー名をデフォルトのままにする
    // （何も変更しない）

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されないことを確認
    expect(saveNamesMock).not.toHaveBeenCalled();
  });

  it('ブラウザ閉じる前（beforeunload）にデフォルト名以外のプレイヤー名が保存される', async () => {
    const user = userEvent.setup();

    render(<GameTimer />);

    // プレイヤー名を変更
    const nameInputs = screen.getAllByRole('combobox', { name: /プレイヤー名/i });
    await user.clear(nameInputs[0]);
    await user.type(nameInputs[0], 'Charlie');
    await user.clear(nameInputs[1]);
    await user.type(nameInputs[1], 'David');

    // beforeunloadイベントをトリガー
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    // saveNamesが呼び出されることを確認
    expect(saveNamesMock).toHaveBeenCalledTimes(1);

    // CharlieとDavidが含まれることを確認
    const callArgs = saveNamesMock.mock.calls[0][0];
    expect(callArgs).toContain('Charlie');
    expect(callArgs).toContain('David');
  });

  it('ブラウザ閉じる前（beforeunload）に全てのプレイヤー名がデフォルトの場合、saveNamesは呼び出されない', async () => {
    render(<GameTimer />);

    // 全てのプレイヤー名をデフォルトのままにする
    // （何も変更しない）

    // beforeunloadイベントをトリガー
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    // saveNamesが呼び出されないことを確認
    expect(saveNamesMock).not.toHaveBeenCalled();
  });
});

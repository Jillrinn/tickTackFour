import { screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderGameTimer, mockNameHistory } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

// Migration note (saveOnReset):
// The original tests changed player names via UI input → "保存" button, then clicked reset.
// Under fallback mode, those UI changes mutated local state which the reset handler read.
// Under the server-state harness, updatePlayerNameOptimistic is a no-op mock, so UI
// edits do NOT change serverState.players (which is what handleResetGame reads).
// Instead, we inject non-default names directly via serverState.players so that the
// component's handleResetGame/beforeunload logic sees them and calls saveNames.
// The behavioral intent ("saveNames is called with non-default names on reset/beforeunload")
// is fully preserved.

describe('GameTimer - Task 8: ゲームリセット・ブラウザ閉じる時の名前保存トリガー', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ゲームリセット時にデフォルト名以外のプレイヤー名がsaveNamesで保存される', async () => {
    const user = userEvent.setup();

    // Inject non-default names directly into serverState so handleResetGame picks them up
    renderGameTimer({
      serverState: {
        players: [
          { name: 'Alice', elapsedSeconds: 0 },
          { name: 'Bob', elapsedSeconds: 0 },
          { name: 'プレイヤー3', elapsedSeconds: 0 },
          { name: 'プレイヤー4', elapsedSeconds: 0 },
        ],
      },
    });

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されることを確認
    await vi.waitFor(() => {
      expect(mockNameHistory.saveNames).toHaveBeenCalledTimes(1);
    });

    // AliceとBobが含まれることを確認
    const callArgs = mockNameHistory.saveNames.mock.calls[0][0];
    expect(callArgs).toContain('Alice');
    expect(callArgs).toContain('Bob');
  });

  it('ゲームリセット時にデフォルト名（「プレイヤー1」等）は保存されない', async () => {
    const user = userEvent.setup();

    // プレイヤー1のみ非デフォルト名
    renderGameTimer({
      serverState: {
        players: [
          { name: 'Alice', elapsedSeconds: 0 },
          { name: 'プレイヤー2', elapsedSeconds: 0 },
          { name: 'プレイヤー3', elapsedSeconds: 0 },
          { name: 'プレイヤー4', elapsedSeconds: 0 },
        ],
      },
    });

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されることを確認
    await vi.waitFor(() => {
      expect(mockNameHistory.saveNames).toHaveBeenCalledTimes(1);
    });

    // Aliceのみが含まれ、デフォルト名は含まれないことを確認
    const callArgs = mockNameHistory.saveNames.mock.calls[0][0];
    expect(callArgs).toContain('Alice');
    expect(callArgs).not.toContain('プレイヤー2');
    expect(callArgs.length).toBe(1);
  });

  it('全てのプレイヤー名がデフォルトの場合、リセット時にsaveNamesは呼び出されない', async () => {
    const user = userEvent.setup();

    // 全てデフォルト名（デフォルトのまま）
    renderGameTimer();

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されないことを確認
    expect(mockNameHistory.saveNames).not.toHaveBeenCalled();
  });

  it('ブラウザ閉じる前（beforeunload）にデフォルト名以外のプレイヤー名がsaveNamesで保存される', () => {
    // Inject non-default names directly
    renderGameTimer({
      serverState: {
        players: [
          { name: 'Charlie', elapsedSeconds: 0 },
          { name: 'David', elapsedSeconds: 0 },
          { name: 'プレイヤー3', elapsedSeconds: 0 },
          { name: 'プレイヤー4', elapsedSeconds: 0 },
        ],
      },
    });

    // beforeunloadイベントをトリガー
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    // saveNamesが呼び出されることを確認
    expect(mockNameHistory.saveNames).toHaveBeenCalledTimes(1);

    // CharlieとDavidが含まれることを確認
    const callArgs = mockNameHistory.saveNames.mock.calls[0][0];
    expect(callArgs).toContain('Charlie');
    expect(callArgs).toContain('David');
  });

  it('ブラウザ閉じる前（beforeunload）に全てのプレイヤー名がデフォルトの場合、saveNamesは呼び出されない', () => {
    // 全てデフォルト名
    renderGameTimer();

    // beforeunloadイベントをトリガー
    const beforeUnloadEvent = new Event('beforeunload');
    window.dispatchEvent(beforeUnloadEvent);

    // saveNamesが呼び出されないことを確認
    expect(mockNameHistory.saveNames).not.toHaveBeenCalled();
  });
});

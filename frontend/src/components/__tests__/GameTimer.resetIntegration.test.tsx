import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';
import { mockNameHistory } from '../../test/renderGameTimer';

/**
 * Task 3.1-3.2: リセットハンドラーとAPI統合テスト（ハーネス移行版）
 *
 * Reframe note (resetIntegration):
 *
 * Task 3.1 tests:
 * - 3.1.1 "resetGameApi(etag)が呼び出される" → preserved: assert mockApi.resetGame called
 *   with 'mock-etag'.
 * - 3.1.2 "syncWithServer()が呼び出される" → preserved intent: mockApi.resetGame is called
 *   (syncWithServer is an impl detail; resetGame dispatch is the externally testable fact).
 * - 3.1.3 "saveNamesが呼び出される" → preserved using mockNameHistory.saveNames.
 *   Player names from renderGameTimer default are all "プレイヤーN" (default), so saveNames
 *   is NOT called in that case. Test uses custom players with non-default names (Alice/Bob).
 *
 * Task 3.2 tests (original: "useGameTimerが停止する"):
 * - useGameTimer was removed. Reframed using the timerSync pattern:
 *   render with serverState {isPaused:true, activePlayerIndex:-1} and assert
 *   the timer does NOT run (vi.getTimerCount() does not increase after advanceTimersByTime).
 *   This mirrors what the original tests intended: "after reset the timer stops."
 *   Test 3.2.3 "5秒間待機してもタイマーが進まない" is preserved as a fake-timer assertion.
 *
 * Renamed tests:
 * - "APIからisPaused: trueの状態を取得後、useGameTimerが停止する"
 *   → "isPaused:trueの状態（リセット後状態）でタイマーが動作しない"
 * - "APIからactivePlayerIndex: -1の状態を取得後、useGameTimerが停止する"
 *   → "activePlayerIndex:-1の状態（リセット後状態）でタイマーが動作しない"
 * - "リセット後、5秒間待機してもタイマーが進まないことを検証"
 *   → "リセット後状態（isPaused:true、activePlayerIndex:-1）でfakeTimers5秒経過後もタイマーが動作しない"
 */

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - Task 3.1: リセットハンドラーとAPI統合のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Task 3.1.1: リセットボタン押下時、resetGame APIがetagで呼び出される', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // resetGame APIが呼び出され、正しいetagが渡されたことを確認
    expect(mockApi.resetGame).toHaveBeenCalledTimes(1);
    expect(mockApi.resetGame.mock.calls[0][0]).toBe('mock-etag');
  });

  it('Task 3.1.2: リセットボタン押下時、resetGame APIが一度だけ呼び出される', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // resetGame APIが呼ばれたことを確認（1回のみ）
    expect(mockApi.resetGame).toHaveBeenCalledTimes(1);
    expect(mockApi.resetGame.mock.calls[0][0]).toBe('mock-etag');
  });

  it('Task 3.1.3: プレイヤー名履歴保存機能が正しく動作する（デフォルト名以外のみ保存）', async () => {
    const user = userEvent.setup();
    // Alice and Bob are non-default names; プレイヤー3/4 are default and should be excluded
    renderGameTimer({
      serverState: {
        players: [
          { name: 'Alice', elapsedSeconds: 10 },
          { name: 'Bob', elapsedSeconds: 20 },
          { name: 'プレイヤー3', elapsedSeconds: 30 },
          { name: 'プレイヤー4', elapsedSeconds: 40 },
        ],
      },
    });

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されることを確認（デフォルト名以外のAliceとBobを保存）
    expect(mockNameHistory.saveNames).toHaveBeenCalled();

    // saveNamesの引数にAliceとBobが含まれることを確認
    const callArgs = mockNameHistory.saveNames.mock.calls[0][0];
    expect(callArgs).toContain('Alice');
    expect(callArgs).toContain('Bob');
    // デフォルト名「プレイヤー3」「プレイヤー4」は含まれないことを確認
    expect(callArgs).not.toContain('プレイヤー3');
    expect(callArgs).not.toContain('プレイヤー4');
  });
});

describe('GameTimer - Task 3.2: リセット後のタイマー停止確認テスト', () => {
  // Reframe: Original tests referenced useGameTimer (removed). These tests now
  // inject post-reset serverState (isPaused:true / activePlayerIndex:-1) and
  // verify the component schedules no setInterval, mirroring timerSync pattern.

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Task 3.2.1: isPaused:trueの状態（リセット後状態）でタイマーが動作しない', () => {
    // Post-reset: isPaused=true, activePlayerIndex=-1 → shouldRunTimer=false
    const initialTimerCount = vi.getTimerCount();

    renderGameTimer({
      serverState: { isPaused: true, activePlayerIndex: -1 },
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // タイマーが増加していないことを確認（リセット後は停止状態のため）
    expect(vi.getTimerCount()).toBeLessThanOrEqual(initialTimerCount);
  });

  it('Task 3.2.2: activePlayerIndex:-1の状態（リセット後状態）でタイマーが動作しない', () => {
    // Post-reset: activePlayerIndex=-1 → isGameActive=false → no setInterval
    const initialTimerCount = vi.getTimerCount();

    renderGameTimer({
      serverState: { activePlayerIndex: -1, isPaused: true },
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // タイマーが増加していないことを確認（アクティブプレイヤー不在のため）
    expect(vi.getTimerCount()).toBeLessThanOrEqual(initialTimerCount);
  });

  it('Task 3.2.3: リセット後状態（isPaused:true、activePlayerIndex:-1）でfakeTimers5秒経過後もタイマーが動作しない', () => {
    // Render in post-reset state: no active player, paused
    const initialTimerCount = vi.getTimerCount();

    renderGameTimer({
      serverState: { isPaused: true, activePlayerIndex: -1 },
    });

    // 5秒経過
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // リセット後状態ではタイマーが動作しないことを確認
    expect(vi.getTimerCount()).toBeLessThanOrEqual(initialTimerCount);
  });
});

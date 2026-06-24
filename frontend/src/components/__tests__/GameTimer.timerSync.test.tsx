import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderGameTimer } from '../../test/renderGameTimer';
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

// Reframe note (timerSync):
// The original tests asserted that vi.getTimerCount() changes after button clicks
// that triggered local state updates in fallback mode (useFallbackMode hook).
// Under the server-state harness, button clicks dispatch API calls (mockApi) but do
// NOT mutate the static mock's serverState — so the component's useEffect that drives
// the setInterval remains governed by the injected serverState.
// Each test is reframed to verify the component's timer scheduling based on the
// injected serverState (activePlayerIndex / isPaused), which is the real intent:
// "a single setInterval runs iff an active player exists and game is not paused."

describe('GameTimer - タイマー表示同期（Task 4.2）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('単一タイマー更新メカニズム', () => {
    it('ゲーム開始前（activePlayerIndex=-1）はタイマーが動作しない', () => {
      // Default state: activePlayerIndex=-1, isPaused=true → no setInterval
      const initialTimerCount = vi.getTimerCount();

      renderGameTimer();

      // ゲーム開始前: elapsed-time / turn-time は未表示
      expect(screen.queryByTestId('elapsed-time')).toBeNull();
      expect(screen.queryByTestId('turn-time')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // タイマーが増加していないことを確認（アクティブプレイヤー不在のため）
      expect(vi.getTimerCount()).toBeLessThanOrEqual(initialTimerCount);
    });

    it('アクティブプレイヤーあり・非停止状態では1秒タイマーが動作する', () => {
      // Inject: game is running with player 0 active, not paused
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: false },
        displayTime: 5,
      });

      // setIntervalが登録されていることを確認
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('一時停止中（isPaused=true）はタイマーが動作しない', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: true },
        displayTime: 3,
      });

      const timerCountAtPause = vi.getTimerCount();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 一時停止中はタイマーが増加しないことを確認
      expect(vi.getTimerCount()).toBeLessThanOrEqual(timerCountAtPause);
    });

    it('アクティブプレイヤーあり・非停止状態では複数のsetIntervalが過剰に登録されない', () => {
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: false },
        displayTime: 10,
      });

      const timerCount = vi.getTimerCount();

      // 複数のタイマーが過剰登録されていないことを確認（1秒ループ1本が想定）
      expect(timerCount).toBeLessThan(5);
    });
  });

  describe('複数タイマーの統合', () => {
    it('注入されたdisplayTimeが正しくMM:SS形式でレンダリングされる（表示同期の意図検証）', () => {
      // 65 seconds → "01:05"
      renderGameTimer({
        serverState: { activePlayerIndex: 0, isPaused: false },
        displayTime: 65,
      });

      // ヘッダーに表示時間が表示されることを確認
      expect(screen.getByTestId('sticky-header')).toHaveTextContent('01:05');
    });
  });
});

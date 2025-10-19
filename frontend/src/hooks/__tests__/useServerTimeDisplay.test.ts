import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServerTimeDisplay } from '../useServerTimeDisplay';

describe('useServerTimeDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('サーバー時間の基準値管理', () => {
    it('初期状態ではserverTimeが0である', () => {
      const { result } = renderHook(() => useServerTimeDisplay());
      expect(result.current.serverTime).toBe(0);
    });

    it('updateServerTime呼び出しでサーバー時間を更新できる', () => {
      const { result } = renderHook(() => useServerTimeDisplay());

      act(() => {
        result.current.updateServerTime(100);
      });

      expect(result.current.serverTime).toBe(100);
    });

    it('updateServerTime呼び出し時に最終同期時刻を記録する', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const { result } = renderHook(() => useServerTimeDisplay());

      act(() => {
        result.current.updateServerTime(50);
      });

      expect(result.current.lastSyncTime).toBe(now);
    });
  });

  describe('表示用ローカルタイマー（滑らかな更新）', () => {
    it('一時停止中はdisplayTimeがserverTimeのままで変化しない', () => {
      const { result } = renderHook(() =>
        useServerTimeDisplay({ isPaused: true })
      );

      act(() => {
        result.current.updateServerTime(100);
      });

      expect(result.current.displayTime).toBe(100);

      // 1秒経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 一時停止中なので100のまま
      expect(result.current.displayTime).toBe(100);
    });

    it('アクティブ時はserverTime + ローカル経過時間で表示時間が増加する', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const { result } = renderHook(() =>
        useServerTimeDisplay({ isPaused: false })
      );

      // サーバー時間を100秒に設定
      act(() => {
        result.current.updateServerTime(100);
      });

      // 初期表示時間は100秒
      expect(result.current.displayTime).toBe(100);

      // 500ms経過（ローカルタイマーは100ms間隔で更新）
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // displayTime = 100 + 0.5 = 100.5秒（小数点あり）
      expect(result.current.displayTime).toBeCloseTo(100.5, 1);

      // さらに500ms経過（合計1秒）
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // displayTime = 100 + 1 = 101秒
      expect(result.current.displayTime).toBeCloseTo(101, 1);
    });

    it('100ms間隔でdisplayTimeが更新される', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const { result } = renderHook(() =>
        useServerTimeDisplay({ isPaused: false })
      );

      act(() => {
        result.current.updateServerTime(50);
      });

      const initialDisplay = result.current.displayTime;

      // 100ms経過
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // 0.1秒増加
      expect(result.current.displayTime).toBeGreaterThan(initialDisplay);
      expect(result.current.displayTime).toBeCloseTo(50.1, 1);
    });
  });

  describe('一時停止状態の切り替え', () => {
    it('一時停止ONにするとdisplayTimeがserverTimeで固定される', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const { result, rerender } = renderHook(
        ({ isPaused }) => useServerTimeDisplay({ isPaused }),
        { initialProps: { isPaused: false } }
      );

      act(() => {
        result.current.updateServerTime(200);
      });

      // 500ms経過
      act(() => {
        vi.advanceTimersByTime(500);
      });

      const timeBeforePause = result.current.displayTime;
      expect(timeBeforePause).toBeGreaterThan(200);

      // 一時停止ON
      rerender({ isPaused: true });

      // さらに500ms経過
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 一時停止中は増加しない（updateServerTimeで更新された値がそのまま）
      expect(result.current.displayTime).toBe(result.current.serverTime);
    });

    it('一時停止OFF→ONでローカル増分が停止する', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const { result, rerender } = renderHook(
        ({ isPaused }) => useServerTimeDisplay({ isPaused }),
        { initialProps: { isPaused: false } }
      );

      act(() => {
        result.current.updateServerTime(100);
      });

      // アクティブで1秒経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.displayTime).toBeCloseTo(101, 1);

      // 一時停止ON
      rerender({ isPaused: true });

      // 一時停止後の表示時間はserverTime（最後の同期基準）
      // ※ 一時停止時は再度updateServerTimeでサーバーから最新値を取得する想定
      act(() => {
        result.current.updateServerTime(101); // サーバーから101秒を取得
      });

      expect(result.current.displayTime).toBe(101);

      // さらに1秒経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 一時停止中なので増加しない
      expect(result.current.displayTime).toBe(101);
    });
  });

  describe('アクティブプレイヤー切り替え時のリセット', () => {
    it('activePlayerIdが変更されると新しいサーバー時間にリセットされる', () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      const { result, rerender } = renderHook(
        ({ activePlayerId }) => useServerTimeDisplay({ isPaused: false, activePlayerId }),
        { initialProps: { activePlayerId: 'player1' } }
      );

      // player1のサーバー時間を100秒に設定
      act(() => {
        result.current.updateServerTime(100);
      });

      // 1秒経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.displayTime).toBeCloseTo(101, 1);

      // player2に切り替え、サーバー時間を50秒に設定
      rerender({ activePlayerId: 'player2' });

      act(() => {
        result.current.updateServerTime(50);
      });

      // 新しいプレイヤーのサーバー時間50秒が表示される
      expect(result.current.displayTime).toBe(50);

      // さらに1秒経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 50 + 1 = 51秒
      expect(result.current.displayTime).toBeCloseTo(51, 1);
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にタイマーがクリアされる', () => {
      const { result, unmount } = renderHook(() =>
        useServerTimeDisplay({ isPaused: false })
      );

      act(() => {
        result.current.updateServerTime(100);
      });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});

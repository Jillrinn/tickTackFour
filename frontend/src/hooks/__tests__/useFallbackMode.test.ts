import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFallbackMode } from '../useFallbackMode';

describe('useFallbackMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('初期状態', () => {
    it('初期状態ではフォールバックモードがfalseである', () => {
      const { result } = renderHook(() => useFallbackMode());

      expect(result.current.isInFallbackMode).toBe(false);
      expect(result.current.lastError).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('フォールバックモード有効化', () => {
    it('activateFallbackMode呼び出しでフォールバックモードに切り替わる', () => {
      const { result } = renderHook(() => useFallbackMode());
      const testError = new Error('Network error');

      act(() => {
        result.current.activateFallbackMode(testError);
      });

      expect(result.current.isInFallbackMode).toBe(true);
      expect(result.current.lastError).toBe(testError);
      expect(result.current.retryCount).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(
        '[FallbackMode] API接続が失敗しました。インメモリーモードに切り替えます。',
        testError
      );
    });
  });

  describe('フォールバックモード無効化', () => {
    it('deactivateFallbackMode呼び出しで通常モードに戻る', () => {
      const { result } = renderHook(() => useFallbackMode());
      const testError = new Error('Network error');

      act(() => {
        result.current.activateFallbackMode(testError);
      });

      expect(result.current.isInFallbackMode).toBe(true);

      act(() => {
        result.current.deactivateFallbackMode();
      });

      expect(result.current.isInFallbackMode).toBe(false);
      expect(result.current.lastError).toBeNull();
      expect(result.current.retryCount).toBe(0);
      expect(console.log).toHaveBeenCalledWith(
        '[FallbackMode] API接続が復帰しました。通常モードに切り替えます。'
      );
    });
  });

  describe('再接続リトライ', () => {
    it('フォールバックモード中は30秒ごとにリトライ回数をカウントする', () => {
      const { result } = renderHook(() => useFallbackMode());
      const testError = new Error('Network error');

      act(() => {
        result.current.activateFallbackMode(testError);
      });

      expect(result.current.retryCount).toBe(0);

      // 30秒経過
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.retryCount).toBe(1);
      expect(console.log).toHaveBeenCalledWith('[FallbackMode] API接続リトライ試行 (1回目)');

      // さらに30秒経過
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.retryCount).toBe(2);
      expect(console.log).toHaveBeenCalledWith('[FallbackMode] API接続リトライ試行 (2回目)');
    });

    it('通常モードではリトライタイマーが停止する', () => {
      const { result } = renderHook(() => useFallbackMode());
      const testError = new Error('Network error');

      act(() => {
        result.current.activateFallbackMode(testError);
      });

      // 30秒経過してリトライ
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.retryCount).toBe(1);

      // 通常モードに戻す
      act(() => {
        result.current.deactivateFallbackMode();
      });

      const previousLogCallCount = (console.log as ReturnType<typeof vi.fn>).mock.calls.length;

      // さらに30秒経過してもリトライしない
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(result.current.retryCount).toBe(0); // リセットされている
      expect((console.log as ReturnType<typeof vi.fn>).mock.calls.length).toBe(previousLogCallCount); // リトライログが増えていない
    });

    it('incrementRetryCount呼び出しでリトライ回数が増加する', () => {
      const { result } = renderHook(() => useFallbackMode());

      expect(result.current.retryCount).toBe(0);

      act(() => {
        result.current.incrementRetryCount();
      });

      expect(result.current.retryCount).toBe(1);

      act(() => {
        result.current.incrementRetryCount();
      });

      expect(result.current.retryCount).toBe(2);
    });
  });
});

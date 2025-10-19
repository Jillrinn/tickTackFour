import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchWithTimeout } from '../useFetchWithTimeout';

describe('useFetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
    // console.errorをモックして警告を抑制
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('タイムアウト設定', () => {
    it('5秒でタイムアウトすること', async () => {
      // fetchがAbortErrorを発生させるようモック
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (_url: string, options?: RequestInit) => {
          return new Promise((_, reject) => {
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          });
        }
      );

      const { result } = renderHook(() => useFetchWithTimeout());

      // エラーを明示的にキャッチしてPromiseのrejectionを処理
      const fetchPromise = result.current.fetchWithTimeout('/api/test').catch(err => err);

      // 5秒経過（タイムアウト）
      await vi.advanceTimersByTimeAsync(5000);

      // エラーが発生したことを確認
      const error = await fetchPromise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Request timeout after 5000ms');
    });

    it('カスタムタイムアウト時間を設定できること', async () => {
      // fetchがAbortErrorを発生させるようモック
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (_url: string, options?: RequestInit) => {
          return new Promise((_, reject) => {
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          });
        }
      );

      const { result } = renderHook(() => useFetchWithTimeout({ timeout: 3000 }));

      // エラーを明示的にキャッチしてPromiseのrejectionを処理
      const fetchPromise = result.current.fetchWithTimeout('/api/test').catch(err => err);

      // 3秒経過（タイムアウト）
      await vi.advanceTimersByTimeAsync(3000);

      // エラーが発生したことを確認
      const error = await fetchPromise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Request timeout after 3000ms');
    });
  });

  describe('AbortController使用', () => {
    it('タイムアウト時にfetchリクエストがキャンセルされること', async () => {
      // abort()呼び出しを追跡するスパイ
      const abortSpy = vi.fn();
      let abortHandler: (() => void) | null = null;

      // カスタムAbortControllerでabort()呼び出しを追跡
      const mockSignal = {
        aborted: false,
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'abort') {
            abortHandler = handler;
          }
        }),
        removeEventListener: vi.fn()
      };

      global.AbortController = vi.fn(function(this: any) {
        this.signal = mockSignal;
        this.abort = function() {
          abortSpy();
          mockSignal.aborted = true;
          if (abortHandler) {
            abortHandler();
          }
        };
      }) as any;

      // fetchがAbortErrorを発生させるようモック
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        (_url: string, options?: RequestInit) => {
          return new Promise((_, reject) => {
            if (options?.signal) {
              (options.signal as any).addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          });
        }
      );

      const { result } = renderHook(() => useFetchWithTimeout());

      // エラーを明示的にキャッチしてPromiseのrejectionを処理
      const fetchPromise = result.current.fetchWithTimeout('/api/test').catch(err => err);

      // 5秒経過してタイムアウト
      await vi.advanceTimersByTimeAsync(5000);

      // エラーが発生したことを確認
      const error = await fetchPromise;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Request timeout after 5000ms');
      expect(abortSpy).toHaveBeenCalled();
    });

    it('正常完了時はAbortControllerが呼ばれないこと', async () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        signal: { aborted: false },
        abort: abortSpy
      };
      global.AbortController = vi.fn(() => mockAbortController) as any;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' })
      } as Response);

      const { result } = renderHook(() => useFetchWithTimeout());

      await result.current.fetchWithTimeout('/api/test');

      expect(abortSpy).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラー時に適切なエラーメッセージを返すこと', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useFetchWithTimeout());

      await expect(result.current.fetchWithTimeout('/api/test')).rejects.toThrow('Network error');
    });

    it('HTTP エラー時に適切なエラーメッセージを返すこと', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const { result } = renderHook(() => useFetchWithTimeout());

      await expect(result.current.fetchWithTimeout('/api/test')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('正常動作', () => {
    it('タイムアウト前に完了した場合は正常にレスポンスを返すこと', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ data: 'success' })
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse as Response);

      const { result } = renderHook(() => useFetchWithTimeout());

      const response = await result.current.fetchWithTimeout('/api/test');

      expect(response).toBe(mockResponse);
    });
  });

  describe('再試行ロジック', () => {
    it('retryオプションで再試行回数を設定できること', async () => {
      let callCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Network error');
        }
        return {
          ok: true,
          json: async () => ({ data: 'success' })
        } as Response;
      });

      const { result } = renderHook(() => useFetchWithTimeout({ retry: 3 }));

      const response = await result.current.fetchWithTimeout('/api/test');

      expect(callCount).toBe(3);
      expect(response.ok).toBe(true);
    });

    it('全ての再試行が失敗した場合はエラーを返すこと', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useFetchWithTimeout({ retry: 2 }));

      await expect(result.current.fetchWithTimeout('/api/test')).rejects.toThrow('Network error');
      expect(global.fetch).toHaveBeenCalledTimes(3); // 初回 + 2回再試行
    });
  });
});

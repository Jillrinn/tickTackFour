import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlayerNameHistory } from '../usePlayerNameHistory';

describe('usePlayerNameHistory', () => {
  beforeEach(() => {
    // fetchのモックをリセット
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('Task 6.1: 基本的な取得機能', () => {
    it('初回fetchNames呼び出しでAPI呼び出しを実行する', async () => {
      // Arrange
      const mockNames = ['Alice', 'Bob', 'Charlie'];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNames.map(name => ({ name, createdAt: new Date().toISOString() }))
      } as Response);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());

      expect(result.current.names).toEqual([]); // 初期状態は空配列
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();

      await result.current.fetchNames();

      // Assert
      await waitFor(() => {
        expect(result.current.names).toEqual(['Alice', 'Bob', 'Charlie']);
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/player-names', {
        signal: expect.any(AbortSignal)
      });
    });

    it('2回目fetchNames呼び出しでキャッシュを使用し、API呼び出しをしない', async () => {
      // Arrange
      const mockNames = ['Alice', 'Bob'];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNames.map(name => ({ name, createdAt: new Date().toISOString() }))
      } as Response);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());

      await result.current.fetchNames(); // 1回目：API呼び出し
      await waitFor(() => {
        expect(result.current.names).toEqual(['Alice', 'Bob']);
      });

      await result.current.fetchNames(); // 2回目：キャッシュ使用

      // Assert
      expect(global.fetch).toHaveBeenCalledTimes(1); // API呼び出しは1回のみ
      expect(result.current.names).toEqual(['Alice', 'Bob']); // キャッシュデータを返却
    });

    it('fetchNames呼び出し中はisLoadingがtrueになる', async () => {
      // Arrange
      let resolveFunc: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolveFunc = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());

      const fetchPromise = result.current.fetchNames();

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolveFunc!({
        ok: true,
        json: async () => [{ name: 'Alice', createdAt: new Date().toISOString() }]
      });

      await fetchPromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('APIレスポンスが空配列の場合は空配列を返す', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());
      await result.current.fetchNames();

      // Assert
      await waitFor(() => {
        expect(result.current.names).toEqual([]);
      });
    });
  });

  describe('Task 6.2: 保存機能とデバウンス処理', () => {
    it('saveNames呼び出しでPOST /api/player-namesを実行する', async () => {
      // Arrange
      vi.useFakeTimers();
      const mockNames = ['Alice', 'Bob'];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ savedCount: 2 })
      } as Response);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());
      result.current.saveNames(mockNames);

      // 3秒経過してAPI呼び出し実行
      await vi.advanceTimersByTimeAsync(3000);

      // Promise解決を待つ
      await vi.runAllTimersAsync();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/player-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ names: mockNames }),
        signal: expect.any(AbortSignal)
      });

      vi.useRealTimers();
    });

    it('デフォルト名（プレイヤー1、プレイヤー2等）を除外してPOSTする', async () => {
      // Arrange
      vi.useFakeTimers();
      const namesWithDefaults = ['Alice', 'プレイヤー1', 'Bob', 'プレイヤー2', 'Charlie'];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ savedCount: 3 })
      } as Response);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());
      result.current.saveNames(namesWithDefaults);

      // 3秒経過してAPI呼び出し実行
      await vi.advanceTimersByTimeAsync(3000);

      // Promise解決を待つ
      await vi.runAllTimersAsync();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith('/api/player-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ names: ['Alice', 'Bob', 'Charlie'] }),
        signal: expect.any(AbortSignal)
      });

      vi.useRealTimers();
    });

    it('3秒間隔のデバウンス処理が機能する', async () => {
      // Arrange
      vi.useFakeTimers();
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ savedCount: 1 })
      } as Response);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());

      // 3回連続で呼び出し（3秒以内）
      result.current.saveNames(['Alice']);
      result.current.saveNames(['Bob']);
      result.current.saveNames(['Charlie']);

      // 3秒経過してAPI呼び出し実行
      await vi.advanceTimersByTimeAsync(3000);

      // Promise解決を待つ
      await vi.runAllTimersAsync();

      // Assert
      // 3回呼び出したが、API呼び出しは最後の1回のみ
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith('/api/player-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ names: ['Charlie'] }),
        signal: expect.any(AbortSignal)
      });

      vi.useRealTimers();
    });

    it('デフォルト名のみの場合はAPI呼び出しをしない', async () => {
      // Arrange
      const defaultNamesOnly = ['プレイヤー1', 'プレイヤー2'];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ savedCount: 0 })
      } as Response);

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());
      await result.current.saveNames(defaultNamesOnly);

      // Assert
      // デフォルト名のみの場合はAPI呼び出しなし
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('POST失敗時はコンソールエラーを記録するがthrowしない', async () => {
      // Arrange
      vi.useFakeTimers();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());

      // saveNamesがthrowしないことを確認
      await expect(result.current.saveNames(['Alice'])).resolves.not.toThrow();

      // 3秒経過してAPI呼び出し実行
      await vi.advanceTimersByTimeAsync(3000);

      // Promise解決を待つ
      await vi.runAllTimersAsync();

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('Task 6.3: エラーハンドリングの実装', () => {
    it('GET失敗時は空配列を返却する', async () => {
      // Arrange
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());
      await result.current.fetchNames();

      // Assert
      await waitFor(() => {
        expect(result.current.names).toEqual([]);
        expect(result.current.error).toBeTruthy();
      });
    });

    it('fetchNamesが5秒でタイムアウトする', async () => {
      // Arrange
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async (_url, options) => {
        // AbortSignalを受け取っていることを確認
        expect(options?.signal).toBeDefined();

        // AbortSignalがabortされるまで待機
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          });
        });
      });

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());
      const fetchPromise = result.current.fetchNames();

      // 5秒経過（タイムアウト発生）
      await vi.advanceTimersByTimeAsync(5000);

      // Promise解決を待つ
      await vi.runAllTimersAsync();

      // fetchPromiseの完了を待つ
      await fetchPromise;

      // Assert
      expect(result.current.names).toEqual([]);
      expect(result.current.error).toBeTruthy();

      vi.useRealTimers();
    });

    it('saveNamesが5秒でタイムアウトする', async () => {
      // Arrange
      vi.useFakeTimers();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async (_url, options) => {
        // AbortSignalを受け取っていることを確認
        expect(options?.signal).toBeDefined();

        // AbortSignalがabortされるまで待機
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          });
        });
      });

      // Act
      const { result } = renderHook(() => usePlayerNameHistory());
      result.current.saveNames(['Alice']);

      // 3秒経過（デバウンス完了、fetch開始）
      await vi.advanceTimersByTimeAsync(3000);

      // さらに5秒経過（タイムアウト発生）
      await vi.advanceTimersByTimeAsync(5000);

      // Promise解決を待つ
      await vi.runAllTimersAsync();

      // Assert
      // タイムアウトエラーがコンソールに記録される
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});

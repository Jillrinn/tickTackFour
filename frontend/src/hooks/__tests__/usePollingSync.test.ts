import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePollingSync } from '../usePollingSync';
import type { GameStateWithTime } from '../../types/GameState';

describe('usePollingSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('ポーリング開始と間隔', () => {
    it('5秒間隔でGET /api/gameを呼び出すこと', async () => {
      const mockResponse: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 10 },
          { name: 'プレイヤー2', elapsedSeconds: 20 }
        ],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const onUpdate = vi.fn();
      renderHook(() => usePollingSync(onUpdate));

      // 初回呼び出しは即座に実行される
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('/api/game');
      }, { timeout: 1000 });

      // 5秒経過後、2回目の呼び出し
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // さらに5秒経過後、3回目の呼び出し
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('レスポンスを取得してコールバックを実行すること', async () => {
      const mockResponse: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 10 },
          { name: 'プレイヤー2', elapsedSeconds: 20 }
        ],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const onUpdate = vi.fn();
      renderHook(() => usePollingSync(onUpdate));

      await vi.waitFor(() => {
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith(mockResponse);
      }, { timeout: 1000 });
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にポーリングを停止すること', async () => {
      const mockResponse: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const onUpdate = vi.fn();
      const { unmount } = renderHook(() => usePollingSync(onUpdate));

      // 初回呼び出し確認
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });

      // アンマウント
      unmount();

      // 5秒経過してもfetchが呼ばれないことを確認
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラー時も次回ポーリングを継続すること', async () => {
      let callCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return {
          ok: true,
          json: async () => ({
            players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
            activePlayerIndex: 0,
            timerMode: 'count-up',
            countdownSeconds: 600,
            isPaused: false,
            etag: 'test-etag'
          })
        } as Response;
      });

      const onUpdate = vi.fn();
      renderHook(() => usePollingSync(onUpdate));

      // 初回はエラー
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(onUpdate).not.toHaveBeenCalled();
      }, { timeout: 1000 });

      // 5秒後、2回目の呼び出しは成功
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('HTTP 500エラー時も次回ポーリングを継続すること', async () => {
      let callCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
            activePlayerIndex: 0,
            timerMode: 'count-up',
            countdownSeconds: 600,
            isPaused: false,
            etag: 'test-etag'
          })
        } as Response;
      });

      const onUpdate = vi.fn();
      renderHook(() => usePollingSync(onUpdate));

      // 初回は500エラー
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(onUpdate).not.toHaveBeenCalled();
      }, { timeout: 1000 });

      // 5秒後、2回目の呼び出しは成功
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('ポーリングの有効化/無効化', () => {
    it('enabled=falseの時はポーリングを開始しないこと', async () => {
      const onUpdate = vi.fn();
      renderHook(() => usePollingSync(onUpdate, { enabled: false }));

      // 少し待機してから確認
      await vi.advanceTimersByTimeAsync(100);
      expect(global.fetch).not.toHaveBeenCalled();

      // 5秒経過してもfetchが呼ばれないことを確認
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('enabled=trueに変更した時にポーリングを開始すること', async () => {
      const mockResponse: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const onUpdate = vi.fn();
      const { rerender } = renderHook(
        ({ enabled }) => usePollingSync(onUpdate, { enabled }),
        { initialProps: { enabled: false } }
      );

      // 初期状態ではポーリングなし
      expect(global.fetch).not.toHaveBeenCalled();

      // enabled=trueに変更
      rerender({ enabled: true });

      // ポーリングが開始されることを確認
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith(mockResponse);
      }, { timeout: 1000 });
    });
  });

  describe('連続失敗時のフォールバック (Task 4.1)', () => {
    it('3回連続失敗時にonErrorコールバックを呼び出すこと', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const onUpdate = vi.fn();
      const onError = vi.fn();
      renderHook(() => usePollingSync(onUpdate, { onError }));

      // 初回失敗
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
      expect(onError).not.toHaveBeenCalled();

      // 2回目失敗
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(onError).not.toHaveBeenCalled();

      // 3回目失敗 → onErrorが呼ばれる（非同期状態更新を待つ）
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // onError呼び出しを待つ
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });

      expect(onError).toHaveBeenCalledWith({
        type: 'consecutive_failures',
        count: 3,
        lastError: expect.any(Error)
      });
    });

    it('成功時に失敗カウントをリセットすること', async () => {
      let callCount = 0;
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        callCount++;
        if (callCount === 1 || callCount === 2) {
          throw new Error('Network error');
        }
        return {
          ok: true,
          json: async () => ({
            players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
            activePlayerIndex: 0,
            timerMode: 'count-up',
            countdownSeconds: 600,
            isPaused: false,
            etag: 'test-etag'
          })
        } as Response;
      });

      const onUpdate = vi.fn();
      const onError = vi.fn();
      renderHook(() => usePollingSync(onUpdate, { onError }));

      // 初回失敗
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });

      // 2回目失敗
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // 3回目成功 → 失敗カウントリセット、onErrorは呼ばれない
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('4回目のエラー時も再度3回カウントしてonErrorを呼び出すこと', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const onUpdate = vi.fn();
      const onError = vi.fn();
      renderHook(() => usePollingSync(onUpdate, { onError }));

      // 1-3回目失敗 → onError呼び出し
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);

      // 3回目の失敗後、onErrorが呼ばれるのを待つ
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });

      // 4-6回目失敗 → 再度onError呼び出し
      await vi.advanceTimersByTimeAsync(5000); // 4回目
      expect(onError).toHaveBeenCalledTimes(1); // まだ1回のみ
      await vi.advanceTimersByTimeAsync(5000); // 5回目
      expect(onError).toHaveBeenCalledTimes(1); // まだ1回のみ
      await vi.advanceTimersByTimeAsync(5000); // 6回目

      // 6回目の失敗後、2回目のonErrorが呼ばれるのを待つ
      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(2);
      }, { timeout: 1000 });
    });

    it('onErrorコールバックが未指定でもエラーにならないこと', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const onUpdate = vi.fn();
      // onErrorを渡さない
      renderHook(() => usePollingSync(onUpdate));

      // 3回連続失敗してもエラーにならない
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
      await vi.advanceTimersByTimeAsync(5000);
      await vi.advanceTimersByTimeAsync(5000);
      expect(global.fetch).toHaveBeenCalledTimes(3);
      // エラーにならずに処理が継続される
    });
  });
});

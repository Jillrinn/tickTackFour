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
});

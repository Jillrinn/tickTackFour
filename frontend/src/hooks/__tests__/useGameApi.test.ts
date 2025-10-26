import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameApi } from '../useGameApi';
import type { GameStateWithTime } from '../../types/GameState';

describe('useGameApi', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('switchTurn - ターン切り替えAPI呼び出し', () => {
    it('POST /api/switchTurnを呼び出し、ETagを含める', async () => {
      const mockResponse: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 10 },
          { name: 'プレイヤー2', elapsedSeconds: 20 }
        ],
        activePlayerIndex: 1,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'new-etag-123'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.switchTurn('current-etag-456');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/switchTurn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag: 'current-etag-456' })
      });

      expect(response).toEqual(mockResponse);
    });

    it('ネットワークエラー時にnullを返す', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.switchTurn('etag-123');
      });

      expect(response).toBeNull();
    });
  });

  describe('pauseGame - 一時停止API呼び出し', () => {
    it('POST /api/pauseを呼び出し、ETagを含める', async () => {
      const mockResponse: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 50 }],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: true,
        etag: 'paused-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.pauseGame('etag-pause');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag: 'etag-pause' })
      });

      expect(response).toEqual(mockResponse);
    });
  });

  describe('resumeGame - 再開API呼び出し', () => {
    it('POST /api/resumeを呼び出し、ETagを含める', async () => {
      const mockResponse: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 50 }],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'resumed-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.resumeGame('etag-resume');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag: 'etag-resume' })
      });

      expect(response).toEqual(mockResponse);
    });
  });

  describe('resetGame - リセットAPI呼び出し', () => {
    it('POST /api/resetを呼び出し、ETagを含める', async () => {
      const mockResponse: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 0 },
          { name: 'プレイヤー2', elapsedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'reset-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.resetGame('etag-reset');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ etag: 'etag-reset' })
      });

      expect(response).toEqual(mockResponse);
    });
  });

  describe('updateGame - 汎用更新API呼び出し', () => {
    it('POST /api/updateGameを呼び出し、プレイヤー数変更リクエストを送信', async () => {
      const mockResponse: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 0 },
          { name: 'プレイヤー2', elapsedSeconds: 0 },
          { name: 'プレイヤー3', elapsedSeconds: 0 },
          { name: 'プレイヤー4', elapsedSeconds: 0 },
          { name: 'プレイヤー5', elapsedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'updated-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.updateGame('etag-update', { playerCount: 5 });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/updateGame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          etag: 'etag-update',
          playerCount: 5
        })
      });

      expect(response).toEqual(mockResponse);
    });

    it('POST /api/updateGameを呼び出し、タイマーモード変更リクエストを送信', async () => {
      const mockResponse: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 600 }],
        activePlayerIndex: 0,
        timerMode: 'countdown',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'mode-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.updateGame('etag-mode', {
          timerMode: 'countdown',
          countdownSeconds: 600
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/updateGame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          etag: 'etag-mode',
          timerMode: 'countdown',
          countdownSeconds: 600
        })
      });

      expect(response).toEqual(mockResponse);
    });

    it('POST /api/updateGameを呼び出し、プレイヤー名変更リクエストを送信', async () => {
      const mockResponse: GameStateWithTime = {
        players: [{ name: '太郎', elapsedSeconds: 0 }],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'name-etag'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.updateGame('etag-name', {
          players: [{ name: '太郎', elapsedSeconds: 0 }]
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/updateGame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          etag: 'etag-name',
          players: [{ name: '太郎', elapsedSeconds: 0 }]
        })
      });

      expect(response).toEqual(mockResponse);
    });
  });

  describe('エラーハンドリング', () => {
    it('HTTP 500エラー時にnullを返す', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.switchTurn('etag-error');
      });

      expect(response).toBeNull();
    });

    it('HTTP 412エラー（楽観的ロック競合）時にnullを返す', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 412,
        statusText: 'Precondition Failed'
      });

      const { result } = renderHook(() => useGameApi());

      let response: GameStateWithTime | null = null;
      await act(async () => {
        response = await result.current.pauseGame('etag-conflict');
      });

      expect(response).toBeNull();
    });
  });
});

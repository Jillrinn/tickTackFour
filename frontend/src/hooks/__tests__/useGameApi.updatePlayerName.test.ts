import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameApi } from '../useGameApi';
import type { GameStateWithTime } from '../../types/GameState';

// global fetchのモック
global.fetch = vi.fn();

describe('useGameApi - updatePlayerName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系: プレイヤー名更新成功（200 OK）', () => {
    it('有効なプレイヤーインデックスと名前で updatePlayerName を呼び出すと成功する', async () => {
      const mockResponse: GameStateWithTime = {
        players: [
          { id: '1', name: 'Alice', elapsedTimeSeconds: 0, isActive: false, turnStartedAt: null },
          { id: '2', name: 'Bob', elapsedTimeSeconds: 0, isActive: false, turnStartedAt: null },
        ],
        activePlayerId: null,
        isPaused: true,
        timerMode: 'countup',
        countdownSeconds: 600,
        etag: 'new-etag-value',
        activePlayerIndex: -1,
        turnStartedAt: null,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
        headers: new Headers({ etag: 'new-etag-value' }),
      });

      const { result } = renderHook(() => useGameApi());

      let apiResult: GameStateWithTime | null = null;
      await act(async () => {
        apiResult = await result.current.updatePlayerName(0, 'Alice', 'old-etag');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:7071/api/updatePlayerName',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'If-Match': 'old-etag',
          }),
          body: JSON.stringify({
            playerIndex: 0,
            name: 'Alice',
          }),
        })
      );

      expect(apiResult).toEqual(mockResponse);
      expect(apiResult?.etag).toBe('new-etag-value');
      expect(apiResult?.players[0].name).toBe('Alice');
    });
  });

  describe('異常系: ETag不一致（409 Conflict）', () => {
    it('他のクライアントが先に更新した場合、409 Conflictエラーを返す', async () => {
      const latestState: GameStateWithTime = {
        players: [
          { id: '1', name: 'Charlie', elapsedTimeSeconds: 0, isActive: false, turnStartedAt: null },
          { id: '2', name: 'Bob', elapsedTimeSeconds: 0, isActive: false, turnStartedAt: null },
        ],
        activePlayerId: null,
        isPaused: true,
        timerMode: 'countup',
        countdownSeconds: 600,
        etag: 'latest-etag',
        activePlayerIndex: -1,
        turnStartedAt: null,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'Conflict',
          message: '他のユーザーがプレイヤー名を更新しました',
          latestState,
        }),
      });

      const { result } = renderHook(() => useGameApi());

      let apiResult: any = null;
      await act(async () => {
        apiResult = await result.current.updatePlayerName(0, 'Bob', 'old-etag');
      });

      expect(apiResult).toHaveProperty('type', 'conflict');
      expect(apiResult).toHaveProperty('message');
      expect(apiResult).toHaveProperty('latestState', latestState);
    });
  });

  describe('異常系: バリデーションエラー（400 Bad Request）', () => {
    it('空文字列のプレイヤー名を送信すると400 Bad Requestエラーを返す', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          message: 'プレイヤー名は1文字以上100文字以下で入力してください',
        }),
      });

      const { result } = renderHook(() => useGameApi());

      let apiResult: any = null;
      await act(async () => {
        apiResult = await result.current.updatePlayerName(0, '', 'old-etag');
      });

      expect(apiResult).toBeNull();
    });
  });

  describe('異常系: サーバーエラー（500 Internal Server Error）', () => {
    it('バックエンドエラーが発生した場合、nullを返す', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal Server Error',
        }),
      });

      const { result } = renderHook(() => useGameApi());

      let apiResult: any = null;
      await act(async () => {
        apiResult = await result.current.updatePlayerName(0, 'Alice', 'old-etag');
      });

      expect(apiResult).toBeNull();
    });
  });

  describe('異常系: ネットワークタイムアウト', () => {
    it('API呼び出しが30秒以内に完了しない場合、nullを返す', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 100)
          )
      );

      const { result } = renderHook(() => useGameApi());

      let apiResult: any = null;
      await act(async () => {
        apiResult = await result.current.updatePlayerName(0, 'Alice', 'old-etag');
      });

      expect(apiResult).toBeNull();
    });
  });
});

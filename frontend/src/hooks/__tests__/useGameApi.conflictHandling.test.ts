import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameApi } from '../useGameApi';

describe('useGameApi - 412 Conflict Handling', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    // console.errorをモック（ログ出力を抑制）
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('switchTurn - 412 Conflict', () => {
    it('412 Conflictエラー時にConflictErrorを返す', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 412,
        statusText: 'Precondition Failed',
        json: async () => ({ error: 'Update failed after 3 retries due to conflicts' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      const response = await act(async () => {
        return await result.current.switchTurn('test-etag');
      });

      // 412 Conflictエラー時はConflictError型のエラーオブジェクトを返す
      expect(response).toEqual({
        type: 'conflict',
        message: 'Update failed after 3 retries due to conflicts',
        action: 'reload'
      });
    });

    it('412 Conflict時にエラーメッセージをログ出力する', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 412,
        statusText: 'Precondition Failed',
        json: async () => ({ error: 'Update failed' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      await act(async () => {
        await result.current.switchTurn('test-etag');
      });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Conflict detected'),
        expect.anything()
      );
    });
  });

  describe('pauseGame - 412 Conflict', () => {
    it('412 Conflictエラー時にConflictErrorを返す', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 412,
        statusText: 'Precondition Failed',
        json: async () => ({ error: 'Update failed after 3 retries' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      const response = await act(async () => {
        return await result.current.pauseGame('test-etag');
      });

      expect(response).toEqual({
        type: 'conflict',
        message: 'Update failed after 3 retries',
        action: 'reload'
      });
    });
  });

  describe('resumeGame - 412 Conflict', () => {
    it('412 Conflictエラー時にConflictErrorを返す', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 412,
        statusText: 'Precondition Failed',
        json: async () => ({ error: 'Conflict occurred' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      const response = await act(async () => {
        return await result.current.resumeGame('test-etag');
      });

      expect(response).toEqual({
        type: 'conflict',
        message: 'Conflict occurred',
        action: 'reload'
      });
    });
  });

  describe('resetGame - 412 Conflict', () => {
    it('412 Conflictエラー時にConflictErrorを返す', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 412,
        statusText: 'Precondition Failed',
        json: async () => ({ error: 'Reset conflict' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      const response = await act(async () => {
        return await result.current.resetGame('test-etag');
      });

      expect(response).toEqual({
        type: 'conflict',
        message: 'Reset conflict',
        action: 'reload'
      });
    });
  });

  describe('updateGame - 412 Conflict', () => {
    it('412 Conflictエラー時にConflictErrorを返す', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 412,
        statusText: 'Precondition Failed',
        json: async () => ({ error: 'Update game conflict' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      const response = await act(async () => {
        return await result.current.updateGame('test-etag', { playerCount: 5 });
      });

      expect(response).toEqual({
        type: 'conflict',
        message: 'Update game conflict',
        action: 'reload'
      });
    });
  });

  describe('非412エラーの処理', () => {
    it('500エラー時はGeneralErrorを返す', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      const response = await act(async () => {
        return await result.current.switchTurn('test-etag');
      });

      // 500エラーはnullを返す（既存の挙動を維持）
      expect(response).toBeNull();
    });

    it('404エラー時はnullを返す', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not found' })
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse);

      const { result } = renderHook(() => useGameApi());

      const response = await act(async () => {
        return await result.current.switchTurn('test-etag');
      });

      expect(response).toBeNull();
    });
  });
});

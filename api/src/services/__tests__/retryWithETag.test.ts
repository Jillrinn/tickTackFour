import { RestError } from '@azure/data-tables';
import { retryUpdateWithETag } from '../retryWithETag';
import { GameState } from '../../models/gameState';

describe('ETag Retry Mechanism', () => {
  const mockState: GameState = {
    playerCount: 4,
    players: [
      { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
      { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
      { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
      { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
    ],
    activePlayerIndex: 0,
    timerMode: 'countup',
    countdownSeconds: 60,
    isPaused: false,
    turnStartedAt: '2025-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('retryUpdateWithETag', () => {
    it('1回目の更新が成功した場合、リトライせずに結果を返す', async () => {
      // Arrange
      const mockUpdateFn = jest.fn().mockResolvedValue({
        state: mockState,
        etag: 'new-etag'
      });
      const mockGetLatestFn = jest.fn();

      // Act
      const result = await retryUpdateWithETag(
        mockState,
        'initial-etag',
        mockUpdateFn,
        mockGetLatestFn
      );

      // Assert
      expect(mockUpdateFn).toHaveBeenCalledTimes(1);
      expect(mockUpdateFn).toHaveBeenCalledWith(mockState, 'initial-etag');
      expect(mockGetLatestFn).not.toHaveBeenCalled();
      expect(result.etag).toBe('new-etag');
    });

    it('412 Conflictが1回発生した場合、最新状態を取得して再試行し成功する', async () => {
      // Arrange
      const conflictError = new RestError('Conflict', { statusCode: 412 });
      const mockUpdateFn = jest
        .fn()
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce({
          state: mockState,
          etag: 'retry-etag'
        });

      const mockGetLatestFn = jest.fn().mockResolvedValue({
        state: mockState,
        etag: 'latest-etag'
      });

      // Act
      const resultPromise = retryUpdateWithETag(
        mockState,
        'initial-etag',
        mockUpdateFn,
        mockGetLatestFn
      );

      // 1回目の再試行待機（100ms）
      await jest.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      // Assert
      expect(mockUpdateFn).toHaveBeenCalledTimes(2);
      expect(mockGetLatestFn).toHaveBeenCalledTimes(1);
      expect(mockUpdateFn).toHaveBeenNthCalledWith(1, mockState, 'initial-etag');
      expect(mockUpdateFn).toHaveBeenNthCalledWith(2, mockState, 'latest-etag');
      expect(result.etag).toBe('retry-etag');
    });

    it('412 Conflictが2回発生した場合、指数バックオフで待機して再試行する', async () => {
      // Arrange
      const conflictError = new RestError('Conflict', { statusCode: 412 });
      const mockUpdateFn = jest
        .fn()
        .mockRejectedValueOnce(conflictError) // 1回目失敗
        .mockRejectedValueOnce(conflictError) // 2回目失敗
        .mockResolvedValueOnce({               // 3回目成功
          state: mockState,
          etag: 'final-etag'
        });

      const mockGetLatestFn = jest.fn().mockResolvedValue({
        state: mockState,
        etag: 'latest-etag'
      });

      // Act
      const resultPromise = retryUpdateWithETag(
        mockState,
        'initial-etag',
        mockUpdateFn,
        mockGetLatestFn
      );

      // 1回目の再試行待機（100ms）
      await jest.advanceTimersByTimeAsync(100);
      // 2回目の再試行待機（200ms）
      await jest.advanceTimersByTimeAsync(200);

      const result = await resultPromise;

      // Assert
      expect(mockUpdateFn).toHaveBeenCalledTimes(3);
      expect(mockGetLatestFn).toHaveBeenCalledTimes(2);
      expect(result.etag).toBe('final-etag');
    });

    it('3回連続で412 Conflictが発生した場合、Conflictエラーをスローする', async () => {
      // Arrange
      const conflictError = new RestError('Conflict', { statusCode: 412 });
      const mockUpdateFn = jest.fn().mockRejectedValue(conflictError);

      const mockGetLatestFn = jest.fn().mockResolvedValue({
        state: mockState,
        etag: 'latest-etag'
      });

      // Act
      const promise = retryUpdateWithETag(
        mockState,
        'initial-etag',
        mockUpdateFn,
        mockGetLatestFn
      );

      // タイマーを進める - promiseのrejectionを待つ前に全タイマーを実行
      const runTimers = jest.runAllTimersAsync();

      // Assert
      await expect(promise).rejects.toThrow('Update failed after 3 retries due to conflicts');
      await runTimers;

      expect(mockUpdateFn).toHaveBeenCalledTimes(3);
      expect(mockGetLatestFn).toHaveBeenCalledTimes(2); // 最後の失敗後はgetLatestを呼ばない
    });

    it('412以外のエラーが発生した場合、即座にエラーをスローする', async () => {
      // Arrange
      const serverError = new RestError('Internal Server Error', { statusCode: 500 });
      const mockUpdateFn = jest.fn().mockRejectedValue(serverError);
      const mockGetLatestFn = jest.fn();

      // Act & Assert
      await expect(
        retryUpdateWithETag(mockState, 'initial-etag', mockUpdateFn, mockGetLatestFn)
      ).rejects.toThrow('Internal Server Error');

      expect(mockUpdateFn).toHaveBeenCalledTimes(1);
      expect(mockGetLatestFn).not.toHaveBeenCalled();
    });

    it('指数バックオフの待機時間が正しい（100ms, 200ms）', async () => {
      // Arrange
      const conflictError = new RestError('Conflict', { statusCode: 412 });
      const mockUpdateFn = jest.fn().mockRejectedValue(conflictError);
      const mockGetLatestFn = jest.fn().mockResolvedValue({
        state: mockState,
        etag: 'latest-etag'
      });

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      // Act
      const promise = retryUpdateWithETag(
        mockState,
        'initial-etag',
        mockUpdateFn,
        mockGetLatestFn
      );

      // タイマーを進める - promiseのrejectionを待つ前に全タイマーを実行
      const runTimers = jest.runAllTimersAsync();
      await expect(promise).rejects.toThrow();
      await runTimers;

      // Assert
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 200);

      setTimeoutSpy.mockRestore();
    });
  });
});

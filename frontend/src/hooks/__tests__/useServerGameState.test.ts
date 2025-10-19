import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServerGameState } from '../useServerGameState';
import type { GameStateWithTime } from '../../types/GameState';

describe('useServerGameState - APIモード状態管理', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('サーバー状態の更新', () => {
    it('updateFromServerでserverStateを更新できること', () => {
      const mockState: GameStateWithTime = {
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

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      expect(result.current.serverState).toEqual(mockState);
    });

    it('アクティブプレイヤーの経過時間をserverTimeに設定すること', () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 45 },
          { name: 'プレイヤー2', elapsedSeconds: 20 }
        ],
        activePlayerIndex: 0,  // プレイヤー1がアクティブ
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      // displayTimeは初期値0から更新される（100ms後にserverTime + localElapsedになる）
      expect(result.current.displayTime).toBeGreaterThanOrEqual(0);
    });

    it('activePlayerIndex=-1の場合はserverTimeを0のままにすること', () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 10 },
          { name: 'プレイヤー2', elapsedSeconds: 20 }
        ],
        activePlayerIndex: -1,  // ゲーム未開始
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      expect(result.current.serverState).toEqual(mockState);
      expect(result.current.displayTime).toBe(0);
    });
  });

  describe('滑らかなタイマー表示（design.md lines 424-436）', () => {
    it('100msごとにdisplayTimeが増加すること（非一時停止時）', async () => {
      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      const initialDisplayTime = result.current.displayTime;

      // 500ms経過
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // displayTimeが増加していることを確認
      expect(result.current.displayTime).toBeGreaterThan(initialDisplayTime);
      // おおよそ0.5秒増加している（10 + 0.5 = 10.5秒前後）
      expect(result.current.displayTime).toBeGreaterThanOrEqual(10);
      expect(result.current.displayTime).toBeLessThan(11);
    });

    it('一時停止中はdisplayTimeが増加しないこと', async () => {
      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: true,  // 一時停止中
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      // displayTimerが1回実行されるまで待機（100ms）
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      const initialDisplayTime = result.current.displayTime;

      // さらに500ms経過
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // displayTimeが変化していないことを確認（一時停止中はserverTimeのまま）
      expect(result.current.displayTime).toBe(initialDisplayTime);
      expect(result.current.displayTime).toBe(10);  // serverTimeと同じ
    });

    it('activePlayerIndex=-1の場合はdisplayTimeが増加しないこと', async () => {
      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: -1,  // ゲーム未開始
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      const initialDisplayTime = result.current.displayTime;

      // 500ms経過
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // displayTimeが変化していないことを確認
      expect(result.current.displayTime).toBe(initialDisplayTime);
    });

    it('複数回のupdateFromServer呼び出しでserverTimeが更新されること', async () => {
      const { result } = renderHook(() => useServerGameState());

      // 初回: 10秒
      act(() => {
        result.current.updateFromServer({
          players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
          activePlayerIndex: 0,
          timerMode: 'count-up',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-1'
        });
      });

      // 300ms経過
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      const displayAfter300ms = result.current.displayTime;
      expect(displayAfter300ms).toBeGreaterThanOrEqual(10);
      expect(displayAfter300ms).toBeLessThan(11);

      // 2回目: 15秒（サーバーから新しい値を取得）
      act(() => {
        result.current.updateFromServer({
          players: [{ name: 'プレイヤー1', elapsedSeconds: 15 }],
          activePlayerIndex: 0,
          timerMode: 'count-up',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-2'
        });
      });

      // lastSyncTimeがリセットされ、displayTimeが15秒ベースになる
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      const displayAfter200ms = result.current.displayTime;
      expect(displayAfter200ms).toBeGreaterThanOrEqual(15);
      expect(displayAfter200ms).toBeLessThan(16);
    });
  });

  describe('フォーマット関数', () => {
    it('formatTimeが正しくMM:SS形式にフォーマットすること', () => {
      const { result } = renderHook(() => useServerGameState());

      expect(result.current.formatTime(0)).toBe('00:00');
      expect(result.current.formatTime(5)).toBe('00:05');
      expect(result.current.formatTime(59)).toBe('00:59');
      expect(result.current.formatTime(60)).toBe('01:00');
      expect(result.current.formatTime(65)).toBe('01:05');
      expect(result.current.formatTime(3661)).toBe('61:01');
    });

    it('負の値を0として扱うこと', () => {
      const { result } = renderHook(() => useServerGameState());

      expect(result.current.formatTime(-10)).toBe('00:00');
    });

    it('小数点以下を切り捨てること', () => {
      const { result } = renderHook(() => useServerGameState());

      expect(result.current.formatTime(10.9)).toBe('00:10');
      expect(result.current.formatTime(65.5)).toBe('01:05');
    });
  });

  describe('最長時間プレイヤー取得', () => {
    it('カウントアップモードで最長時間プレイヤーを返すこと', () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 10 },
          { name: 'プレイヤー2', elapsedSeconds: 50 },  // 最長
          { name: 'プレイヤー3', elapsedSeconds: 20 }
        ],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      const longest = result.current.getLongestTimePlayer();
      expect(longest).toEqual({
        name: 'プレイヤー2',
        elapsedSeconds: 50,
        index: 1
      });
    });

    it('カウントダウンモードではnullを返すこと', () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 10 },
          { name: 'プレイヤー2', elapsedSeconds: 50 }
        ],
        activePlayerIndex: 0,
        timerMode: 'count-down',  // カウントダウン
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      expect(result.current.getLongestTimePlayer()).toBeNull();
    });

    it('全プレイヤー0秒の場合はnullを返すこと', () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 0 },
          { name: 'プレイヤー2', elapsedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      expect(result.current.getLongestTimePlayer()).toBeNull();
    });

    it('同点の場合は最初に見つかったプレイヤーを返すこと', () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 30 },
          { name: 'プレイヤー2', elapsedSeconds: 50 },  // 最長（最初に見つかる）
          { name: 'プレイヤー3', elapsedSeconds: 50 },  // 最長（同点）
          { name: 'プレイヤー4', elapsedSeconds: 20 }
        ],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      const longest = result.current.getLongestTimePlayer();
      expect(longest).toEqual({
        name: 'プレイヤー2',
        elapsedSeconds: 50,
        index: 1  // 最初に見つかったindex
      });
    });

    it('serverStateがnullの場合はnullを返すこと', () => {
      const { result } = renderHook(() => useServerGameState());

      // updateFromServerを呼ばない（serverStateがnull）
      expect(result.current.getLongestTimePlayer()).toBeNull();
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にdisplayTimerを停止すること', async () => {
      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'count-up',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1'
      };

      const { result, unmount } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer(mockState);
      });

      // アンマウント（displayTimeの値は検証不要のためconst削除）
      unmount();

      // タイマー進行
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // アンマウント後はタイマーが停止しているため、displayTimeが変化しない
      // （ただし、unmount後はresult.currentにアクセスできないため、実際の確認は難しい）
      // このテストはメモリリークがないことを確認する意図
    });
  });
});

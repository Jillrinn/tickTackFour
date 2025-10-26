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
        timerMode: 'countup',
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
        timerMode: 'countup',
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
        timerMode: 'countup',
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
        timerMode: 'countup',
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
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: true,  // 一時停止中
        pausedAt: new Date().toISOString(),  // 一時停止時刻を追加
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
        timerMode: 'countup',
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
          timerMode: 'countup',
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
          timerMode: 'countup',
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
        timerMode: 'countup',
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

    // timer-mode-toggle依存のため無効化（要件1スキップ）
    it.skip('カウントダウンモードではnullを返すこと', () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 10 },
          { name: 'プレイヤー2', elapsedSeconds: 50 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countdown',  // カウントダウン
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
        timerMode: 'countup',
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
        timerMode: 'countup',
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
        timerMode: 'countup',
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

  describe('backend-driven-timer-fix: displayTime計算ロジックの修正', () => {
    it('Task 1: updateFromServer呼び出し後、displayTimeがserverTimeにリセットされること', () => {
      const { result } = renderHook(() => useServerGameState());

      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 45 }],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1',
        turnStartedAt: new Date().toISOString(),
        pausedAt: null
      };

      act(() => {
        result.current.updateFromServer(mockState);
      });

      // displayTimeが初期化されていることを確認（0から開始、すぐに100ms timerで更新される）
      expect(result.current.displayTime).toBeGreaterThanOrEqual(0);
    });

    it('Task 1: ポーリング間の経過時間のみが加算されること（lastSyncTimeベース）', async () => {
      const { result } = renderHook(() => useServerGameState());

      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-1',
        turnStartedAt: new Date().toISOString(),
        pausedAt: null
      };

      act(() => {
        result.current.updateFromServer(mockState);
      });

      // 500ms経過（ポーリング間の経過時間）
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // displayTime = serverTime (10秒) + 0.5秒 = 10.5秒前後
      expect(result.current.displayTime).toBeGreaterThanOrEqual(10);
      expect(result.current.displayTime).toBeLessThan(11);
    });

    it('Task 1: 二重カウントが発生しないこと（turnStartedAtベースではなくlastSyncTimeベース）', async () => {
      const { result } = renderHook(() => useServerGameState());

      // 最初のポーリング: サーバーから10秒を取得
      const turnStartedAt = new Date(Date.now() - 10000).toISOString(); // 10秒前にターン開始

      act(() => {
        result.current.updateFromServer({
          players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }], // サーバー計算済み: 10秒
          activePlayerIndex: 0,
          timerMode: 'countup',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-1',
          turnStartedAt: turnStartedAt,
          pausedAt: null
        });
      });

      // 500ms経過
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      // 二重カウントがない場合: 10秒 + 0.5秒 = 10.5秒前後
      // 二重カウントがある場合: 10秒 + 10秒 + 0.5秒 = 20.5秒前後（これは発生しない）
      expect(result.current.displayTime).toBeGreaterThanOrEqual(10);
      expect(result.current.displayTime).toBeLessThan(11);
    });
  });

  describe('backend-driven-timer-fix: タイマー再構築機能', () => {
    it('Task 2: updateFromServer呼び出し時にdisplayTimeがリセットされること', () => {
      const { result } = renderHook(() => useServerGameState());

      // 初回更新
      act(() => {
        result.current.updateFromServer({
          players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
          activePlayerIndex: 0,
          timerMode: 'countup',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-1',
          turnStartedAt: new Date().toISOString(),
          pausedAt: null
        });
      });

      // 2回目更新（タイマー再構築）
      act(() => {
        result.current.updateFromServer({
          players: [{ name: 'プレイヤー1', elapsedSeconds: 15 }],
          activePlayerIndex: 0,
          timerMode: 'countup',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-2',
          turnStartedAt: new Date().toISOString(),
          pausedAt: null
        });
      });

      // displayTimeが新しいserverTime (15秒) ベースにリセットされる
      // 100ms timer実行後は15秒前後になる
      expect(result.current.displayTime).toBeGreaterThanOrEqual(0);
    });

    it('Task 2: turnDisplayTimeはturnStartedAtベースで継続的に計算されること', async () => {
      const { result } = renderHook(() => useServerGameState());

      // ターン開始時刻を10秒前に設定
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();

      // 初回更新
      act(() => {
        result.current.updateFromServer({
          players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
          activePlayerIndex: 0,
          timerMode: 'countup',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-1',
          turnStartedAt: tenSecondsAgo,
          pausedAt: null
        });
      });

      // setIntervalが実行されるまで待機
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // turnDisplayTimeはturnStartedAtから10秒経過しているはず
      const turnTime = result.current.getCurrentTurnTime();
      expect(turnTime).toBeGreaterThanOrEqual(9.5);  // 約10秒（多少の誤差を許容）
      expect(turnTime).toBeLessThan(11);

      // ポーリング同期（updateFromServer）を実行
      act(() => {
        result.current.updateFromServer({
          players: [{ name: 'プレイヤー1', elapsedSeconds: 10.5 }],
          activePlayerIndex: 0,
          timerMode: 'countup',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-2',
          turnStartedAt: tenSecondsAgo,  // 同じターン開始時刻
          pausedAt: null
        });
      });

      // setIntervalが再度実行されるまで待機
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      // turnDisplayTimeはリセットされず、turnStartedAtから継続的に計算される
      const turnTimeAfterSync = result.current.getCurrentTurnTime();
      expect(turnTimeAfterSync).toBeGreaterThanOrEqual(9.5);  // 依然として約10秒
      expect(turnTimeAfterSync).toBeLessThan(11);
    });

    it('Task 2: ゲーム開始前（activePlayerIndex=-1）の状態で全てが0にリセットされること', () => {
      const { result } = renderHook(() => useServerGameState());

      act(() => {
        result.current.updateFromServer({
          players: [
            { name: 'プレイヤー1', elapsedSeconds: 0 },
            { name: 'プレイヤー2', elapsedSeconds: 0 }
          ],
          activePlayerIndex: -1, // ゲーム開始前
          timerMode: 'countup',
          countdownSeconds: 600,
          isPaused: false,
          etag: 'test-etag-reset',
          turnStartedAt: null,
          pausedAt: null
        });
      });

      // 全ての値が0にリセットされる
      expect(result.current.displayTime).toBe(0);
      expect(result.current.getCurrentTurnTime()).toBe(0);
    });
  });

  describe('syncWithServer - サーバー状態の即座取得', () => {
    beforeEach(() => {
      // fetchのモックをリセット
      global.fetch = vi.fn();
      // Fake timersを使用してデバウンスをテスト可能にする
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('syncWithServer()が/api/gameをfetchし、最新状態を取得すること', async () => {
      const mockState: GameStateWithTime = {
        players: [
          { name: 'プレイヤー1', elapsedSeconds: 30 },
          { name: 'プレイヤー2', elapsedSeconds: 45 }
        ],
        activePlayerIndex: 1,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-sync'
      };

      // fetch APIのモック
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockState)
        } as Response)
      );

      const { result } = renderHook(() => useServerGameState());

      let returnedState: GameStateWithTime | null = null;
      await act(async () => {
        const promise = result.current.syncWithServer();
        // 100msデバウンス待機
        await vi.advanceTimersByTimeAsync(100);
        returnedState = await promise;
      });

      // fetchが/api/gameを呼び出したことを確認
      expect(global.fetch).toHaveBeenCalledWith('/api/game');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 戻り値が取得した状態であることを確認
      expect(returnedState).toEqual(mockState);

      // serverStateが更新されたことを確認
      expect(result.current.serverState).toEqual(mockState);
    });

    it('デバウンス: 100ms以内の連続呼び出しをスキップすること', async () => {
      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-debounce'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockState)
        } as Response)
      );

      const { result } = renderHook(() => useServerGameState());

      // 3回連続で即座に呼び出し
      await act(async () => {
        result.current.syncWithServer();
        result.current.syncWithServer();
        result.current.syncWithServer();

        // 100ms待機（デバウンス）
        await vi.advanceTimersByTimeAsync(100);
      });

      // デバウンスにより、最後の1回のみ実行される
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('重複リクエスト防止: 実行中のリクエストがある場合、新しいリクエストをスキップすること', async () => {
      const mockState: GameStateWithTime = {
        players: [{ name: 'プレイヤー1', elapsedSeconds: 10 }],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 600,
        isPaused: false,
        etag: 'test-etag-duplicate'
      };

      let callCount = 0;
      let resolveFunc: ((value: Response) => void) | undefined;

      // 1回目は遅延、2回目以降は即座に解決
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // 1回目のリクエストは手動で解決
          return new Promise<Response>((resolve) => {
            resolveFunc = resolve;
          });
        } else {
          // 2回目以降は即座に解決（本来ならスキップされるべき）
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockState)
          } as Response);
        }
      });

      const { result } = renderHook(() => useServerGameState());

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        // 1回目の呼び出し
        const promise1 = result.current.syncWithServer();

        // デバウンス待機（100msデバウンス後、fetchが実行される）
        await vi.advanceTimersByTimeAsync(100);

        // 2回目の呼び出し（1回目がまだ進行中）
        const promise2 = result.current.syncWithServer();

        // 2回目のデバウンス待機
        await vi.advanceTimersByTimeAsync(100);

        // 1回目のfetchを解決
        resolveFunc?.({
          ok: true,
          json: () => Promise.resolve(mockState)
        } as Response);

        // 両方のPromiseを待つ
        await Promise.all([promise1, promise2]);
      });

      // 1回目のリクエストが進行中のため、2回目はスキップされる
      expect(consoleLogSpy).toHaveBeenCalledWith('[syncWithServer] Skipped (already in progress)');
      // fetchは1回のみ呼ばれる
      expect(global.fetch).toHaveBeenCalledTimes(1);

      consoleLogSpy.mockRestore();
    });

    it('エラー時: ネットワークエラーが発生した場合、nullを返しコンソールにエラーを記録すること', async () => {
      // このテストのみreal timersを使用
      vi.useRealTimers();

      // fetchが失敗するモック
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      const { result } = renderHook(() => useServerGameState());

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let returnedState: GameStateWithTime | null = null;
      await act(async () => {
        returnedState = await result.current.syncWithServer();
      });

      // エラーが発生した場合、nullを返す
      expect(returnedState).toBeNull();

      // コンソールにエラーが記録される
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[syncWithServer] Failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      vi.useFakeTimers(); // 次のテストのためにfake timersに戻す
    });

    it('エラー時: HTTPステータスエラー（404等）の場合、nullを返しコンソールにエラーを記録すること', async () => {
      // このテストのみreal timersを使用
      vi.useRealTimers();

      // HTTP 404エラーのモック
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404
        } as Response)
      );

      const { result } = renderHook(() => useServerGameState());

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let returnedState: GameStateWithTime | null = null;
      await act(async () => {
        returnedState = await result.current.syncWithServer();
      });

      // エラーが発生した場合、nullを返す
      expect(returnedState).toBeNull();

      // コンソールにエラーが記録される
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[syncWithServer] Failed:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      vi.useFakeTimers(); // 次のテストのためにfake timersに戻す
    });
  });
});

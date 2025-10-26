import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState - setPaused拡張（Task 3.5）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setPaused - pausedAt設定と調整', () => {
    it('一時停止時にpausedAtに現在時刻を設定する', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      // pausedAtが現在時刻に設定されていることを確認
      expect(result.current.gameState.isPaused).toBe(true);
      expect(result.current.gameState.pausedAt).not.toBeNull();
      expect(result.current.gameState.pausedAt).toEqual(baseTime);
    });

    it('再開時にpausedAtをnullにクリアする', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      // pausedAtが設定されていることを確認
      expect(result.current.gameState.pausedAt).toEqual(baseTime);

      // 5秒経過
      vi.setSystemTime(new Date('2025-01-01T00:00:05Z'));

      // 再開
      act(() => {
        result.current.setPaused(false);
      });

      // pausedAtがnullにクリアされていることを確認
      expect(result.current.gameState.isPaused).toBe(false);
      expect(result.current.gameState.pausedAt).toBeNull();
    });

    it('再開時にアクティブプレイヤーのtotalPausedDurationを累積する', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // プレイヤー1のturnStartedAtが設定されていることを確認
      const initialTurnStartedAt = result.current.gameState.players[0].turnStartedAt;
      expect(initialTurnStartedAt).toEqual(baseTime);
      // 初期状態ではtotalPausedDuration = 0
      expect(result.current.gameState.players[0].totalPausedDuration).toBe(0);

      // 10秒経過: 00:00:10
      const pauseTime = new Date('2025-01-01T00:00:10Z');
      vi.setSystemTime(pauseTime);

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      // 一時停止中に5秒経過: 00:00:15
      const resumeTime = new Date('2025-01-01T00:00:15Z');
      vi.setSystemTime(resumeTime);

      // 再開
      act(() => {
        result.current.setPaused(false);
      });

      // totalPausedDurationが一時停止期間（5秒 = 5000ms）分累積されていることを確認
      const totalPausedDuration = result.current.gameState.players[0].totalPausedDuration;
      expect(totalPausedDuration).toBe(5000);
      // turnStartedAtは変更されない
      expect(result.current.gameState.players[0].turnStartedAt).toEqual(baseTime);
    });

    it('アクティブプレイヤーのみtotalPausedDurationが累積され、他プレイヤーは影響なし', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー2をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[1].id);
      });

      // 5秒経過: 00:00:05
      vi.setSystemTime(new Date('2025-01-01T00:00:05Z'));

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      // 一時停止中に3秒経過: 00:00:08
      vi.setSystemTime(new Date('2025-01-01T00:00:08Z'));

      // 再開
      act(() => {
        result.current.setPaused(false);
      });

      // プレイヤー2のみtotalPausedDurationが累積されていることを確認
      // 一時停止期間: 3秒（00:00:05 → 00:00:08） = 3000ms
      expect(result.current.gameState.players[1].totalPausedDuration).toBe(3000);
      // turnStartedAtは変更されない
      expect(result.current.gameState.players[1].turnStartedAt).toEqual(baseTime);

      // 他プレイヤーのturnStartedAtはnull（影響なし）
      expect(result.current.gameState.players[0].turnStartedAt).toBeNull();
      expect(result.current.gameState.players[2].turnStartedAt).toBeNull();
      expect(result.current.gameState.players[3].turnStartedAt).toBeNull();
      // 他プレイヤーのtotalPausedDurationも0のまま
      expect(result.current.gameState.players[0].totalPausedDuration).toBe(0);
      expect(result.current.gameState.players[2].totalPausedDuration).toBe(0);
      expect(result.current.gameState.players[3].totalPausedDuration).toBe(0);
    });

    it('アクティブプレイヤーなしで一時停止・再開してもエラーにならない', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // アクティブプレイヤーなし（activePlayerId = null）
      expect(result.current.gameState.activePlayerId).toBeNull();

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      expect(result.current.gameState.isPaused).toBe(true);
      expect(result.current.gameState.pausedAt).toEqual(baseTime);

      // 5秒経過
      vi.setSystemTime(new Date('2025-01-01T00:00:05Z'));

      // 再開（エラーにならない）
      act(() => {
        result.current.setPaused(false);
      });

      expect(result.current.gameState.isPaused).toBe(false);
      expect(result.current.gameState.pausedAt).toBeNull();

      // 全プレイヤーのturnStartedAtがnull（影響なし）
      result.current.gameState.players.forEach(player => {
        expect(player.turnStartedAt).toBeNull();
      });
    });

    it('pausedAtがnullで再開してもエラーにならない（通常の再開処理）', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // 一時停止せずに再開（pausedAt = null）
      act(() => {
        result.current.setPaused(false);
      });

      // エラーにならず、isPausedがfalseになる
      expect(result.current.gameState.isPaused).toBe(false);
      expect(result.current.gameState.pausedAt).toBeNull();
    });

    it('一時停止中の時間がターン時間計算に含まれないことを確認', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // 10秒経過: 00:00:10
      vi.setSystemTime(new Date('2025-01-01T00:00:10Z'));

      // この時点でのターン時間は10秒
      const turnTimeBeforePause = result.current.getCurrentTurnTime();
      expect(turnTimeBeforePause).toBe(10);

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      // 一時停止中に5秒経過: 00:00:15
      vi.setSystemTime(new Date('2025-01-01T00:00:15Z'));

      // 再開
      act(() => {
        result.current.setPaused(false);
      });

      // 再開直後のターン時間は10秒のまま（一時停止中の5秒は含まれない）
      const turnTimeAfterResume = result.current.getCurrentTurnTime();
      expect(turnTimeAfterResume).toBe(10);

      // 再開後さらに3秒経過: 00:00:18
      vi.setSystemTime(new Date('2025-01-01T00:00:18Z'));

      // ターン時間は13秒になる（10秒 + 再開後の3秒）
      const finalTurnTime = result.current.getCurrentTurnTime();
      expect(finalTurnTime).toBe(13);
    });
  });
});

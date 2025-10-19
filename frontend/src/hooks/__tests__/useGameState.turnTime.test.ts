import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState - ターン時間トラッキング（Task 3.1）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCurrentTurnTime', () => {
    it('turnStartedAtがnullの場合は0を返す', () => {
      const { result } = renderHook(() => useGameState());

      // getCurrentTurnTime関数が存在することを確認
      expect(result.current.getCurrentTurnTime).toBeDefined();

      // アクティブプレイヤーなし → turnStartedAt = null → 0を返す
      const turnTime = result.current.getCurrentTurnTime();
      expect(turnTime).toBe(0);
    });

    it('アクティブプレイヤー設定後、経過時間を正しく計算する', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // 5秒経過
      vi.setSystemTime(new Date('2025-01-01T00:00:05Z'));

      // ターン経過時間は5秒
      const turnTime = result.current.getCurrentTurnTime();
      expect(turnTime).toBe(5);
    });

    it('一時停止中の時間は除外される', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // 5秒経過後に一時停止: 00:00:05
      vi.setSystemTime(new Date('2025-01-01T00:00:05Z'));
      act(() => {
        result.current.setPaused(true);
      });

      // 一時停止中に10秒経過: 00:00:15
      vi.setSystemTime(new Date('2025-01-01T00:00:15Z'));

      // 再開
      act(() => {
        result.current.setPaused(false);
      });

      // 再開後さらに3秒経過: 00:00:18
      vi.setSystemTime(new Date('2025-01-01T00:00:18Z'));

      // ターン経過時間 = 5秒(一時停止前) + 3秒(再開後) = 8秒
      // 一時停止中の10秒は除外される
      const turnTime = result.current.getCurrentTurnTime();
      expect(turnTime).toBe(8);
    });

    it('非アクティブプレイヤーはturnStartedAtがnullで0を返す', () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // 5秒経過
      vi.advanceTimersByTime(5000);

      // プレイヤー2に切り替え
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[1].id);
      });

      // プレイヤー1のturnStartedAtはクリアされているため、
      // アクティブプレイヤー以外の情報を取得する方法がないので、
      // 現在のアクティブプレイヤー（プレイヤー2）のターン時間は0から開始
      const turnTime = result.current.getCurrentTurnTime();
      expect(turnTime).toBe(0);
    });

    it('ゲーム一時停止中はターン時間の計測が停止する', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // 5秒経過
      vi.setSystemTime(new Date('2025-01-01T00:00:05Z'));

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      // 一時停止中に10秒経過
      vi.setSystemTime(new Date('2025-01-01T00:00:15Z'));

      // 一時停止中はターン時間は5秒のまま（増加しない）
      const turnTime = result.current.getCurrentTurnTime();
      expect(turnTime).toBe(5);
    });
  });
});

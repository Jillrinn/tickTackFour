import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState - setActivePlayer拡張（Task 3.4）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setActivePlayer - turnStartedAt設定', () => {
    it('新しいアクティブプレイヤーのturnStartedAtに現在時刻を設定する', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // プレイヤー1のturnStartedAtが現在時刻に設定されていることを確認
      const player1 = result.current.gameState.players[0];
      expect(player1.turnStartedAt).not.toBeNull();
      expect(player1.turnStartedAt).toEqual(baseTime);
    });

    it('前のアクティブプレイヤーのturnStartedAtをnullにクリアする', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // プレイヤー1のturnStartedAtが設定されていることを確認
      expect(result.current.gameState.players[0].turnStartedAt).toEqual(baseTime);

      // 5秒経過
      vi.setSystemTime(new Date('2025-01-01T00:00:05Z'));

      // プレイヤー2をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[1].id);
      });

      // プレイヤー1のturnStartedAtがnullにクリアされていることを確認
      expect(result.current.gameState.players[0].turnStartedAt).toBeNull();

      // プレイヤー2のturnStartedAtが新しい時刻に設定されていることを確認
      const player2 = result.current.gameState.players[1];
      expect(player2.turnStartedAt).not.toBeNull();
      expect(player2.turnStartedAt).toEqual(new Date('2025-01-01T00:00:05Z'));
    });

    it('アクティブプレイヤー以外の全プレイヤーのturnStartedAtがnullになる', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー2をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[1].id);
      });

      // プレイヤー2のみturnStartedAtが設定され、他は全てnull
      expect(result.current.gameState.players[0].turnStartedAt).toBeNull();
      expect(result.current.gameState.players[1].turnStartedAt).toEqual(baseTime);
      expect(result.current.gameState.players[2].turnStartedAt).toBeNull();
      expect(result.current.gameState.players[3].turnStartedAt).toBeNull();
    });

    it('アクティブプレイヤーをnullに設定すると全プレイヤーのturnStartedAtがnullになる', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // プレイヤー1のturnStartedAtが設定されていることを確認
      expect(result.current.gameState.players[0].turnStartedAt).toEqual(baseTime);

      // アクティブプレイヤーをnullに設定
      act(() => {
        result.current.setActivePlayer(null);
      });

      // 全プレイヤーのturnStartedAtがnullになっていることを確認
      result.current.gameState.players.forEach(player => {
        expect(player.turnStartedAt).toBeNull();
      });
    });

    it('同じプレイヤーを再度アクティブに設定するとturnStartedAtが更新される', () => {
      const { result } = renderHook(() => useGameState());

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // プレイヤー1のturnStartedAtが設定されていることを確認
      expect(result.current.gameState.players[0].turnStartedAt).toEqual(baseTime);

      // 10秒経過: 00:00:10
      const newTime = new Date('2025-01-01T00:00:10Z');
      vi.setSystemTime(newTime);

      // プレイヤー1を再度アクティブに設定
      act(() => {
        result.current.setActivePlayer(result.current.gameState.players[0].id);
      });

      // プレイヤー1のturnStartedAtが新しい時刻に更新されていることを確認
      expect(result.current.gameState.players[0].turnStartedAt).toEqual(newTime);
    });
  });
});

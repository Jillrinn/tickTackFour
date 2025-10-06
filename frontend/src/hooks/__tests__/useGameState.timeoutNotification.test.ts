import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

/**
 * Task 12.2: カウントダウン時間切れの視覚通知テスト
 *
 * 要件:
 * - カウントダウンモードで0秒に達したプレイヤーを検出
 * - タイムアウトしたプレイヤーのIDを返す
 * - カウントアップモードでは常にnull
 */
describe('useGameState - カウントダウン時間切れの視覚通知（Task 12.2）', () => {
  describe('getTimedOutPlayerId - タイムアウトプレイヤー検出', () => {
    it('カウントアップモードでは常にnullを返す', () => {
      const { result } = renderHook(() => useGameState());

      // カウントアップモード（デフォルト）
      expect(result.current.gameState.timerMode).toBe('count-up');

      // プレイヤーが何秒でもタイムアウトとみなされない
      const player1Id = result.current.gameState.players[0].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 0);
      });

      expect(result.current.getTimedOutPlayerId()).toBeNull();
    });

    it('カウントダウンモードで0秒に達したプレイヤーのIDを返す', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに変更（初期時間300秒）
      act(() => {
        result.current.setTimerMode('count-down', 300);
      });

      // プレイヤー1の時間を0秒に設定
      const player1Id = result.current.gameState.players[0].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 0);
      });

      expect(result.current.getTimedOutPlayerId()).toBe(player1Id);
    });

    it('カウントダウンモードで複数プレイヤーが0秒の場合、最初のプレイヤーIDを返す', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに変更
      act(() => {
        result.current.setTimerMode('count-down', 300);
      });

      // プレイヤー1と2の時間を0秒に設定
      const player1Id = result.current.gameState.players[0].id;
      const player2Id = result.current.gameState.players[1].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 0);
        result.current.updatePlayerTime(player2Id, 0);
      });

      // 最初の0秒プレイヤーIDを返す
      expect(result.current.getTimedOutPlayerId()).toBe(player1Id);
    });

    it('カウントダウンモードで全プレイヤーが1秒以上の場合nullを返す', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに変更
      act(() => {
        result.current.setTimerMode('count-down', 300);
      });

      // 全プレイヤーが1秒以上
      const player1Id = result.current.gameState.players[0].id;
      const player2Id = result.current.gameState.players[1].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 1);
        result.current.updatePlayerTime(player2Id, 10);
      });

      expect(result.current.getTimedOutPlayerId()).toBeNull();
    });

    it('カウントダウンモードで1秒のプレイヤーはタイムアウトとみなされない', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに変更
      act(() => {
        result.current.setTimerMode('count-down', 300);
      });

      // プレイヤー1の時間を1秒に設定
      const player1Id = result.current.gameState.players[0].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 1);
      });

      // 1秒以上はタイムアウトではない
      expect(result.current.getTimedOutPlayerId()).toBeNull();
    });
  });
});

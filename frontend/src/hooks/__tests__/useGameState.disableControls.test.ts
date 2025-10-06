import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

/**
 * Task 12.3: 無効な操作の防止テスト
 *
 * 要件:
 * - 他のプレイヤーがアクティブな時、そのプレイヤー以外のアクティブ設定ボタンを無効化
 * - プレイヤーがアクティブでない時は自分のボタンを有効化
 * - ボタン無効化状態を判定する関数を提供
 */
describe('useGameState - 無効な操作の防止（Task 12.3）', () => {
  describe('isPlayerControlDisabled - プレイヤー操作無効化判定', () => {
    it('アクティブプレイヤーがいない場合、全プレイヤーのボタンが有効', () => {
      const { result } = renderHook(() => useGameState());

      // アクティブプレイヤーがいない（初期状態）
      expect(result.current.gameState.activePlayerId).toBeNull();

      // 全プレイヤーのボタンが有効
      result.current.gameState.players.forEach(player => {
        expect(result.current.isPlayerControlDisabled(player.id)).toBe(false);
      });
    });

    it('プレイヤー1がアクティブな時、プレイヤー1のボタンは有効', () => {
      const { result } = renderHook(() => useGameState());

      const player1Id = result.current.gameState.players[0].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(player1Id);
      });

      // プレイヤー1のボタンは有効
      expect(result.current.isPlayerControlDisabled(player1Id)).toBe(false);
    });

    it('プレイヤー1がアクティブな時、プレイヤー2のボタンは無効', () => {
      const { result } = renderHook(() => useGameState());

      const player1Id = result.current.gameState.players[0].id;
      const player2Id = result.current.gameState.players[1].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(player1Id);
      });

      // プレイヤー2のボタンは無効
      expect(result.current.isPlayerControlDisabled(player2Id)).toBe(true);
    });

    it('プレイヤー1がアクティブな時、プレイヤー3とプレイヤー4のボタンも無効', () => {
      const { result } = renderHook(() => useGameState());

      const player1Id = result.current.gameState.players[0].id;
      const player3Id = result.current.gameState.players[2].id;
      const player4Id = result.current.gameState.players[3].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(player1Id);
      });

      // プレイヤー3とプレイヤー4のボタンは無効
      expect(result.current.isPlayerControlDisabled(player3Id)).toBe(true);
      expect(result.current.isPlayerControlDisabled(player4Id)).toBe(true);
    });

    it('アクティブプレイヤーが変更されると、無効化状態も更新される', () => {
      const { result } = renderHook(() => useGameState());

      const player1Id = result.current.gameState.players[0].id;
      const player2Id = result.current.gameState.players[1].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(player1Id);
      });

      expect(result.current.isPlayerControlDisabled(player1Id)).toBe(false);
      expect(result.current.isPlayerControlDisabled(player2Id)).toBe(true);

      // プレイヤー2をアクティブに変更
      act(() => {
        result.current.setActivePlayer(player2Id);
      });

      expect(result.current.isPlayerControlDisabled(player1Id)).toBe(true);
      expect(result.current.isPlayerControlDisabled(player2Id)).toBe(false);
    });

    it('アクティブ解除すると、全プレイヤーのボタンが有効になる', () => {
      const { result } = renderHook(() => useGameState());

      const player1Id = result.current.gameState.players[0].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(player1Id);
      });

      expect(result.current.isPlayerControlDisabled(player1Id)).toBe(false);

      // アクティブ解除
      act(() => {
        result.current.setActivePlayer(null);
      });

      // 全プレイヤーのボタンが有効
      result.current.gameState.players.forEach(player => {
        expect(result.current.isPlayerControlDisabled(player.id)).toBe(false);
      });
    });
  });
});

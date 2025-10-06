import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

/**
 * Task 10.3: ターン管理機能のテスト
 *
 * 要件:
 * - ターン切り替えボタン: 現在プレイヤー停止 → 次プレイヤー開始
 * - 最後のプレイヤーから最初のプレイヤーへの循環処理
 * - アクティブプレイヤーの視覚的ハイライト表示
 * - 1人のプレイヤーのタイマーが動作中 → 他のプレイヤーのタイマーを停止状態に保つ
 */
describe('useGameState - ターン管理機能（Task 10.3）', () => {
  describe('switchToNextPlayer（ターン切り替え）', () => {
    it('現在のアクティブプレイヤーから次のプレイヤーへターンを切り替える', () => {
      const { result } = renderHook(() => useGameState());

      // 最初のプレイヤーをアクティブに設定
      const firstPlayerId = result.current.gameState.players[0].id;
      act(() => {
        result.current.setActivePlayer(firstPlayerId);
      });

      expect(result.current.gameState.activePlayerId).toBe(firstPlayerId);
      expect(result.current.gameState.players[0].isActive).toBe(true);

      // 次のプレイヤーへターン切り替え
      act(() => {
        result.current.switchToNextPlayer();
      });

      const secondPlayerId = result.current.gameState.players[1].id;
      expect(result.current.gameState.activePlayerId).toBe(secondPlayerId);
      expect(result.current.gameState.players[0].isActive).toBe(false);
      expect(result.current.gameState.players[1].isActive).toBe(true);
    });

    it('最後のプレイヤーから最初のプレイヤーへ循環する', () => {
      const { result } = renderHook(() => useGameState());

      // 4人プレイヤーのデフォルト状態で、最後のプレイヤー（index 3）をアクティブに設定
      const lastPlayerIndex = result.current.gameState.players.length - 1;
      const lastPlayerId = result.current.gameState.players[lastPlayerIndex].id;

      act(() => {
        result.current.setActivePlayer(lastPlayerId);
      });

      expect(result.current.gameState.activePlayerId).toBe(lastPlayerId);
      expect(result.current.gameState.players[lastPlayerIndex].isActive).toBe(true);

      // 次のプレイヤーへターン切り替え → 最初のプレイヤーへ循環
      act(() => {
        result.current.switchToNextPlayer();
      });

      const firstPlayerId = result.current.gameState.players[0].id;
      expect(result.current.gameState.activePlayerId).toBe(firstPlayerId);
      expect(result.current.gameState.players[lastPlayerIndex].isActive).toBe(false);
      expect(result.current.gameState.players[0].isActive).toBe(true);
    });

    it('アクティブプレイヤーがいない場合は最初のプレイヤーをアクティブにする', () => {
      const { result } = renderHook(() => useGameState());

      // 初期状態ではアクティブプレイヤーなし
      expect(result.current.gameState.activePlayerId).toBeNull();

      // ターン切り替え → 最初のプレイヤーをアクティブに
      act(() => {
        result.current.switchToNextPlayer();
      });

      const firstPlayerId = result.current.gameState.players[0].id;
      expect(result.current.gameState.activePlayerId).toBe(firstPlayerId);
      expect(result.current.gameState.players[0].isActive).toBe(true);
    });

    it('5人プレイヤーでの循環ロジックが正しく動作する', () => {
      const { result } = renderHook(() => useGameState());

      // 5人に変更
      act(() => {
        result.current.setPlayerCount(5);
      });

      expect(result.current.gameState.players.length).toBe(5);

      // 最後のプレイヤー（index 4）をアクティブに設定
      const lastPlayerId = result.current.gameState.players[4].id;
      act(() => {
        result.current.setActivePlayer(lastPlayerId);
      });

      // 次のプレイヤーへターン切り替え → 最初のプレイヤーへ循環
      act(() => {
        result.current.switchToNextPlayer();
      });

      const firstPlayerId = result.current.gameState.players[0].id;
      expect(result.current.gameState.activePlayerId).toBe(firstPlayerId);
      expect(result.current.gameState.players[4].isActive).toBe(false);
      expect(result.current.gameState.players[0].isActive).toBe(true);
    });

    it('6人プレイヤーでの循環ロジックが正しく動作する', () => {
      const { result } = renderHook(() => useGameState());

      // 6人に変更
      act(() => {
        result.current.setPlayerCount(6);
      });

      expect(result.current.gameState.players.length).toBe(6);

      // 最後のプレイヤー（index 5）をアクティブに設定
      const lastPlayerId = result.current.gameState.players[5].id;
      act(() => {
        result.current.setActivePlayer(lastPlayerId);
      });

      // 次のプレイヤーへターン切り替え → 最初のプレイヤーへ循環
      act(() => {
        result.current.switchToNextPlayer();
      });

      const firstPlayerId = result.current.gameState.players[0].id;
      expect(result.current.gameState.activePlayerId).toBe(firstPlayerId);
      expect(result.current.gameState.players[5].isActive).toBe(false);
      expect(result.current.gameState.players[0].isActive).toBe(true);
    });
  });

  describe('アクティブプレイヤー排他制御', () => {
    it('1人のプレイヤーがアクティブな場合、他のプレイヤーのisActiveはfalse', () => {
      const { result } = renderHook(() => useGameState());

      const secondPlayerId = result.current.gameState.players[1].id;

      act(() => {
        result.current.setActivePlayer(secondPlayerId);
      });

      // プレイヤー2のみアクティブ
      expect(result.current.gameState.players[0].isActive).toBe(false);
      expect(result.current.gameState.players[1].isActive).toBe(true);
      expect(result.current.gameState.players[2].isActive).toBe(false);
      expect(result.current.gameState.players[3].isActive).toBe(false);
    });

    it('アクティブプレイヤーを切り替えると、前のアクティブプレイヤーはfalseになる', () => {
      const { result } = renderHook(() => useGameState());

      const firstPlayerId = result.current.gameState.players[0].id;
      const thirdPlayerId = result.current.gameState.players[2].id;

      // 最初にプレイヤー1をアクティブに
      act(() => {
        result.current.setActivePlayer(firstPlayerId);
      });

      expect(result.current.gameState.players[0].isActive).toBe(true);

      // プレイヤー3に切り替え
      act(() => {
        result.current.setActivePlayer(thirdPlayerId);
      });

      // プレイヤー1はfalse、プレイヤー3がtrue
      expect(result.current.gameState.players[0].isActive).toBe(false);
      expect(result.current.gameState.players[2].isActive).toBe(true);
    });
  });

  describe('ターン切り替えとタイマーの統合', () => {
    it('ターン切り替え時に前のプレイヤーのタイマーが停止し、次のプレイヤーのタイマーが開始される', async () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤー1をアクティブに設定
      const firstPlayerId = result.current.gameState.players[0].id;
      act(() => {
        result.current.setActivePlayer(firstPlayerId);
      });

      // 1秒待機してタイマーが動作することを確認
      await new Promise(resolve => setTimeout(resolve, 1100));

      // プレイヤー1の経過時間が増加
      expect(result.current.gameState.players[0].elapsedTimeSeconds).toBeGreaterThan(0);
      const player1Time = result.current.gameState.players[0].elapsedTimeSeconds;

      // プレイヤー2へターン切り替え
      act(() => {
        result.current.switchToNextPlayer();
      });

      // プレイヤー1のタイマーは停止（時間は保持）
      expect(result.current.gameState.players[0].isActive).toBe(false);
      expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(player1Time);

      // プレイヤー2がアクティブになり、タイマーが開始される
      expect(result.current.gameState.players[1].isActive).toBe(true);

      // 1秒待機してプレイヤー2のタイマーが動作することを確認
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(result.current.gameState.players[1].elapsedTimeSeconds).toBeGreaterThan(0);
    });
  });
});

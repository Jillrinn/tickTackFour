import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

/**
 * Task 10.4: ゲームコントロール機能のテスト
 *
 * 要件:
 * - リセットボタン: 全プレイヤーのタイマーを初期値にリセット
 * - 一時停止/再開ボタン: アクティブタイマーの一時停止と再開
 * - タイマーモード切り替え（カウントアップ/カウントダウン）
 * - カウントダウンモード時の初期時間設定UI
 */
describe('useGameState - ゲームコントロール機能（Task 10.4）', () => {
  describe('resetGame（リセット機能）', () => {
    it('カウントアップモードでリセットすると全プレイヤーの時間が0秒になる', () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤー1の時間を更新
      const player1Id = result.current.gameState.players[0].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 30);
      });

      expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(30);

      // リセット
      act(() => {
        result.current.resetGame();
      });

      // 全プレイヤーが0秒にリセット
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(0);
        expect(player.isActive).toBe(false);
      });
      expect(result.current.gameState.activePlayerId).toBeNull();
      expect(result.current.gameState.isPaused).toBe(true);  // reset-button-fix: 停止状態
    });

    it('カウントダウンモードでリセットすると全プレイヤーの時間が初期時間になる', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに変更（初期時間600秒）
      act(() => {
        result.current.setTimerMode('countdown', 600);
      });

      // プレイヤー1の時間を減少
      const player1Id = result.current.gameState.players[0].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 300);
      });

      expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(300);

      // リセット
      act(() => {
        result.current.resetGame();
      });

      // 全プレイヤーが初期時間（600秒）にリセット
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(600);
        expect(player.initialTimeSeconds).toBe(600);
        expect(player.isActive).toBe(false);
      });
      expect(result.current.gameState.activePlayerId).toBeNull();
      expect(result.current.gameState.isPaused).toBe(true);  // reset-button-fix: 停止状態
    });

    it('アクティブプレイヤーがいる状態でリセットすると全てのプレイヤーが非アクティブになる', () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤー2をアクティブに設定
      const player2Id = result.current.gameState.players[1].id;
      act(() => {
        result.current.setActivePlayer(player2Id);
      });

      expect(result.current.gameState.activePlayerId).toBe(player2Id);
      expect(result.current.gameState.players[1].isActive).toBe(true);

      // リセット
      act(() => {
        result.current.resetGame();
      });

      // 全プレイヤーが非アクティブ
      result.current.gameState.players.forEach(player => {
        expect(player.isActive).toBe(false);
      });
      expect(result.current.gameState.activePlayerId).toBeNull();
    });
  });

  describe('setPaused（一時停止/再開機能）', () => {
    it('一時停止すると isPaused が true になる', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.gameState.isPaused).toBe(false);

      act(() => {
        result.current.setPaused(true);
      });

      expect(result.current.gameState.isPaused).toBe(true);
    });

    it('再開すると isPaused が false になる', () => {
      const { result } = renderHook(() => useGameState());

      // まず一時停止
      act(() => {
        result.current.setPaused(true);
      });

      expect(result.current.gameState.isPaused).toBe(true);

      // 再開
      act(() => {
        result.current.setPaused(false);
      });

      expect(result.current.gameState.isPaused).toBe(false);
    });
  });

  describe('setTimerMode（タイマーモード切り替え）', () => {
    it('カウントアップモードに切り替えると全プレイヤーの時間が0秒になる', () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤーの時間を設定
      const player1Id = result.current.gameState.players[0].id;
      act(() => {
        result.current.updatePlayerTime(player1Id, 100);
      });

      // カウントアップモードに切り替え
      act(() => {
        result.current.setTimerMode('countup');
      });

      // 全プレイヤーが0秒にリセット
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(0);
      });
      expect(result.current.gameState.timerMode).toBe('countup');
    });

    it('カウントダウンモードに切り替えると全プレイヤーの時間が初期時間になる', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに切り替え（初期時間300秒）
      act(() => {
        result.current.setTimerMode('countdown', 300);
      });

      // 全プレイヤーが300秒に設定
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(300);
        expect(player.initialTimeSeconds).toBe(300);
      });
      expect(result.current.gameState.timerMode).toBe('countdown');
    });

    it('カウントダウンモードで初期時間を指定しない場合はデフォルト値（600秒）が設定される', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに切り替え（初期時間指定なし）
      act(() => {
        result.current.setTimerMode('countdown');
      });

      // 全プレイヤーがデフォルト値（600秒）に設定
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(600);
        expect(player.initialTimeSeconds).toBe(600);
      });
      expect(result.current.gameState.timerMode).toBe('countdown');
    });

    it('カウントダウンモードでカスタム初期時間（120秒）を設定できる', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに切り替え（初期時間120秒）
      act(() => {
        result.current.setTimerMode('countdown', 120);
      });

      // 全プレイヤーが120秒に設定
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(120);
        expect(player.initialTimeSeconds).toBe(120);
      });
      expect(result.current.gameState.timerMode).toBe('countdown');
    });
  });

  describe('ゲームコントロールの統合動作', () => {
    it('一時停止中にリセットすると停止状態が維持される', () => {
      const { result } = renderHook(() => useGameState());

      // 一時停止
      act(() => {
        result.current.setPaused(true);
      });

      expect(result.current.gameState.isPaused).toBe(true);

      // リセット
      act(() => {
        result.current.resetGame();
      });

      // 停止状態が維持される（reset-button-fix: リセット後は常に停止状態）
      expect(result.current.gameState.isPaused).toBe(true);
    });

    it('タイマーモード切り替え後にリセットしても同じモードが維持される', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモードに切り替え
      act(() => {
        result.current.setTimerMode('countdown', 300);
      });

      expect(result.current.gameState.timerMode).toBe('countdown');

      // リセット
      act(() => {
        result.current.resetGame();
      });

      // カウントダウンモードが維持される
      expect(result.current.gameState.timerMode).toBe('countdown');
      // 初期時間も維持される
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(300);
        expect(player.initialTimeSeconds).toBe(300);
      });
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState - ゲーム全体のプレイ時間（Task 3.2）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getTotalGameTime', () => {
    it('getTotalGameTime関数が存在する', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.getTotalGameTime).toBeDefined();
      expect(typeof result.current.getTotalGameTime).toBe('function');
    });

    it('プレイヤーが0人の場合は0を返す', () => {
      const { result } = renderHook(() => useGameState());

      // 全プレイヤーを削除（プレイヤー数を0にはできないので、デフォルト4人のままで0時間）
      // 初期状態では全員0秒なので、0を返すはず
      const totalTime = result.current.getTotalGameTime();
      expect(totalTime).toBe(0);
    });

    it('カウントアップモードで全プレイヤーの経過時間合計を計算する', () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤー1: 60秒、プレイヤー2: 120秒、プレイヤー3: 30秒、プレイヤー4: 90秒
      act(() => {
        result.current.updatePlayerTime(result.current.gameState.players[0].id, 60);
        result.current.updatePlayerTime(result.current.gameState.players[1].id, 120);
        result.current.updatePlayerTime(result.current.gameState.players[2].id, 30);
        result.current.updatePlayerTime(result.current.gameState.players[3].id, 90);
      });

      const totalTime = result.current.getTotalGameTime();
      expect(totalTime).toBe(300); // 60 + 120 + 30 + 90 = 300秒
    });

    it('カウントダウンモードで正しい経過時間を計算する', () => {
      const { result } = renderHook(() => useGameState());

      // カウントダウンモード（初期時間600秒）に設定
      act(() => {
        result.current.setTimerMode('countdown', 600);
      });

      // カウントダウンモードでも、elapsedTimeSecondsの合計を返す（design.md line 363）
      // プレイヤー1: 500秒、プレイヤー2: 400秒、プレイヤー3: 550秒、プレイヤー4: 450秒
      act(() => {
        result.current.updatePlayerTime(result.current.gameState.players[0].id, 500);
        result.current.updatePlayerTime(result.current.gameState.players[1].id, 400);
        result.current.updatePlayerTime(result.current.gameState.players[2].id, 550);
        result.current.updatePlayerTime(result.current.gameState.players[3].id, 450);
      });

      const totalTime = result.current.getTotalGameTime();
      // getTotalGameTimeは全プレイヤーのelapsedTimeSecondsの合計を返す
      // 合計: 500 + 400 + 550 + 450 = 1900秒
      expect(totalTime).toBe(1900);
    });

    it('プレイヤー数が変更された後、全プレイヤーの時間がリセットされるため0を返す（要件3.5）', () => {
      const { result } = renderHook(() => useGameState());

      // 初期4人の時間を設定
      act(() => {
        result.current.updatePlayerTime(result.current.gameState.players[0].id, 60);
        result.current.updatePlayerTime(result.current.gameState.players[1].id, 120);
        result.current.updatePlayerTime(result.current.gameState.players[2].id, 30);
        result.current.updatePlayerTime(result.current.gameState.players[3].id, 90);
      });

      // 合計時間を確認（変更前）
      expect(result.current.getTotalGameTime()).toBe(300);

      // プレイヤー数を5人に変更（要件3.5: 全プレイヤーの時間が0にリセットされる）
      act(() => {
        result.current.setPlayerCount(5);
      });

      // 要件3.5: プレイヤー人数変更時に全プレイヤーの時間が0にリセットされる
      const totalTime = result.current.getTotalGameTime();
      expect(totalTime).toBe(0); // 全プレイヤーの時間がリセットされたため0
    });

    it('全プレイヤーの時間が0の場合は0を返す', () => {
      const { result } = renderHook(() => useGameState());

      // 初期状態（全員0秒）
      const totalTime = result.current.getTotalGameTime();
      expect(totalTime).toBe(0);
    });

    it('一部のプレイヤーのみ時間がある場合も正しく計算する', () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤー1とプレイヤー3のみ時間を設定
      act(() => {
        result.current.updatePlayerTime(result.current.gameState.players[0].id, 100);
        result.current.updatePlayerTime(result.current.gameState.players[2].id, 200);
      });

      const totalTime = result.current.getTotalGameTime();
      expect(totalTime).toBe(300); // 100 + 0 + 200 + 0 = 300秒
    });
  });
});

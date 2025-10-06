import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

/**
 * Task 12.4: プレイヤー数入力バリデーションテスト
 *
 * 要件:
 * - プレイヤー数変更時に4〜6人の範囲チェック
 * - 範囲外の場合はエラーをthrow（既存実装）
 * - UI用のバリデーション関数を提供
 */
describe('useGameState - プレイヤー数入力バリデーション（Task 12.4）', () => {
  describe('validatePlayerCount - プレイヤー数バリデーション', () => {
    it('4人は有効な範囲である', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(4)).toBe(true);
    });

    it('5人は有効な範囲である', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(5)).toBe(true);
    });

    it('6人は有効な範囲である', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(6)).toBe(true);
    });

    it('3人は無効な範囲である（最小値未満）', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(3)).toBe(false);
    });

    it('7人は無効な範囲である（最大値超過）', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(7)).toBe(false);
    });

    it('0人は無効な範囲である', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(0)).toBe(false);
    });

    it('負の値は無効な範囲である', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(-1)).toBe(false);
    });

    it('100人は無効な範囲である', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.validatePlayerCount(100)).toBe(false);
    });
  });

  describe('getPlayerCountError - エラーメッセージ取得', () => {
    it('有効な値の場合はnullを返す', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.getPlayerCountError(4)).toBeNull();
      expect(result.current.getPlayerCountError(5)).toBeNull();
      expect(result.current.getPlayerCountError(6)).toBeNull();
    });

    it('最小値未満の場合はエラーメッセージを返す', () => {
      const { result } = renderHook(() => useGameState());

      const error = result.current.getPlayerCountError(3);
      expect(error).toContain('4');
      expect(error).toContain('6');
    });

    it('最大値超過の場合はエラーメッセージを返す', () => {
      const { result } = renderHook(() => useGameState());

      const error = result.current.getPlayerCountError(7);
      expect(error).toContain('4');
      expect(error).toContain('6');
    });

    it('0の場合はエラーメッセージを返す', () => {
      const { result } = renderHook(() => useGameState());

      const error = result.current.getPlayerCountError(0);
      expect(error).toBeTruthy();
      expect(error).toContain('4');
      expect(error).toContain('6');
    });
  });

  describe('setPlayerCount - バリデーション統合（既存機能の確認）', () => {
    it('有効な値の場合は正常にプレイヤー数を変更', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setPlayerCount(5);
      });

      expect(result.current.gameState.players.length).toBe(5);
    });

    it('無効な値の場合はエラーをthrow', () => {
      const { result } = renderHook(() => useGameState());

      expect(() => {
        act(() => {
          result.current.setPlayerCount(3);
        });
      }).toThrow('プレイヤー数は4〜6人の範囲でなければなりません');
    });
  });
});

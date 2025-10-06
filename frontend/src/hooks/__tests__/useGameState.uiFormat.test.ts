import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameState } from '../useGameState';

/**
 * Task 12.1: MM:SS形式フォーマット表示のテスト
 *
 * 要件:
 * - タイマー値を「分:秒」形式（MM:SS）で表示
 * - 0秒 → "00:00"
 * - 65秒 → "01:05"
 * - 3599秒 → "59:59"
 * - 3600秒以上 → "60:00", "61:05" など
 */
describe('useGameState - MM:SS形式フォーマット表示（Task 12.1）', () => {
  describe('formatTime - 時間フォーマット関数', () => {
    it('0秒を "00:00" にフォーマットする', () => {
      const { result } = renderHook(() => useGameState());

      // formatTime関数が存在し、0秒を正しくフォーマットする
      expect(result.current.formatTime(0)).toBe('00:00');
    });

    it('59秒を "00:59" にフォーマットする', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatTime(59)).toBe('00:59');
    });

    it('60秒（1分）を "01:00" にフォーマットする', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatTime(60)).toBe('01:00');
    });

    it('65秒を "01:05" にフォーマットする', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatTime(65)).toBe('01:05');
    });

    it('600秒（10分）を "10:00" にフォーマットする', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatTime(600)).toBe('10:00');
    });

    it('3599秒（59分59秒）を "59:59" にフォーマットする', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatTime(3599)).toBe('59:59');
    });

    it('3600秒（1時間）を "60:00" にフォーマットする（時間表記なし）', () => {
      const { result } = renderHook(() => useGameState());

      // 1時間以上も分:秒形式で表示（60分以上も表示可能）
      expect(result.current.formatTime(3600)).toBe('60:00');
    });

    it('3665秒を "61:05" にフォーマットする', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatTime(3665)).toBe('61:05');
    });

    it('負の値を "00:00" にフォーマットする（安全処理）', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatTime(-10)).toBe('00:00');
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState - ゲーム全体時間フォーマット（Task 3.3）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatGameTime', () => {
    it('formatGameTime関数が存在する', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.formatGameTime).toBeDefined();
      expect(typeof result.current.formatGameTime).toBe('function');
    });

    it('0秒は"00:00"を返す', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(0);
      expect(formatted).toBe('00:00');
    });

    it('59秒は"00:59"を返す（MM:SS形式）', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(59);
      expect(formatted).toBe('00:59');
    });

    it('60秒は"01:00"を返す（MM:SS形式）', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(60);
      expect(formatted).toBe('01:00');
    });

    it('3599秒（59分59秒）は"59:59"を返す（MM:SS形式）', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(3599);
      expect(formatted).toBe('59:59');
    });

    it('3600秒（1時間）は"1:00:00"を返す（HH:MM:SS形式）', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(3600);
      expect(formatted).toBe('1:00:00');
    });

    it('3661秒（1時間1分1秒）は"1:01:01"を返す（HH:MM:SS形式）', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(3661);
      expect(formatted).toBe('1:01:01');
    });

    it('7200秒（2時間）は"2:00:00"を返す（HH:MM:SS形式）', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(7200);
      expect(formatted).toBe('2:00:00');
    });

    it('7325秒（2時間2分5秒）は"2:02:05"を返す（HH:MM:SS形式）', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(7325);
      expect(formatted).toBe('2:02:05');
    });

    it('負の値は0として扱い"00:00"を返す', () => {
      const { result } = renderHook(() => useGameState());

      const formatted = result.current.formatGameTime(-10);
      expect(formatted).toBe('00:00');
    });

    it('formatTime関数を再利用してコードの重複を避ける（1時間未満）', () => {
      const { result } = renderHook(() => useGameState());

      // 1時間未満はformatTimeと同じ結果を返すべき
      const seconds = 1234; // 20分34秒
      const formatGameTimeResult = result.current.formatGameTime(seconds);
      const formatTimeResult = result.current.formatTime(seconds);

      expect(formatGameTimeResult).toBe(formatTimeResult);
      expect(formatGameTimeResult).toBe('20:34');
    });
  });
});

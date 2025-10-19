import { describe, it, expect } from 'vitest';
import { formatTime } from '../formatTime';

describe('formatTime', () => {
  it('0秒の場合は"00:00"を返す', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('59秒の場合は"00:59"を返す', () => {
    expect(formatTime(59)).toBe('00:59');
  });

  it('3599秒（59分59秒）の場合は"59:59"を返す', () => {
    expect(formatTime(3599)).toBe('59:59');
  });

  it('3600秒（1時間）の場合は"1:00:00"を返す', () => {
    expect(formatTime(3600)).toBe('1:00:00');
  });

  it('3661秒（1時間1分1秒）の場合は"1:01:01"を返す', () => {
    expect(formatTime(3661)).toBe('1:01:01');
  });

  it('負の値を0として扱い"00:00"を返す', () => {
    expect(formatTime(-100)).toBe('00:00');
  });
});

import { describe, test, expect } from 'vitest';
import { createMockServerState, createMockServerGameState } from '../createMockServerGameState';

describe('createMockServerState', () => {
  test('既定で4人・未開始・カウントアップの状態を返す', () => {
    const s = createMockServerState();
    expect(s.players).toHaveLength(4);
    expect(s.activePlayerIndex).toBe(-1);
    expect(s.timerMode).toBe('countup');
    expect(s.isPaused).toBe(true);
    expect(typeof s.etag).toBe('string');
  });

  test('overridesで部分上書きできる', () => {
    const s = createMockServerState({ activePlayerIndex: 1, isPaused: false });
    expect(s.activePlayerIndex).toBe(1);
    expect(s.isPaused).toBe(false);
    expect(s.players).toHaveLength(4); // 既定維持
  });
});

describe('createMockServerGameState', () => {
  test('useServerGameStateと同じキーを持ち、関数はモックである', () => {
    const m = createMockServerGameState();
    expect(m.serverState).not.toBeNull();
    expect(typeof m.formatTime).toBe('function');
    expect(m.formatTime(65)).toBe('01:05');
    expect(typeof m.getLongestTimePlayer).toBe('function');
    expect(typeof m.syncWithServer).toBe('function');
  });

  test('serverState: null を渡せる（ゲーム未ロード相当）', () => {
    const m = createMockServerGameState({ serverState: null });
    expect(m.serverState).toBeNull();
  });
});

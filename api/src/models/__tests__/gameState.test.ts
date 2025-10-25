import { describe, it, expect } from '@jest/globals';
import { createDefaultGameState, GameState } from '../gameState';

describe('createDefaultGameState', () => {
  it('リセット後のisPausedフラグがtrueであること', () => {
    const state: GameState = createDefaultGameState();
    expect(state.isPaused).toBe(true);
  });

  it('リセット後のactivePlayerIndexが-1であること', () => {
    const state: GameState = createDefaultGameState();
    expect(state.activePlayerIndex).toBe(-1);
  });

  it('リセット後のturnStartedAtがundefinedであること', () => {
    const state: GameState = createDefaultGameState();
    expect(state.turnStartedAt).toBeUndefined();
  });

  it('リセット後のpausedAtがundefinedであること', () => {
    const state: GameState = createDefaultGameState();
    expect(state.pausedAt).toBeUndefined();
  });

  it('4人のプレイヤーがaccumulatedSeconds: 0で初期化されること', () => {
    const state: GameState = createDefaultGameState();

    expect(state.players).toHaveLength(4);
    expect(state.players[0]).toEqual({ id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 });
    expect(state.players[1]).toEqual({ id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 });
    expect(state.players[2]).toEqual({ id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 });
    expect(state.players[3]).toEqual({ id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 });
  });
});

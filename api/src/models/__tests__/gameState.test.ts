import { describe, it, expect } from '@jest/globals';
import { createDefaultGameState, toEntity, fromEntity, GameState } from '../gameState';
import type { GameStateEntity } from '../gameState';

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

describe('gameMode / turnNumber 永続化', () => {
  it('createDefaultGameState は gameMode=normal, turnNumber=0 を持つ', () => {
    const s = createDefaultGameState();
    expect(s.gameMode).toBe('normal');
    expect(s.turnNumber).toBe(0);
  });

  it('toEntity → fromEntity で gameMode/turnNumber が往復する', () => {
    const s = createDefaultGameState();
    s.gameMode = 'catan';
    s.turnNumber = 5;
    const entity = { ...toEntity(s), etag: 'x' } as GameStateEntity;
    const restored = fromEntity(entity);
    expect(restored.gameMode).toBe('catan');
    expect(restored.turnNumber).toBe(5);
  });

  it('旧データ（gameMode/turnNumber 無し）は normal/0 に補完される', () => {
    const legacy = {
      partitionKey: 'game', rowKey: 'default', etag: 'x',
      playerCount: 4,
      players: JSON.stringify([{ id: 1, name: 'プレイヤー1', accumulatedSeconds: 0 }]),
      activePlayerIndex: -1, timerMode: 'countup', countdownSeconds: 60, isPaused: true
    } as unknown as GameStateEntity;
    const restored = fromEntity(legacy);
    expect(restored.gameMode).toBe('normal');
    expect(restored.turnNumber).toBe(0);
  });
});

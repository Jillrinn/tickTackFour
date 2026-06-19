// frontend/src/hooks/__tests__/useGameState.catanMode.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';

describe('useGameState カタンモード', () => {
  it('setGameModeでcatanに切替できる', () => {
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setGameMode('catan'));
    expect(result.current.gameState.gameMode).toBe('catan');
  });

  it('4人カタン: 開始→次へ で 1,2,3,4,3,2,1 の順に進む', () => {
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setGameMode('catan')); // 4人デフォルト
    const indices: number[] = [];
    // 開始（最初の手番 t=0）
    act(() => result.current.switchToNextPlayer());
    for (let i = 0; i < 7; i++) {
      const activeId = result.current.gameState.activePlayerId;
      indices.push(result.current.gameState.players.findIndex(p => p.id === activeId));
      act(() => result.current.switchToNextPlayer());
    }
    // t=0..6 のindex（最後のswitchでt=7=フェーズ2 index0へ移行）
    expect(indices).toEqual([0, 1, 2, 3, 2, 1, 0]);
  });

  it('通常モードは従来どおり循環（4人: 0,1,2,3,0）', () => {
    const { result } = renderHook(() => useGameState());
    const indices: number[] = [];
    act(() => result.current.switchToNextPlayer()); // 開始 index0
    for (let i = 0; i < 5; i++) {
      const activeId = result.current.gameState.activePlayerId;
      indices.push(result.current.gameState.players.findIndex(p => p.id === activeId));
      act(() => result.current.switchToNextPlayer());
    }
    expect(indices).toEqual([0, 1, 2, 3, 0]);
  });
});

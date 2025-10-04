import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameTimer } from '../useGameTimer';
import type { GameState } from '../../types/GameState';

describe('useGameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockGameState: GameState = {
    players: [
      {
        id: 'player-1',
        name: 'プレイヤー1',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: true,
        createdAt: new Date()
      },
      {
        id: 'player-2',
        name: 'プレイヤー2',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date()
      }
    ],
    activePlayerId: 'player-1',
    isPaused: false,
    timerMode: 'count-up',
    createdAt: new Date(),
    lastUpdatedAt: new Date()
  };

  it('カウントアップモードで1秒ごとにタイマーが更新される', () => {
    const onTimerTick = vi.fn();
    renderHook(() => useGameTimer(mockGameState, onTimerTick));

    // 1秒進める
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onTimerTick).toHaveBeenCalledWith('player-1', 1);

    // さらに1秒進める
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onTimerTick).toHaveBeenCalledWith('player-1', 2);
  });

  it('カウントダウンモードで1秒ごとにタイマーが減少する', () => {
    const onTimerTick = vi.fn();
    const countdownState: GameState = {
      ...mockGameState,
      timerMode: 'count-down',
      players: [
        {
          ...mockGameState.players[0],
          elapsedTimeSeconds: 10, // 10秒残り
          initialTimeSeconds: 10
        },
        mockGameState.players[1]
      ]
    };

    renderHook(() => useGameTimer(countdownState, onTimerTick));

    // 1秒進める
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onTimerTick).toHaveBeenCalledWith('player-1', 9);
  });

  it('一時停止中はタイマーが更新されない', () => {
    const onTimerTick = vi.fn();
    const pausedState: GameState = {
      ...mockGameState,
      isPaused: true
    };

    renderHook(() => useGameTimer(pausedState, onTimerTick));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTimerTick).not.toHaveBeenCalled();
  });

  it('アクティブプレイヤーがいない場合はタイマーが更新されない', () => {
    const onTimerTick = vi.fn();
    const noActiveState: GameState = {
      ...mockGameState,
      activePlayerId: null,
      players: mockGameState.players.map(p => ({ ...p, isActive: false }))
    };

    renderHook(() => useGameTimer(noActiveState, onTimerTick));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTimerTick).not.toHaveBeenCalled();
  });

  it('5秒ごとにサーバー同期コールバックが呼ばれる', () => {
    const onServerSync = vi.fn();
    renderHook(() => useGameTimer(mockGameState, vi.fn(), onServerSync));

    // 4秒では呼ばれない
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onServerSync).not.toHaveBeenCalled();

    // 5秒で呼ばれる
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onServerSync).toHaveBeenCalledWith('player-1', 5);

    // 10秒で再度呼ばれる
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onServerSync).toHaveBeenCalledWith('player-1', 10);
  });

  it('カウントダウンモードで0:00到達時にタイマーが停止する', () => {
    const onTimerTick = vi.fn();
    const onTimeExpired = vi.fn();
    const countdownState: GameState = {
      ...mockGameState,
      timerMode: 'count-down',
      players: [
        {
          ...mockGameState.players[0],
          elapsedTimeSeconds: 2, // 2秒残り
          initialTimeSeconds: 600
        },
        mockGameState.players[1]
      ]
    };

    renderHook(() => useGameTimer(countdownState, onTimerTick, vi.fn(), onTimeExpired));

    // 1秒進める（1秒残り）
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTimerTick).toHaveBeenCalledWith('player-1', 1);
    expect(onTimeExpired).not.toHaveBeenCalled();

    // さらに1秒進める（0秒＝時間切れ）
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTimerTick).toHaveBeenCalledWith('player-1', 0);
    expect(onTimeExpired).toHaveBeenCalledWith('player-1');

    // 時間切れ後はタイマーが止まる
    onTimerTick.mockClear();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onTimerTick).not.toHaveBeenCalled();
  });

  it('アンマウント時にタイマーがクリアされる', () => {
    const onTimerTick = vi.fn();
    const { unmount } = renderHook(() => useGameTimer(mockGameState, onTimerTick));

    // アンマウント
    unmount();

    // タイマーが進んでも呼ばれない
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onTimerTick).not.toHaveBeenCalled();
  });
});

import { vi } from 'vitest';
import type { GameStateWithTime } from '../types/GameState';

export interface MockServerGameState {
  serverState: GameStateWithTime | null;
  displayTime: number;
  updateFromServer: ReturnType<typeof vi.fn>;
  formatTime: (seconds: number) => string;
  getLongestTimePlayer: ReturnType<typeof vi.fn>;
  getTotalGameTime: ReturnType<typeof vi.fn>;
  formatGameTime: (seconds: number) => string;
  getCurrentTurnTime: ReturnType<typeof vi.fn>;
  syncWithServer: ReturnType<typeof vi.fn>;
  updatePlayerNameOptimistic: ReturnType<typeof vi.fn>;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatGameTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function createMockServerState(
  overrides: Partial<GameStateWithTime> = {}
): GameStateWithTime {
  const players = overrides.players ?? [
    { name: 'プレイヤー1', elapsedSeconds: 0 },
    { name: 'プレイヤー2', elapsedSeconds: 0 },
    { name: 'プレイヤー3', elapsedSeconds: 0 },
    { name: 'プレイヤー4', elapsedSeconds: 0 },
  ];
  return {
    activePlayerIndex: -1,
    timerMode: 'countup',
    countdownSeconds: 600,
    isPaused: true,
    etag: 'mock-etag',
    turnStartedAt: null,
    pausedAt: null,
    gameMode: 'normal',
    phase: 0,
    ...overrides,
    players,
  };
}

export function createMockServerGameState(
  overrides: {
    serverState?: Partial<GameStateWithTime> | null;
    displayTime?: number;
    turnTime?: number;
  } = {}
): MockServerGameState {
  const serverState =
    overrides.serverState === null
      ? null
      : createMockServerState(overrides.serverState ?? {});
  const longest =
    serverState && serverState.players.some((p) => p.elapsedSeconds > 0)
      ? (() => {
          const max = Math.max(...serverState.players.map((p) => p.elapsedSeconds));
          const idx = serverState.players.findIndex((p) => p.elapsedSeconds === max);
          return { ...serverState.players[idx], index: idx };
        })()
      : null;
  const total = serverState
    ? serverState.players.reduce((t, p) => t + p.elapsedSeconds, 0)
    : 0;
  return {
    serverState,
    displayTime: overrides.displayTime ?? 0,
    updateFromServer: vi.fn(),
    formatTime,
    getLongestTimePlayer: vi.fn(() => longest),
    getTotalGameTime: vi.fn(() => total),
    formatGameTime,
    getCurrentTurnTime: vi.fn(() => overrides.turnTime ?? 0),
    syncWithServer: vi.fn(async () => serverState),
    updatePlayerNameOptimistic: vi.fn(),
  };
}

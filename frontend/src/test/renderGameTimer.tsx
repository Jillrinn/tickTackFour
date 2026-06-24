import { vi } from 'vitest';
import { render, type RenderResult } from '@testing-library/react';
import type { GameStateWithTime } from '../types/GameState';
import { GameTimer } from '../components/GameTimer';
import { useServerGameState } from '../hooks/useServerGameState';
import { useGameApi } from '../hooks/useGameApi';
import { usePollingSync } from '../hooks/usePollingSync';
import { createMockServerGameState, createMockServerState } from './createMockServerGameState';

export const mockApi = {
  switchTurn: vi.fn(async () => createMockServerState()),
  pauseGame: vi.fn(async () => createMockServerState()),
  resumeGame: vi.fn(async () => createMockServerState()),
  resetGame: vi.fn(async () => createMockServerState()),
  updateGame: vi.fn(async () => createMockServerState()),
  updatePlayerName: vi.fn(async () => createMockServerState()),
};

export function renderGameTimer(options: {
  serverState?: Partial<GameStateWithTime> | null;
  displayTime?: number;
  turnTime?: number;
} = {}): RenderResult {
  Object.values(mockApi).forEach((fn) => fn.mockClear());

  vi.mocked(useServerGameState).mockReturnValue(createMockServerGameState(options));
  vi.mocked(useGameApi).mockReturnValue(mockApi as unknown as ReturnType<typeof useGameApi>);
  vi.mocked(usePollingSync).mockImplementation(() => undefined);

  return render(<GameTimer />);
}

import { describe, test, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderGameTimer, mockApi } from '../renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('renderGameTimer', () => {
  test('既定状態でGameTimerを描画できる', () => {
    renderGameTimer();
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();
  });

  test('serverStateを上書きして描画できる', () => {
    renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });
    expect(screen.getByRole('heading', { name: 'プレイヤー一覧', level: 3 })).toBeInTheDocument();
  });

  test('mockApiの各関数はモックである', () => {
    expect(typeof mockApi.switchTurn).toBe('function');
    expect(vi.isMockFunction(mockApi.switchTurn)).toBe(true);
  });
});

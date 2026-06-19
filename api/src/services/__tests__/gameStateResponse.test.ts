import { toGameStateWithTime } from '../gameStateResponse';
import { createDefaultGameState } from '../../models/gameState';

describe('toGameStateWithTime gameMode/phase', () => {
  it('通常モードは gameMode=normal, phase=0', () => {
    const state = createDefaultGameState();
    state.activePlayerIndex = 0;
    const res = toGameStateWithTime(state, 'etag-1');
    expect(res.gameMode).toBe('normal');
    expect(res.phase).toBe(0);
  });

  it('カタン: turnNumber=6, 4人 は phase=1', () => {
    const state = createDefaultGameState();
    state.gameMode = 'catan';
    state.turnNumber = 6;
    state.activePlayerIndex = 0;
    expect(toGameStateWithTime(state, 'e').phase).toBe(1);
  });

  it('カタン: turnNumber=7, 4人 は phase=2', () => {
    const state = createDefaultGameState();
    state.gameMode = 'catan';
    state.turnNumber = 7;
    state.activePlayerIndex = 0;
    expect(toGameStateWithTime(state, 'e').phase).toBe(2);
  });
});

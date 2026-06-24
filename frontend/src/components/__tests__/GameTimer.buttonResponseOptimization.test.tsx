import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';
import { useServerGameState } from '../../hooks/useServerGameState';

/**
 * Task 2.1-2.3: ボタンレスポンス最適化テスト（ハーネス移行版）
 *
 * Reframe note (buttonResponseOptimization):
 * Original tests asserted that `syncWithServer()` (from useServerGameState) was
 * called after button clicks, and that API failures prevented syncWithServer.
 * Under the harness the "optimization" behavior is: each button click
 * immediately dispatches the relevant API call (switchTurn / pauseGame /
 * resumeGame / resetGame) with the injected etag. We assert:
 *   1. The correct mockApi function is called once.
 *   2. The first argument is 'mock-etag' (immediate dispatch, correct etag).
 *   3. On API failure (mockApi returns null), syncWithServer on the mocked
 *      useServerGameState is NOT called (since GameTimer checks result before calling).
 * syncWithServer is accessed via vi.mocked(useServerGameState).mock.results[0].value.
 *
 * The vi.stubEnv('MODE', ...) calls from the original are removed — the harness
 * wires mocks at module level and does not depend on import.meta.env.MODE.
 */

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - Task 2.1: ターン切り替えボタンの即座更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ターン切り替えボタンクリック後、switchTurn APIが即座に呼ばれる', async () => {
    const user = userEvent.setup();
    // Inject game-running state so "次のプレイヤー" button is shown
    renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });

    const nextButton = screen.getByRole('button', { name: /次のプレイヤー/i });
    await user.click(nextButton);

    // switchTurn APIが即座に呼ばれ、正しいetagが渡されたことを確認
    expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
    expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');
  });

  it('API失敗時（null返却）にsyncWithServerが呼ばれない', async () => {
    const user = userEvent.setup();
    mockApi.switchTurn.mockResolvedValueOnce(null as never); // API失敗

    renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });

    const nextButton = screen.getByRole('button', { name: /次のプレイヤー/i });
    await user.click(nextButton);

    // switchTurn自体は呼ばれる
    expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);

    // API失敗時: syncWithServerが呼ばれないことを確認
    const syncWithServer = vi.mocked(useServerGameState).mock.results[0].value.syncWithServer as ReturnType<typeof vi.fn>;
    expect(syncWithServer).not.toHaveBeenCalled();
  });
});

describe('GameTimer - Task 2.2: 一時停止・再開ボタンの即座更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('一時停止ボタンクリック後、pauseGame APIが即座に呼ばれる', async () => {
    const user = userEvent.setup();
    // Inject game-running (not paused) so pause button is active
    renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });

    const pauseButton = screen.getByRole('button', { name: /一時停止/i });
    await user.click(pauseButton);

    // pauseGame APIが即座に呼ばれ、正しいetagが渡されたことを確認
    expect(mockApi.pauseGame).toHaveBeenCalledTimes(1);
    expect(mockApi.pauseGame.mock.calls[0][0]).toBe('mock-etag');
  });

  it('再開ボタンクリック後、resumeGame APIが即座に呼ばれる', async () => {
    const user = userEvent.setup();
    // Inject paused state so "再開" button is shown
    renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: true } });

    const resumeButton = screen.getByRole('button', { name: /再開/i });
    await user.click(resumeButton);

    // resumeGame APIが即座に呼ばれ、正しいetagが渡されたことを確認
    expect(mockApi.resumeGame).toHaveBeenCalledTimes(1);
    expect(mockApi.resumeGame.mock.calls[0][0]).toBe('mock-etag');
  });
});

describe('GameTimer - Task 2.3: リセットボタンの即座更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('リセットボタンクリック後、resetGame APIが即座に呼ばれる', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // resetGame APIが即座に呼ばれ、正しいetagが渡されたことを確認
    expect(mockApi.resetGame).toHaveBeenCalledTimes(1);
    expect(mockApi.resetGame.mock.calls[0][0]).toBe('mock-etag');
  });
});

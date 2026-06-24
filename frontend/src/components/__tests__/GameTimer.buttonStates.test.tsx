import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';

// Reframe note (buttonStates):
// Original tests used fallback mode and asserted visible DOM state changes after
// button clicks (e.g. button text, disabled state). Under the server-state harness,
// the static mock's serverState does NOT mutate on click, so DOM-state-after-click
// assertions are not honest. Tests in Task 5.2 and 5.3 have been renamed and
// reframed to assert that the correct API is dispatched with the correct etag.
// Task 5.1 tests (initial state) work unchanged since they only check rendered
// initial state which is fully determined by the injected serverState.

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - ボタン状態管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 5.1: ゲーム未開始時のボタン状態', () => {
    it('一時停止ボタンがdisabled状態で表示される', () => {
      // Default: activePlayerIndex=-1 → isGameActive=false → pause button disabled
      renderGameTimer();

      const pauseButton = screen.getByRole('button', { name: /停止|再開/i });
      expect(pauseButton).toBeDisabled();
    });

    it('次のプレイヤーへボタンのテキストが「ゲームを開始する」である', () => {
      // Default: activePlayerIndex=-1 → isGameActive=false → shows 'ゲームを開始する'
      renderGameTimer();

      const nextPlayerButton = screen.getByRole('button', { name: /ゲームを開始/ });
      expect(nextPlayerButton).toHaveTextContent('ゲームを開始する');
    });

    it('次のプレイヤーへボタンのaria-labelが「ゲームを開始」である', () => {
      // Default: activePlayerIndex=-1 → aria-label="ゲームを開始"
      renderGameTimer();

      const nextPlayerButton = screen.getByRole('button', { name: 'ゲームを開始' });
      expect(nextPlayerButton).toBeInTheDocument();
    });
  });

  describe('Task 5.2: ゲーム進行中のボタン状態（APIディスパッチ検証）', () => {
    // Reframe: Original tests asserted DOM state changes after click.
    // Under the static mock serverState does not mutate. Instead, we verify
    // that the correct API (switchTurn) is dispatched with the correct etag,
    // which is the testable proxy for "game is started / turn switched".

    it('ゲームを開始するボタンクリック後、switchTurn APIが正しいetagで呼び出される', async () => {
      const user = userEvent.setup();
      renderGameTimer();

      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
      expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');
    });

    it('ゲームを開始するボタンクリック後、次のプレイヤーボタンのaria-labelが正しい（ゲーム進行中状態のUI確認）', async () => {
      const user = userEvent.setup();
      // Inject game-running state so button shows "次のプレイヤーに切り替え"
      renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });

      const nextPlayerButton = screen.getByRole('button', { name: '次のプレイヤーに切り替え' });
      expect(nextPlayerButton).toBeInTheDocument();
      expect(nextPlayerButton).toHaveTextContent('次のプレイヤーへ →');

      await user.click(nextPlayerButton);

      expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
      expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');
    });

    it('ゲーム進行中、一時停止ボタンがenabled状態で表示される', () => {
      // Inject game-running state to verify pause button is enabled
      renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });

      const pauseButton = screen.getByRole('button', { name: /停止|再開/i });
      expect(pauseButton).not.toBeDisabled();
    });
  });

  describe('Task 5.3: ボタンクリック動作（APIディスパッチ検証）', () => {
    // Reframe: Original tests asserted DOM state changes after click
    // (e.g. "ゲーム未開始" disappears, button text reverts). These are impossible
    // under the static mock. Reframed to verify correct API dispatch per operation.

    it('「ゲームを開始する」ボタンクリック後、switchTurn APIが呼び出される', async () => {
      const user = userEvent.setup();
      renderGameTimer();

      // ゲーム未開始状態を確認
      expect(screen.getByText('ゲーム未開始')).toBeInTheDocument();

      // ゲーム開始ボタンをクリック
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // switchTurn APIが呼ばれたことを確認（ゲーム開始 = turn切り替えAPI）
      expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
      expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');
    });

    it('リセットボタンクリック後、resetGame APIが正しいetagで呼び出される', async () => {
      const user = userEvent.setup();
      // Inject game-running state so reset makes sense
      renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });

      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await user.click(resetButton);

      expect(mockApi.resetGame).toHaveBeenCalledTimes(1);
      expect(mockApi.resetGame.mock.calls[0][0]).toBe('mock-etag');
    });

    it('一時停止ボタンクリック後、pauseGame APIが正しいetagで呼び出される', async () => {
      const user = userEvent.setup();
      // Inject game-running (not paused) so pause is the action
      renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: false } });

      const pauseButton = screen.getByRole('button', { name: /ゲームを一時停止/ });
      expect(pauseButton).not.toBeDisabled();

      await user.click(pauseButton);

      expect(mockApi.pauseGame).toHaveBeenCalledTimes(1);
      expect(mockApi.pauseGame.mock.calls[0][0]).toBe('mock-etag');
    });
  });
});

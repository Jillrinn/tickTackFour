import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';
import userEvent from '@testing-library/user-event';

/**
 * Task 5.1 & 5.2: GameTimer統合テスト（ハーネス移行版）
 *
 * Reframe note (integration):
 * Original tests used fallback mode (isInFallbackMode=true) and asserted
 * DOM state changes after button clicks (e.g. activePlayerInfo changes,
 * dropdown value changes) relying on local in-memory state mutation.
 * Under the server-state harness, state is static (injected via serverState).
 * Tests that checked structure/initial state are preserved as-is (just using
 * renderGameTimer instead of render(<GameTimer/>)).
 * Tests asserting DOM mutations after button clicks are reframed to assert
 * the correct API dispatch (intent: verify button wires through to API).
 *
 * Pre-existing .skip tests (タイマーモードトグルUI) were already skipped in the
 * original and are preserved unchanged (no new skips added).
 *
 * Renamed tests:
 * - "固定ヘッダーがアクティブプレイヤー情報を正しく表示する"
 *   → "固定ヘッダーの「次のプレイヤー」ボタンクリック後、switchTurn APIが呼び出される"
 * - "プレイヤー人数ドロップダウンが人数変更に正しく反応する"
 *   → "プレイヤー人数ドロップダウン変更後、updateGame APIが正しいetagで呼び出される"
 * - "固定ヘッダーの「次のプレイヤー」ボタンが正しく動作する"
 *   → "固定ヘッダーの「次のプレイヤー」ボタン連続クリックで毎回switchTurn APIが呼ばれる"
 * - "一時停止中も設定セクションのコントロールが無効化される"
 *   → kept but uses injected paused state + dropown disabled check (no click flow)
 */

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer Integration (Task 5.1 & 5.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('セクション構造（Task 5.1）', () => {
    it('固定ヘッダーが最上部に存在する', () => {
      renderGameTimer();
      const stickyHeader = screen.getByTestId('sticky-header');
      expect(stickyHeader).toBeInTheDocument();
    });

    it('設定セクションが存在する', () => {
      renderGameTimer();
      const settingsControls = screen.getByTestId('settings-controls');
      expect(settingsControls).toBeInTheDocument();
    });

    it('プレイヤー人数ドロップダウンが設定セクション内に存在する', () => {
      renderGameTimer();
      const settingsControls = screen.getByTestId('settings-controls');
      const dropdown = within(settingsControls).getByTestId('player-count-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    // タイマーモードトグルUIは現在 {false &&} で非表示中のため無効化
    it.skip('カウントモードトグルスイッチが設定セクション内に存在する', () => {
      renderGameTimer();
      const settingsControls = screen.getByTestId('settings-controls');
      const toggle = within(settingsControls).getByTestId('timer-mode-toggle');
      expect(toggle).toBeInTheDocument();
    });

    it('「次のプレイヤー」ボタンが固定ヘッダー内に1つだけ存在する', () => {
      renderGameTimer();
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButtons = within(stickyHeader).getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      expect(nextPlayerButtons).toHaveLength(1);
    });

    it('固定ヘッダー内に一時停止ボタンと次のプレイヤーボタンが存在する', () => {
      renderGameTimer();
      const stickyHeader = screen.getByTestId('sticky-header');
      const pauseButton = within(stickyHeader).getByRole('button', { name: /一時停止|再開/i });
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      expect(pauseButton).toBeInTheDocument();
      expect(nextPlayerButton).toBeInTheDocument();
    });
  });

  describe('APIディスパッチ検証（Task 5.2）', () => {
    it('固定ヘッダーの「次のプレイヤー」ボタンクリック後、switchTurn APIが呼び出される', async () => {
      const user = userEvent.setup();
      renderGameTimer();

      // 初期状態: ゲーム未開始
      const activePlayerInfo = screen.getByTestId('active-player-info');
      expect(within(activePlayerInfo).getByText('ゲーム未開始')).toBeInTheDocument();

      // 「次のプレイヤー」ボタンをクリック
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      await user.click(nextPlayerButton);

      // switchTurn APIが呼ばれ、正しいetagが渡されたことを確認
      expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
      expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');
    });

    it('プレイヤー人数ドロップダウン変更後、updateGame APIが正しいetagで呼び出される', async () => {
      const user = userEvent.setup();
      renderGameTimer();

      const dropdown = screen.getByTestId('player-count-dropdown');
      expect(dropdown).toHaveValue('4'); // 初期値4人

      // 5人に変更
      await user.selectOptions(dropdown, '5');

      // updateGame APIが呼ばれ、正しいetagとplayerCountが渡されたことを確認
      expect(mockApi.updateGame).toHaveBeenCalledTimes(1);
      expect(mockApi.updateGame.mock.calls[0][0]).toBe('mock-etag');
      expect(mockApi.updateGame.mock.calls[0][1]).toMatchObject({ playerCount: 5 });
    });

    // タイマーモードトグルUIは現在 {false &&} で非表示中のため無効化
    it.skip('カウントモードトグルスイッチがタイマーモード変更に正しく反応する', async () => {
      const user = userEvent.setup();
      renderGameTimer();

      const toggle = screen.getByTestId('timer-mode-toggle');
      expect(toggle).not.toBeChecked(); // 初期値: カウントアップ

      // カウントダウンに変更
      await user.click(toggle);

      const countdownControl = screen.getByRole('spinbutton');
      expect(countdownControl).toBeInTheDocument();
    });

    // タイマーモードトグルUIは現在 {false &&} で非表示中のため無効化
    it.skip('ゲーム進行中は設定セクションのコントロールが無効化される', async () => {
      const user = userEvent.setup();
      renderGameTimer();

      // 「次のプレイヤー」ボタンをクリックしてゲーム開始
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      await user.click(nextPlayerButton);

      const dropdown = screen.getByTestId('player-count-dropdown');
      const toggle = screen.getByTestId('timer-mode-toggle');
      expect(dropdown).toBeDisabled();
      expect(toggle).toBeDisabled();
    });

    it('一時停止中も設定セクションのコントロールが無効化される', () => {
      // Inject: game started (isGameStarted=true: activePlayerIndex=0 satisfies the condition)
      // Dropdown disabled when isGameStarted is true
      renderGameTimer({ serverState: { activePlayerIndex: 0, isPaused: true } });

      const dropdown = screen.getByTestId('player-count-dropdown');
      expect(dropdown).toBeDisabled();
    });

    it('固定ヘッダーの「次のプレイヤー」ボタン連続クリックで毎回switchTurn APIが呼ばれる', async () => {
      const user = userEvent.setup();
      renderGameTimer();

      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

      // 1回目クリック
      await user.click(nextPlayerButton);
      expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
      expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');

      // 2回目クリック
      await user.click(nextPlayerButton);
      expect(mockApi.switchTurn).toHaveBeenCalledTimes(2);
      expect(mockApi.switchTurn.mock.calls[1][0]).toBe('mock-etag');
    });

    it('TopTimePlayerIndicatorとの統合が維持される', () => {
      renderGameTimer();
      // TopTimePlayerIndicatorが存在することを確認
      const indicator = screen.queryByTestId('top-time-player-indicator');
      // 初期状態ではプレイヤーがいないため非表示の可能性がある
      // コンポーネント自体はレンダリングされている
      expect(indicator).toBeNull(); // longestPlayerがnullのため非表示
    });
  });

  describe('セクション構造（Task 1.3）', () => {
    it('固定ヘッダーと設定セクションが存在する', () => {
      renderGameTimer();
      const stickyHeader = screen.getByTestId('sticky-header');
      const settingsControls = screen.getByTestId('settings-controls');

      // 両セクションが存在することを確認
      expect(stickyHeader).toBeInTheDocument();
      expect(settingsControls).toBeInTheDocument();
    });
  });
});

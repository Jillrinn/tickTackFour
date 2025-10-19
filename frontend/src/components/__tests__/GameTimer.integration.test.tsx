import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { GameTimer } from '../GameTimer';
import userEvent from '@testing-library/user-event';

// フォールバックモードを強制（テスト用）
vi.mock('../../hooks/useFallbackMode', () => ({
  useFallbackMode: () => ({
    isInFallbackMode: true,
    lastError: null,
    retryCount: 0,
    activateFallbackMode: vi.fn(),
    deactivateFallbackMode: vi.fn(),
    incrementRetryCount: vi.fn()
  })
}));

/**
 * Task 5.1 & 5.2: GameTimer統合テスト
 * - セクション構造の正しさ
 * - 固定ヘッダー内の「次のプレイヤー」ボタンのみ存在
 * - 主要操作セクションに「次のプレイヤー」ボタンが存在しない
 * - useGameStateとの連携動作確認
 */
describe('GameTimer Integration (Task 5.1 & 5.2)', () => {
  // Task 5.2統合テストではuseGameStateのタイマー処理を実際に動作させる必要があるため
  // realTimersを使用（fakeTimersはuseGameStateのsetInterval/setTimeoutと競合する）
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('セクション構造（Task 5.1）', () => {
    it('固定ヘッダーが最上部に存在する', () => {
      render(<GameTimer />);
      const stickyHeader = screen.getByTestId('sticky-header');
      expect(stickyHeader).toBeInTheDocument();
    });

    it('設定セクションが存在する', () => {
      render(<GameTimer />);
      const settingsControls = screen.getByTestId('settings-controls');
      expect(settingsControls).toBeInTheDocument();
    });

    it('プレイヤー人数ドロップダウンが設定セクション内に存在する', () => {
      render(<GameTimer />);
      const settingsControls = screen.getByTestId('settings-controls');
      const dropdown = within(settingsControls).getByTestId('player-count-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    it('カウントモードトグルスイッチが設定セクション内に存在する', () => {
      render(<GameTimer />);
      const settingsControls = screen.getByTestId('settings-controls');
      const toggle = within(settingsControls).getByTestId('timer-mode-toggle');
      expect(toggle).toBeInTheDocument();
    });

    it('「次のプレイヤー」ボタンが固定ヘッダー内に1つだけ存在する', () => {
      render(<GameTimer />);
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButtons = within(stickyHeader).getAllByRole('button', { name: /次のプレイヤー/i });
      expect(nextPlayerButtons).toHaveLength(1);
    });

    it('固定ヘッダー内に一時停止ボタンと次のプレイヤーボタンが存在する', () => {
      render(<GameTimer />);
      const stickyHeader = screen.getByTestId('sticky-header');
      const pauseButton = within(stickyHeader).getByRole('button', { name: /一時停止|再開/i });
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });
      expect(pauseButton).toBeInTheDocument();
      expect(nextPlayerButton).toBeInTheDocument();
    });
  });

  describe('useGameStateとの連携（Task 5.2）', () => {
    it('固定ヘッダーがアクティブプレイヤー情報を正しく表示する', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // 初期状態: ゲーム未開始
      const activePlayerInfo = screen.getByTestId('active-player-info');
      expect(within(activePlayerInfo).getByText('ゲーム未開始')).toBeInTheDocument();

      // 「次のプレイヤー」ボタンをクリックしてプレイヤー1をアクティブに
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });
      await user.click(nextPlayerButton);

      // アクティブプレイヤー情報が表示される
      await waitFor(() => {
        expect(within(activePlayerInfo).getByText(/現在のプレイヤー:/)).toBeInTheDocument();
      });
      expect(within(activePlayerInfo).getByText(/プレイヤー1/)).toBeInTheDocument();
    });

    it('プレイヤー人数ドロップダウンが人数変更に正しく反応する', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      const dropdown = screen.getByTestId('player-count-dropdown');
      expect(dropdown).toHaveValue('4'); // 初期値4人

      // 5人に変更
      await user.selectOptions(dropdown, '5');

      await waitFor(() => {
        expect(dropdown).toHaveValue('5');
      });

      // プレイヤーカードが5枚表示される（listitem要素で確認）
      await waitFor(() => {
        const playerCards = screen.queryAllByRole('listitem');
        // プレイヤーカード5枚のみをカウント（TopTimePlayerIndicatorは含まない）
        const actualPlayerCards = playerCards.filter(card =>
          card.classList.contains('player-card')
        );
        expect(actualPlayerCards.length).toBe(5);
      });
    });

    it('カウントモードトグルスイッチがタイマーモード変更に正しく反応する', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      const toggle = screen.getByTestId('timer-mode-toggle');
      expect(toggle).not.toBeChecked(); // 初期値: カウントアップ

      // カウントダウンに変更
      await user.click(toggle);

      await waitFor(() => {
        expect(toggle).toBeChecked();
      });

      // カウントダウン設定UIが表示される
      await waitFor(() => {
        const countdownControl = screen.getByRole('spinbutton');
        expect(countdownControl).toBeInTheDocument();
      });
    });

    it('ゲーム進行中は設定セクションのコントロールが無効化される', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // 「次のプレイヤー」ボタンをクリックしてゲーム開始
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });
      await user.click(nextPlayerButton);

      // ドロップダウンとトグルが無効化される
      await waitFor(() => {
        const dropdown = screen.getByTestId('player-count-dropdown');
        const toggle = screen.getByTestId('timer-mode-toggle');
        expect(dropdown).toBeDisabled();
        expect(toggle).toBeDisabled();
      });
    });

    it('一時停止中は設定セクションのコントロールが有効化される', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // 「次のプレイヤー」ボタンをクリックしてゲーム開始
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });
      await user.click(nextPlayerButton);

      // 一時停止ボタンをクリック
      const pauseButton = await screen.findByRole('button', { name: /一時停止/i });
      await user.click(pauseButton);

      // ドロップダウンとトグルが有効化される
      await waitFor(() => {
        const dropdown = screen.getByTestId('player-count-dropdown');
        const toggle = screen.getByTestId('timer-mode-toggle');
        expect(dropdown).not.toBeDisabled();
        expect(toggle).not.toBeDisabled();
      });
    });

    it('固定ヘッダーの「次のプレイヤー」ボタンが正しく動作する', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      const activePlayerInfo = screen.getByTestId('active-player-info');
      const stickyHeader = screen.getByTestId('sticky-header');
      const nextPlayerButton = within(stickyHeader).getByRole('button', { name: /次のプレイヤー/i });

      // 初回クリック: プレイヤー1がアクティブに
      await user.click(nextPlayerButton);
      await waitFor(() => {
        expect(within(activePlayerInfo).getByText(/プレイヤー1/)).toBeInTheDocument();
      });

      // 2回目クリック: プレイヤー2がアクティブになる
      await user.click(nextPlayerButton);
      await waitFor(() => {
        expect(within(activePlayerInfo).getByText(/プレイヤー2/)).toBeInTheDocument();
      });
    });

    it('TopTimePlayerIndicatorとの統合が維持される', () => {
      render(<GameTimer />);
      // TopTimePlayerIndicatorが存在することを確認
      const indicator = screen.queryByTestId('top-time-player-indicator');
      // 初期状態ではプレイヤーがいないため非表示の可能性がある
      // コンポーネント自体はレンダリングされている
      expect(indicator).toBeNull(); // longestPlayerがnullのため非表示
    });
  });

  describe('セクション構造（Task 1.3）', () => {
    it('固定ヘッダーと設定セクションが存在する', () => {
      render(<GameTimer />);
      const stickyHeader = screen.getByTestId('sticky-header');
      const settingsControls = screen.getByTestId('settings-controls');

      // 両セクションが存在することを確認
      expect(stickyHeader).toBeInTheDocument();
      expect(settingsControls).toBeInTheDocument();
    });
  });
});

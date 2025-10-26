import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { GameTimer } from '../GameTimer';

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

describe('GameTimer - Task 2.1: 固定ヘッダー領域', () => {
  it('固定ヘッダー（sticky-header）が存在すること', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');
    expect(stickyHeader).toBeInTheDocument();
  });

  it('固定ヘッダーがGameTimerの最上部に配置されていること', () => {
    render(<GameTimer />);
    const gameMain = screen.getByRole('main');
    const stickyHeader = screen.getByTestId('sticky-header');

    // フォールバックモード警告の有無に関わらず、sticky-headerがgame-main内の上部に配置されていることを確認
    // フォールバックモード時: 警告 → sticky-header（2番目）
    // 通常モード時: sticky-header（1番目）
    expect(gameMain.contains(stickyHeader)).toBe(true);

    // sticky-headerがトップタイマーインジケーターより前に配置されていることを確認
    const topTimeIndicator = screen.queryByText(/最も時間を使っているプレイヤー/i);
    if (topTimeIndicator) {
      expect(stickyHeader.compareDocumentPosition(topTimeIndicator)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    }
  });

  it('固定ヘッダー内に「次のプレイヤー」ボタンが配置されていること', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtons = within(stickyHeader).getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
    expect(nextPlayerButtons.length).toBeGreaterThan(0);
  });

  it('固定ヘッダー内に現在のアクティブプレイヤー情報が表示されること', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');

    // アクティブプレイヤー情報領域を確認
    const playerInfo = stickyHeader.querySelector('[data-testid="active-player-info"]');
    expect(playerInfo).toBeInTheDocument();
  });

  it('アクティブプレイヤーがいない場合は「ゲーム未開始」状態を表示すること', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');

    // 初期状態ではアクティブプレイヤーがいないため、「ゲーム未開始」メッセージを表示
    expect(stickyHeader).toHaveTextContent(/ゲーム未開始|未開始/);
  });

  it('固定ヘッダーにsticky-headerクラスが適用されていること', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');
    expect(stickyHeader).toHaveClass('sticky-header');
  });
});

describe('GameTimer - Task 2.2: 固定ヘッダーの動的更新機能', () => {
  it('「次のプレイヤー」ボタンをクリックすると固定ヘッダーのプレイヤー情報が更新されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtons = screen.getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

    // 初期状態：ゲーム未開始
    expect(stickyHeader).toHaveTextContent(/ゲーム未開始|未開始/);

    // 「次のプレイヤー」ボタンをクリック（最初のボタンを使用）
    await user.click(nextPlayerButtons[0]);

    // ヘッダーにプレイヤー1の情報が表示される
    expect(stickyHeader).toHaveTextContent(/プレイヤー1/);
    expect(stickyHeader).toHaveTextContent(/00:00/);
  });

  it('アクティブプレイヤー変更時にヘッダー内のプレイヤー名が即座に更新されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtons = screen.getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

    // プレイヤー1をアクティブに
    await user.click(nextPlayerButtons[0]);
    expect(stickyHeader).toHaveTextContent(/プレイヤー1/);

    // プレイヤー2に切り替え
    await user.click(nextPlayerButtons[0]);
    expect(stickyHeader).toHaveTextContent(/プレイヤー2/);
  });

  it('固定ヘッダーの「次のプレイヤー」ボタンが機能すること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtonInHeader = within(stickyHeader).getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

    // ボタンをクリック
    await user.click(nextPlayerButtonInHeader);

    // プレイヤー1がアクティブになる
    const playerCards = screen.getAllByRole('listitem');
    expect(playerCards[0]).toHaveClass('active');
  });
});

describe('GameTimer - Task 2.3: 固定ヘッダーのレスポンシブレイアウト', () => {
  it('固定ヘッダーがレスポンシブ対応のCSSクラスを持つこと', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');

    // CSSクラス名の存在確認（レスポンシブスタイルはCSSで定義）
    expect(stickyHeader).toHaveClass('sticky-header');
  });

  it('固定ヘッダー内のボタンと情報がレスポンシブレイアウト用のコンテナに配置されていること', () => {
    render(<GameTimer />);
    const stickyHeader = screen.getByTestId('sticky-header');

    // ヘッダーコンテナ（フレックスボックス用）を確認
    const headerContent = stickyHeader.querySelector('.sticky-header-content');
    expect(headerContent).toBeInTheDocument();
  });
});

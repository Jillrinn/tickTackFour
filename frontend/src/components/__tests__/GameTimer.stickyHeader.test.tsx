import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - Task 2.1: 固定ヘッダー領域', () => {
  it('固定ヘッダー（sticky-header）が存在すること', () => {
    renderGameTimer();
    const stickyHeader = screen.getByTestId('sticky-header');
    expect(stickyHeader).toBeInTheDocument();
  });

  it('固定ヘッダーがGameTimerの最上部に配置されていること', () => {
    renderGameTimer();
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
    renderGameTimer();
    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtons = within(stickyHeader).getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
    expect(nextPlayerButtons.length).toBeGreaterThan(0);
  });

  it('固定ヘッダー内に現在のアクティブプレイヤー情報が表示されること', () => {
    renderGameTimer();
    const stickyHeader = screen.getByTestId('sticky-header');

    // アクティブプレイヤー情報領域を確認
    const playerInfo = stickyHeader.querySelector('[data-testid="active-player-info"]');
    expect(playerInfo).toBeInTheDocument();
  });

  it('アクティブプレイヤーがいない場合は「ゲーム未開始」状態を表示すること', () => {
    renderGameTimer();
    const stickyHeader = screen.getByTestId('sticky-header');

    // 初期状態ではアクティブプレイヤーがいないため、「ゲーム未開始」メッセージを表示
    expect(stickyHeader).toHaveTextContent(/ゲーム未開始|未開始/);
  });

  it('固定ヘッダーにsticky-headerクラスが適用されていること', () => {
    renderGameTimer();
    const stickyHeader = screen.getByTestId('sticky-header');
    expect(stickyHeader).toHaveClass('sticky-header');
  });
});

describe('GameTimer - Task 2.2: 固定ヘッダーの動的更新機能', () => {
  it('「次のプレイヤー」ボタンをクリックするとswitchTurn APIが呼ばれること', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtons = screen.getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

    // 初期状態：ゲーム未開始
    expect(stickyHeader).toHaveTextContent(/ゲーム未開始|未開始/);

    // 「次のプレイヤー」ボタンをクリック（最初のボタンを使用）
    await user.click(nextPlayerButtons[0]);

    // ターン切り替えAPIが呼ばれ、etagが正しく渡されたことを確認
    expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
    expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');
  });

  it('「次のプレイヤー」ボタンを連続クリックするとswitchTurnが都度呼ばれること', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const nextPlayerButtons = screen.getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

    // 1回目クリック
    await user.click(nextPlayerButtons[0]);
    expect(mockApi.switchTurn).toHaveBeenCalledTimes(1);
    expect(mockApi.switchTurn.mock.calls[0][0]).toBe('mock-etag');

    // 2回目クリック
    await user.click(nextPlayerButtons[0]);
    expect(mockApi.switchTurn).toHaveBeenCalledTimes(2);
    expect(mockApi.switchTurn.mock.calls[1][0]).toBe('mock-etag');
  });

  it('固定ヘッダーの「次のプレイヤー」ボタンが機能すること', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const stickyHeader = screen.getByTestId('sticky-header');
    const nextPlayerButtonInHeader = within(stickyHeader).getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

    // ボタンをクリック
    await user.click(nextPlayerButtonInHeader);

    // ターン切り替えAPIが呼ばれたことを確認（サーバー経由でプレイヤー1がアクティブになる）
    expect(mockApi.switchTurn).toHaveBeenCalled();
  });
});

describe('GameTimer - Task 2.3: 固定ヘッダーのレスポンシブレイアウト', () => {
  it('固定ヘッダーがレスポンシブ対応のCSSクラスを持つこと', () => {
    renderGameTimer();
    const stickyHeader = screen.getByTestId('sticky-header');

    // CSSクラス名の存在確認（レスポンシブスタイルはCSSで定義）
    expect(stickyHeader).toHaveClass('sticky-header');
  });

  it('固定ヘッダー内のボタンと情報がレスポンシブレイアウト用のコンテナに配置されていること', () => {
    renderGameTimer();
    const stickyHeader = screen.getByTestId('sticky-header');

    // ヘッダーコンテナ（フレックスボックス用）を確認
    const headerContent = stickyHeader.querySelector('.sticky-header-content');
    expect(headerContent).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { GameTimer } from '../GameTimer';

describe('GameTimer - Task 4.1: カウントモードトグルスイッチUI', () => {
  it('カウントモードトグルスイッチが存在すること', () => {
    render(<GameTimer />);
    const toggle = screen.getByTestId('timer-mode-toggle');
    expect(toggle).toBeInTheDocument();
  });

  it('トグルスイッチがcheckboxタイプのinput要素であること', () => {
    render(<GameTimer />);
    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    expect(toggle.type).toBe('checkbox');
  });

  it('トグルスイッチに適切なaria-labelが設定されていること', () => {
    render(<GameTimer />);
    const toggle = screen.getByTestId('timer-mode-toggle');
    expect(toggle).toHaveAttribute('aria-label');
  });

  it('トグルスイッチがキーボード操作に対応していること', () => {
    render(<GameTimer />);
    const toggle = screen.getByTestId('timer-mode-toggle');
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
  });

  it('トグルスイッチが設定・その他セクション内に配置されていること', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    const toggle = screen.getByTestId('timer-mode-toggle');
    expect(settingsSection).toContainElement(toggle);
  });

  it('カウントアップモード時、トグルスイッチがunchecked状態であること', () => {
    render(<GameTimer />);
    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    // デフォルトはカウントアップモード
    expect(toggle.checked).toBe(false);
  });

  it('トグルスイッチにホバー時の視覚的フィードバック用のクラスが設定されていること', () => {
    render(<GameTimer />);
    const toggle = screen.getByTestId('timer-mode-toggle');
    const label = toggle.closest('label');
    expect(label).toHaveClass('toggle-switch-enhanced');
  });
});

describe('GameTimer - Task 4.2: カウントモード切替機能', () => {
  it('トグルスイッチをクリックするとカウントアップからカウントダウンに切り替わること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(false); // 初期状態: カウントアップ

    await user.click(toggle);

    expect(toggle.checked).toBe(true); // カウントダウンモードに変更
  });

  it('トグルスイッチをクリックするとカウントダウンからカウントアップに切り替わること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;

    // カウントダウンモードに変更
    await user.click(toggle);
    expect(toggle.checked).toBe(true);

    // カウントアップモードに戻す
    await user.click(toggle);
    expect(toggle.checked).toBe(false);
  });

  it('カウントダウンモード時、カウントダウン設定UIが表示されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const toggle = screen.getByTestId('timer-mode-toggle');

    // カウントアップモード時は設定UI非表示
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

    // カウントダウンモードに変更
    await user.click(toggle);

    // カウントダウン設定UIが表示される
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('カウントアップモード時、カウントダウン設定UIが非表示になること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const toggle = screen.getByTestId('timer-mode-toggle');

    // カウントダウンモードに変更
    await user.click(toggle);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();

    // カウントアップモードに戻す
    await user.click(toggle);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('ゲーム進行中（タイマー動作中）はトグルスイッチが無効化されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;

    // 初期状態は有効
    expect(toggle.disabled).toBe(false);

    // ゲームを開始（次のプレイヤーボタンをクリック）
    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤー/ });
    await user.click(nextPlayerButtons[0]);

    // ゲーム進行中はトグルスイッチが無効化される
    expect(toggle.disabled).toBe(true);
  });

  it('一時停止中はトグルスイッチが有効化されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // ゲームを開始
    const nextPlayerButtons = screen.getAllByRole('button', { name: /次のプレイヤー/ });
    await user.click(nextPlayerButtons[0]);

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    expect(toggle.disabled).toBe(true);

    // 一時停止ボタンをクリック
    const pauseButton = screen.getByRole('button', { name: /一時停止/ });
    await user.click(pauseButton);

    // 一時停止中はトグルスイッチが有効化される
    expect(toggle.disabled).toBe(false);
  });

  it('キーボード操作でトグルスイッチを切り替えられること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    toggle.focus();

    expect(toggle.checked).toBe(false);

    // Spaceキーで切り替え
    await user.keyboard(' ');
    expect(toggle.checked).toBe(true);

    // もう一度Spaceキーで切り替え
    await user.keyboard(' ');
    expect(toggle.checked).toBe(false);
  });
});

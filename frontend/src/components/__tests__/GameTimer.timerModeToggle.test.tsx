import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

// 要件1（タイマーモードトグル）は現在スキップ対象のため、このテストファイルを無効化
// タイマーモードトグルUIは {false &&} で非表示中
// 関連仕様: countdown-mode-fix Phase 0.5で再有効化予定
describe.skip('GameTimer - Task 4.1: カウントモードトグルスイッチUI', () => {
  it('カウントモードトグルスイッチが存在すること', () => {
    renderGameTimer();
    const toggle = screen.getByTestId('timer-mode-toggle');
    expect(toggle).toBeInTheDocument();
  });

  it('トグルスイッチがcheckboxタイプのinput要素であること', () => {
    renderGameTimer();
    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    expect(toggle.type).toBe('checkbox');
  });

  it('トグルスイッチに適切なaria-labelが設定されていること', () => {
    renderGameTimer();
    const toggle = screen.getByTestId('timer-mode-toggle');
    expect(toggle).toHaveAttribute('aria-label');
  });

  it('トグルスイッチがキーボード操作に対応していること', () => {
    renderGameTimer();
    const toggle = screen.getByTestId('timer-mode-toggle');
    toggle.focus();
    expect(document.activeElement).toBe(toggle);
  });

  it('トグルスイッチが設定・その他セクション内に配置されていること', () => {
    renderGameTimer();
    const settingsSection = screen.getByTestId('settings-controls');
    const toggle = screen.getByTestId('timer-mode-toggle');
    expect(settingsSection).toContainElement(toggle);
  });

  it('カウントアップモード時、トグルスイッチがunchecked状態であること', () => {
    renderGameTimer();
    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    // デフォルトはカウントアップモード
    expect(toggle.checked).toBe(false);
  });

  it('トグルスイッチにホバー時の視覚的フィードバック用のクラスが設定されていること', () => {
    renderGameTimer();
    const toggle = screen.getByTestId('timer-mode-toggle');
    const label = toggle.closest('label');
    expect(label).toHaveClass('toggle-switch-enhanced');
  });
});

// 要件1（タイマーモードトグル）は現在スキップ対象のため、このテストファイルを無効化
describe.skip('GameTimer - Task 4.2: カウントモード切替機能', () => {
  it('トグルスイッチをクリックするとupdateGame APIがcountdownモードで呼ばれること', async () => {
    const user = userEvent.setup();
    renderGameTimer({ serverState: { timerMode: 'countup' } });

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    await user.click(toggle);

    expect(mockApi.updateGame).toHaveBeenCalledTimes(1);
    expect(mockApi.updateGame.mock.calls[0][1]).toMatchObject({ timerMode: 'countdown' });
  });

  it('トグルスイッチをクリックするとupdateGame APIがcountupモードで呼ばれること', async () => {
    const user = userEvent.setup();
    renderGameTimer({ serverState: { timerMode: 'countdown' } });

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    await user.click(toggle);

    expect(mockApi.updateGame).toHaveBeenCalledTimes(1);
    expect(mockApi.updateGame.mock.calls[0][1]).toMatchObject({ timerMode: 'countup' });
  });

  it('カウントダウンモード時、カウントダウン設定UIが表示されること', async () => {
    const user = userEvent.setup();
    renderGameTimer({ serverState: { timerMode: 'countup' } });

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
    renderGameTimer({ serverState: { timerMode: 'countdown' } });

    const toggle = screen.getByTestId('timer-mode-toggle');

    // カウントダウンモードに変更
    await user.click(toggle);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();

    // カウントアップモードに戻す
    await user.click(toggle);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('ゲーム進行中（activePlayerIndex>=0, isPaused=false）はトグルスイッチが無効化されること', async () => {
    renderGameTimer({
      serverState: { activePlayerIndex: 0, isPaused: false },
    });

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
  });

  it('未開始状態（activePlayerIndex=-1）はトグルスイッチが有効化されること', () => {
    renderGameTimer({
      serverState: { activePlayerIndex: -1, isPaused: true },
    });

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    expect(toggle.disabled).toBe(false);
  });

  it('キーボード操作でupdateGame APIが呼ばれること', async () => {
    const user = userEvent.setup();
    renderGameTimer({ serverState: { timerMode: 'countup' } });

    const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
    toggle.focus();

    // Spaceキーで切り替え
    await user.keyboard(' ');
    expect(mockApi.updateGame).toHaveBeenCalledTimes(1);
  });
});

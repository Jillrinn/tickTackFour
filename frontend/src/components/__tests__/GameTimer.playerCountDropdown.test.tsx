import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderGameTimer, mockApi } from '../../test/renderGameTimer';

vi.mock('../../hooks/useServerGameState');
vi.mock('../../hooks/useGameApi');
vi.mock('../../hooks/usePollingSync');
vi.mock('../../hooks/useETagManager');
vi.mock('../../hooks/usePlayerNameHistory');

describe('GameTimer - Task 3.1: プレイヤー人数ドロップダウンUI', () => {
  it('プレイヤー人数ドロップダウンが存在すること', () => {
    renderGameTimer();
    const dropdown = screen.getByTestId('player-count-dropdown');
    expect(dropdown).toBeInTheDocument();
  });

  // Task 2.1: 2人と3人の選択肢を追加
  it('ドロップダウンが2人、3人、4人、5人、6人の選択肢を表示すること', () => {
    renderGameTimer();
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    const options = Array.from(dropdown.options).map(option => option.value);
    expect(options).toEqual(['2', '3', '4', '5', '6']);
  });

  it('ドロップダウンに2人の選択肢が存在すること', () => {
    renderGameTimer();
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    const option2 = Array.from(dropdown.options).find(opt => opt.value === '2');
    expect(option2).toBeDefined();
    expect(option2?.textContent).toBe('2人');
  });

  it('ドロップダウンに3人の選択肢が存在すること', () => {
    renderGameTimer();
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    const option3 = Array.from(dropdown.options).find(opt => opt.value === '3');
    expect(option3).toBeDefined();
    expect(option3?.textContent).toBe('3人');
  });

  it('ドロップダウンのデフォルト値が4人であること', () => {
    renderGameTimer();
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    expect(dropdown.value).toBe('4');
  });

  it('ドロップダウンに適切なaria-labelが設定されていること', () => {
    renderGameTimer();
    const dropdown = screen.getByTestId('player-count-dropdown');

    expect(dropdown).toHaveAttribute('aria-label');
  });

  it('ドロップダウンがキーボード操作に対応していること', () => {
    renderGameTimer();
    const dropdown = screen.getByTestId('player-count-dropdown');

    // フォーカス可能であることを確認
    dropdown.focus();
    expect(document.activeElement).toBe(dropdown);
  });

  it('ドロップダウンが設定・その他セクション内に配置されていること', () => {
    renderGameTimer();
    const settingsSection = screen.getByTestId('settings-controls');
    const dropdown = screen.getByTestId('player-count-dropdown');

    expect(settingsSection).toContainElement(dropdown);
  });
});

describe('GameTimer - Task 3.2: プレイヤー人数変更機能', () => {
  it('ドロップダウンから5人を選択するとupdateGame APIが5人のplayerCountで呼ばれること', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    // 5人を選択
    await user.selectOptions(dropdown, '5');

    // updateGame APIがplayerCount: 5で呼ばれることを確認
    expect(mockApi.updateGame).toHaveBeenCalledTimes(1);
    expect(mockApi.updateGame).toHaveBeenCalledWith('mock-etag', { playerCount: 5 });
  });

  it('ドロップダウンから6人を選択するとupdateGame APIが6人のplayerCountで呼ばれること', async () => {
    const user = userEvent.setup();
    renderGameTimer();

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    // 6人を選択
    await user.selectOptions(dropdown, '6');

    // updateGame APIがplayerCount: 6で呼ばれることを確認
    expect(mockApi.updateGame).toHaveBeenCalledTimes(1);
    expect(mockApi.updateGame).toHaveBeenCalledWith('mock-etag', { playerCount: 6 });
  });

  it('ゲーム進行中（アクティブプレイヤーあり）はプレイヤー人数変更が無効化されること', () => {
    // アクティブプレイヤーあり（isGameStarted = true）の状態でレンダリング
    renderGameTimer({
      serverState: { activePlayerIndex: 0, isPaused: false },
    });

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    // タイマー動作中はドロップダウンが無効化される
    expect(dropdown).toBeDisabled();
  });

  // 要件変更: 一時停止中も設定変更不可
  it('ゲームを一時停止してもプレイヤー人数変更は無効化されたままであること', () => {
    // アクティブプレイヤーあり・一時停止中の状態でレンダリング
    renderGameTimer({
      serverState: { activePlayerIndex: 0, isPaused: true },
    });

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    // 一時停止中もドロップダウンは無効化されたまま（要件変更）
    expect(dropdown).toBeDisabled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('GameTimer - Task 3.1: プレイヤー人数ドロップダウンUI', () => {
  it('プレイヤー人数ドロップダウンが存在すること', () => {
    render(<GameTimer />);
    const dropdown = screen.getByTestId('player-count-dropdown');
    expect(dropdown).toBeInTheDocument();
  });

  // Task 2.1: 2人と3人の選択肢を追加
  it('ドロップダウンが2人、3人、4人、5人、6人の選択肢を表示すること', () => {
    render(<GameTimer />);
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    const options = Array.from(dropdown.options).map(option => option.value);
    expect(options).toEqual(['2', '3', '4', '5', '6']);
  });

  it('ドロップダウンに2人の選択肢が存在すること', () => {
    render(<GameTimer />);
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    const option2 = Array.from(dropdown.options).find(opt => opt.value === '2');
    expect(option2).toBeDefined();
    expect(option2?.textContent).toBe('2人');
  });

  it('ドロップダウンに3人の選択肢が存在すること', () => {
    render(<GameTimer />);
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    const option3 = Array.from(dropdown.options).find(opt => opt.value === '3');
    expect(option3).toBeDefined();
    expect(option3?.textContent).toBe('3人');
  });

  it('ドロップダウンのデフォルト値が4人であること', () => {
    render(<GameTimer />);
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    expect(dropdown.value).toBe('4');
  });

  it('ドロップダウンに適切なaria-labelが設定されていること', () => {
    render(<GameTimer />);
    const dropdown = screen.getByTestId('player-count-dropdown');

    expect(dropdown).toHaveAttribute('aria-label');
  });

  it('ドロップダウンがキーボード操作に対応していること', () => {
    render(<GameTimer />);
    const dropdown = screen.getByTestId('player-count-dropdown');

    // フォーカス可能であることを確認
    dropdown.focus();
    expect(document.activeElement).toBe(dropdown);
  });

  it('ドロップダウンが設定・その他セクション内に配置されていること', () => {
    render(<GameTimer />);
    const settingsSection = screen.getByTestId('settings-controls');
    const dropdown = screen.getByTestId('player-count-dropdown');

    expect(settingsSection).toContainElement(dropdown);
  });
});

describe('GameTimer - Task 3.2: プレイヤー人数変更機能', () => {
  it('ドロップダウンから5人を選択するとプレイヤー数が5人に変更されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    // 初期状態: 4人
    const initialPlayerCards = screen.getAllByRole('combobox', { name: /プレイヤー名/ });
    expect(initialPlayerCards).toHaveLength(4);

    // 5人を選択
    await user.selectOptions(dropdown, '5');

    // プレイヤー数が5人に変更される
    const updatedPlayerCards = screen.getAllByRole('combobox', { name: /プレイヤー名/ });
    expect(updatedPlayerCards).toHaveLength(5);
    expect(dropdown.value).toBe('5');
  });

  it('ドロップダウンから6人を選択するとプレイヤー数が6人に変更されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    // 初期状態: 4人
    const initialPlayerCards = screen.getAllByRole('combobox', { name: /プレイヤー名/ });
    expect(initialPlayerCards).toHaveLength(4);

    // 6人を選択
    await user.selectOptions(dropdown, '6');

    // プレイヤー数が6人に変更される
    const updatedPlayerCards = screen.getAllByRole('combobox', { name: /プレイヤー名/ });
    expect(updatedPlayerCards).toHaveLength(6);
    expect(dropdown.value).toBe('6');
  });

  it('プレイヤー数を変更すると全プレイヤーの時間が0にリセットされること（要件3.5）', async () => {
    const user = userEvent.setup();
    const { container } = render(<GameTimer />);

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;

    // 4人から5人に増やす
    await user.selectOptions(dropdown, '5');
    const playerCardsAfterIncrease = screen.getAllByRole('combobox', { name: /プレイヤー名/ });
    expect(playerCardsAfterIncrease).toHaveLength(5);

    // プレイヤー1に10秒追加
    const playersGrid = container.querySelector('.players-grid') as HTMLElement;
    const playerCards = playersGrid.querySelectorAll('.player-card');
    const addTimeButton = playerCards[0].querySelector('button:first-child') as HTMLButtonElement;
    await user.click(addTimeButton);

    // プレイヤー1の時間が10秒になることを確認
    expect(playerCards[0]).toHaveTextContent('00:10');

    // 5人から4人に減らす
    await user.selectOptions(dropdown, '4');

    // 要件3.5: プレイヤー人数変更時に全プレイヤーの時間が0にリセットされる
    // 人数変更後の状態を取得（waitForで状態更新を待つ）
    await waitFor(() => {
      const playerCardsAfterDecrease = screen.getAllByRole('combobox', { name: /プレイヤー名/ });
      expect(playerCardsAfterDecrease).toHaveLength(4);
    });

    // 要件3.5: プレイヤー人数変更時に全プレイヤーの時間が0にリセットされる
    const updatedPlayersGrid = container.querySelector('.players-grid') as HTMLElement;
    const updatedPlayerCards = updatedPlayersGrid.querySelectorAll('.player-card');
    expect(updatedPlayerCards[0]).toHaveTextContent('00:00');
  });

  it('ゲーム進行中（タイマー動作中）はプレイヤー人数変更が無効化されること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;
    const nextPlayerButtons = screen.getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });

    // ゲームを開始（プレイヤー1をアクティブに）
    await user.click(nextPlayerButtons[0]);

    // タイマー動作中はドロップダウンが無効化される
    expect(dropdown).toBeDisabled();
  });

  // 要件変更: 一時停止中も設定変更不可
  it('ゲームを一時停止してもプレイヤー人数変更は無効化されたままであること', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;
    const nextPlayerButtons = screen.getAllByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
    const pauseButton = screen.getByRole('button', { name: /停止|再開/i });

    // ゲームを開始
    await user.click(nextPlayerButtons[0]);
    expect(dropdown).toBeDisabled();

    // 一時停止
    await user.click(pauseButton);

    // 一時停止中もドロップダウンは無効化されたまま（要件変更）
    expect(dropdown).toBeDisabled();
  });
});

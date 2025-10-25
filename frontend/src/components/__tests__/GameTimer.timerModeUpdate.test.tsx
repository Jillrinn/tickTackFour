import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameTimer from '../GameTimer';

// フォールバックモードを強制するモック
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

describe('GameTimer - Timer Mode Update Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ゲーム開始状態の判定', () => {
    it('未開始状態: activePlayerIndex = -1 かつ全プレイヤー時間 = 0 の場合、タイマーモード変更が可能であること', () => {
      render(<GameTimer />);

      // タイマーモードトグルスイッチを取得
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;

      // 未開始状態ではタイマーモードトグルが有効化されていること
      expect(toggle.disabled).toBe(false);
    });

    it('開始済み状態: activePlayerIndex が 0 以上の場合、タイマーモード変更が無効化されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲームを開始（最初のプレイヤーをアクティブにする）
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // タイマーモードトグルスイッチを取得
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;

      // ゲーム開始後はタイマーモードトグルが無効化されていること
      expect(toggle.disabled).toBe(true);
    });

    it('開始済み状態: いずれかのプレイヤーの経過時間 > 0 の場合、タイマーモード変更が無効化されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // 少し時間を進める（タイマーが動作してelapsedTimeSecondsが増加）
      await new Promise(resolve => setTimeout(resolve, 1100));

      // タイマーモードトグルスイッチを取得
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;

      // プレイヤーの経過時間が増加した後はタイマーモードトグルが無効化されていること
      expect(toggle.disabled).toBe(true);
    });

    it('一時停止中でもゲーム開始後はタイマーモード変更が無効化されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // タイマーモードトグルスイッチを取得
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(true);

      // 一時停止ボタンをクリック
      const pauseButton = screen.getByRole('button', { name: /ゲームを一時停止/ });
      await user.click(pauseButton);

      // 一時停止中でもタイマーモードトグルは無効化されたままであること（新しい要件）
      expect(toggle.disabled).toBe(true);
    });

    it('リセット後はタイマーモード変更が再度有効化されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // タイマーモードトグルスイッチを取得
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      expect(toggle.disabled).toBe(true);

      // リセットボタンをクリック
      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await user.click(resetButton);

      // リセット後はタイマーモードトグルが有効化されること
      expect(toggle.disabled).toBe(false);
    });
  });

  describe('カウントダウン秒数入力のdisable制御', () => {
    it('未開始状態ではカウントダウン秒数入力が有効化されていること', async () => {
      const user = userEvent.setup();
      const { container } = render(<GameTimer />);

      // 念のためリセットを実行してゲーム状態をクリア
      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await user.click(resetButton);

      // タイマーモードをカウントダウンに切り替え
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      await user.click(toggle);

      // カウントダウン秒数入力を取得
      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;

      // 未開始状態（カウントダウンモードに切り替えただけで、ゲームを開始していない）では、
      // カウントダウン秒数入力が有効化されていること
      expect(countdownInput.disabled).toBe(false);
    });

    it('ゲーム開始後はカウントダウン秒数入力が無効化されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // タイマーモードをカウントダウンに切り替え
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      await user.click(toggle);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // カウントダウン秒数入力を取得
      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;

      // ゲーム開始後は入力が無効化されていること
      expect(countdownInput.disabled).toBe(true);
    });

    it('一時停止中でもカウントダウン秒数入力が無効化されていること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // タイマーモードをカウントダウンに切り替え
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      await user.click(toggle);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // 一時停止ボタンをクリック
      const pauseButton = screen.getByRole('button', { name: /ゲームを一時停止/ });
      await user.click(pauseButton);

      // カウントダウン秒数入力を取得
      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;

      // 一時停止中でも入力が無効化されていること
      expect(countdownInput.disabled).toBe(true);
    });

    it('リセット後はカウントダウン秒数入力が再度有効化されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // タイマーモードをカウントダウンに切り替え
      let toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      await user.click(toggle);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // カウントダウン秒数入力を取得（ゲーム開始後）
      let countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;
      expect(countdownInput.disabled).toBe(true);

      // リセットボタンをクリック
      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await user.click(resetButton);

      // リセット後、タイマーモードトグルを再取得（DOMが更新されている可能性があるため）
      // リセット後もタイマーモードは保持される（カウントダウンモードのまま）
      await waitFor(() => {
        toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
        // リセット後もカウントダウンモードが保持されているはず（checked === true）
        expect(toggle.checked).toBe(true);
      });

      // カウントダウン秒数入力が表示されているはず
      countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;

      // リセット後は入力が有効化されること
      expect(countdownInput.disabled).toBe(false);
    });
  });

  describe('ツールチップ表示', () => {
    it('未開始状態ではツールチップが表示されないこと', () => {
      render(<GameTimer />);

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;

      // 未開始状態ではtitle属性が設定されていないこと
      expect(toggle.title).toBe('');
    });

    it('ゲーム開始後はタイマーモードトグルにツールチップが表示されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;

      // ゲーム開始後はtitle属性が設定されていること
      expect(toggle.title).toBe('ゲーム開始後はタイマーモードを変更できません');
    });

    it('ゲーム開始後はカウントダウン秒数入力にツールチップが表示されること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // タイマーモードをカウントダウンに切り替え
      const toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      await user.click(toggle);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      const countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;

      // ゲーム開始後はtitle属性が設定されていること
      expect(countdownInput.title).toBe('ゲーム開始後はカウントダウン秒数を変更できません');
    });

    it('リセット後はツールチップが非表示になること', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // タイマーモードをカウントダウンに切り替え
      let toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
      await user.click(toggle);

      // ゲームを開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // ゲーム開始後、title属性が設定されていることを確認
      expect(toggle.title).toBe('ゲーム開始後はタイマーモードを変更できません');
      let countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;
      expect(countdownInput.title).toBe('ゲーム開始後はカウントダウン秒数を変更できません');

      // リセットボタンをクリック
      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await user.click(resetButton);

      // リセット後、タイマーモードトグルを再取得（DOMが更新されている可能性があるため）
      // リセット後もタイマーモードは保持される（カウントダウンモードのまま）
      await waitFor(() => {
        toggle = screen.getByTestId('timer-mode-toggle') as HTMLInputElement;
        // リセット後、タイマーモードトグルのtitle属性が空になっていること
        expect(toggle.title).toBe('');
        // リセット後もカウントダウンモードが保持されているはず（checked === true）
        expect(toggle.checked).toBe(true);
      });

      // カウントダウン秒数入力が表示されているはず
      countdownInput = screen.getByTestId('countdown-seconds-input') as HTMLInputElement;

      // カウントダウン秒数入力のtitle属性が空であることを確認
      expect(countdownInput.title).toBe('');
    });
  });
});

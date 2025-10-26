import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest';
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

/**
 * Task 5.1: GameTimer.tsxに`totalGameTime` state追加（フォールバックモード）
 *
 * このテストファイルは、ゲーム全体時間の同期問題を修正するために作成されました。
 *
 * 問題:
 * - `getTotalGameTime()`がタイマー更新に反応しない
 * - `useCallback`の依存配列が配列参照のみを監視しており、個々のプレイヤー時間の変更を検知できない
 *
 * 修正方針:
 * - `getTotalGameTime()`結果をstateで管理し、タイマーtickで明示的に更新する
 */

describe('GameTimer - ゲーム全体時間の同期', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Task 5.1: totalGameTime stateの基本動作', () => {
    test('ゲーム開始時、ゲーム全体時間が00:00と表示される', () => {
      render(<GameTimer />);

      // ゲーム全体時間の要素を取得
      const totalGameTimeElement = screen.getByTestId('total-game-time');

      // 初期値が00:00であることを確認
      expect(totalGameTimeElement).toHaveTextContent('00:00');
    });

    test('1秒経過後、ゲーム全体時間が00:01に更新される（カウントアップモード）', () => {
      render(<GameTimer />);

      // ゲーム開始ボタンをクリック
      const startButton = screen.getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      act(() => {
        startButton.click();
      });

      // 初期値確認
      const totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:00');

      // 1秒経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 00:01に更新されることを確認
      expect(totalGameTimeElement).toHaveTextContent('00:01');
    });

    test('5秒経過後、ゲーム全体時間が00:05に更新される', () => {
      render(<GameTimer />);

      // ゲーム開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      act(() => {
        startButton.click();
      });

      // 5秒経過
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 00:05に更新されることを確認
      const totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:05');
    });

    test('プレイヤー切り替え後も、ゲーム全体時間が継続して増加する（2プレイヤー）', () => {
      render(<GameTimer />);

      // 2プレイヤーに設定
      const playerCountDropdown = screen.getByTestId('player-count-dropdown');
      act(() => {
        playerCountDropdown.dispatchEvent(new Event('change', { bubbles: true }));
        (playerCountDropdown as HTMLSelectElement).value = '2';
      });

      // ゲーム開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      act(() => {
        startButton.click();
      });

      // Player 1が3秒プレイ
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      let totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:03');

      // Player 2に切り替え
      const switchTurnButton = screen.getByRole('button', { name: /次のプレイヤー/i });
      act(() => {
        switchTurnButton.click();
      });

      // Player 2が2秒プレイ
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // ゲーム全体時間が00:05（3秒+2秒）になることを確認
      totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:05');
    });
  });

  describe('Task 5.2: 一時停止/再開/リセット動作', () => {
    test('一時停止時、ゲーム全体時間が更新されない', () => {
      render(<GameTimer />);

      // ゲーム開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      act(() => {
        startButton.click();
      });

      // 3秒経過
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      let totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:03');

      // 一時停止
      const pauseButton = screen.getByRole('button', { name: /停止/i });
      act(() => {
        pauseButton.click();
      });

      // さらに2秒経過（一時停止中）
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // ゲーム全体時間が00:03のまま（更新されない）
      totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:03');
    });

    test('再開時、ゲーム全体時間が更新再開される', () => {
      render(<GameTimer />);

      // ゲーム開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      act(() => {
        startButton.click();
      });

      // 3秒経過
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // 一時停止
      const pauseButton = screen.getByRole('button', { name: /停止/i });
      act(() => {
        pauseButton.click();
      });

      // 一時停止中2秒経過（カウントされない）
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // 再開
      act(() => {
        pauseButton.click(); // トグルボタン
      });

      // 再開後2秒経過
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // ゲーム全体時間が00:05（3秒+2秒）になることを確認
      const totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:05');
    });

    test('リセット時、ゲーム全体時間が00:00にリセットされる', () => {
      render(<GameTimer />);

      // ゲーム開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始|次のプレイヤー/i });
      act(() => {
        startButton.click();
      });

      // 5秒経過
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      let totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:05');

      // リセット
      const resetButton = screen.getByRole('button', { name: /リセット/i });
      act(() => {
        resetButton.click();
      });

      // ゲーム全体時間が00:00にリセットされることを確認
      totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:00');
    });
  });

  // タイマーモードトグルUIは現在 {false &&} で非表示中のため無効化
  describe.skip('Task 5.3: カウントダウンモード', () => {
    test('カウントダウンモードでゲーム全体時間が減少する', () => {
      render(<GameTimer />);

      // カウントダウンモードに切り替え
      const timerModeToggle = screen.getByTestId('timer-mode-toggle');
      act(() => {
        timerModeToggle.click();
      });

      // カウントダウン秒数を30秒に設定
      const countdownSecondsInput = screen.getByTestId('countdown-seconds-input');
      act(() => {
        countdownSecondsInput.dispatchEvent(new Event('change', { bubbles: true }));
        (countdownSecondsInput as HTMLInputElement).value = '30';
      });

      // ゲーム開始
      const startButton = screen.getByTestId('start-game-button');
      act(() => {
        startButton.click();
      });

      // 初期値が00:30であることを確認
      let totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:30');

      // 5秒経過
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 00:25に減少することを確認
      totalGameTimeElement = screen.getByTestId('total-game-time');
      expect(totalGameTimeElement).toHaveTextContent('00:25');
    });
  });
});
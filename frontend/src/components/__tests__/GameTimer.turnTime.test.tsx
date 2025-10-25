import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

describe('GameTimer - ターン時間表示（Task 4.3）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('フォールバックモード: ターン時間表示', () => {
    it('アクティブプレイヤーのカードに「現在のターン」が表示される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定するボタンをクリック
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // アクティブプレイヤーのカードに「現在のターン」が表示される
      const turnTimeElements = container.querySelectorAll('[data-testid="turn-time"]');
      expect(turnTimeElements.length).toBe(1);

      // 「現在のターン: 00:00」が表示されることを確認
      const turnTimeText = turnTimeElements[0].textContent;
      expect(turnTimeText).toContain('現在のターン');
      expect(turnTimeText).toContain('00:00');
    });

    it('非アクティブプレイヤーのカードには「現在のターン」が表示されない', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 「現在のターン」が表示されるのは1つだけ（アクティブプレイヤーのみ）
      const turnTimeElements = container.querySelectorAll('[data-testid="turn-time"]');
      expect(turnTimeElements.length).toBe(1);

      // 非アクティブプレイヤー（プレイヤー2, 3, 4）には「現在のターン」が表示されない
      const playerCards = container.querySelectorAll('.player-card');
      expect(playerCards.length).toBeGreaterThanOrEqual(4);

      // プレイヤー2, 3, 4のカードに「現在のターン」がないことを確認
      const player2Card = playerCards[1];
      const player3Card = playerCards[2];
      const player4Card = playerCards[3];

      expect(player2Card.querySelector('[data-testid="turn-time"]')).toBeNull();
      expect(player3Card.querySelector('[data-testid="turn-time"]')).toBeNull();
      expect(player4Card.querySelector('[data-testid="turn-time"]')).toBeNull();
    });

    it('ターン時間が1秒ごとに更新される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 初期表示は「00:00」
      let turnTimeElement = container.querySelector('[data-testid="turn-time"]');
      expect(turnTimeElement?.textContent).toContain('00:00');

      // 2秒経過: 00:00:02（setIntervalを発火させるため）
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // 表示が「00:02」に更新される
      turnTimeElement = container.querySelector('[data-testid="turn-time"]');
      expect(turnTimeElement?.textContent).toContain('00:02');

      // さらに3秒経過: 00:00:05
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // 表示が「00:05」に更新される
      turnTimeElement = container.querySelector('[data-testid="turn-time"]');
      expect(turnTimeElement?.textContent).toContain('00:05');
    });

    it('一時停止時にターン時間の更新が停止する', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 5秒経過（setIntervalを発火させる）
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 表示が「00:05」
      let turnTimeElement = container.querySelector('[data-testid="turn-time"]');
      expect(turnTimeElement?.textContent).toContain('00:05');

      // 一時停止ボタンをクリック
      const pauseButton = screen.getByText('⏸️ タイマー停止');
      act(() => {
        pauseButton.click();
      });

      // 一時停止中に5秒経過
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 表示は「00:05」のまま（一時停止中は更新されない）
      turnTimeElement = container.querySelector('[data-testid="turn-time"]');
      expect(turnTimeElement?.textContent).toContain('00:05');

      // 再開ボタンをクリック
      const resumeButton = screen.getByText('▶️ タイマー再開');
      act(() => {
        resumeButton.click();
      });

      // 再開後3秒経過
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // 表示が「00:08」に更新される（一時停止期間5秒を除外: 5秒 + 3秒 = 8秒）
      turnTimeElement = container.querySelector('[data-testid="turn-time"]');
      expect(turnTimeElement?.textContent).toContain('00:08');
    });

    it('アクティブプレイヤー切り替え時に「現在のターン」が1つだけ表示される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // プレイヤー1に「現在のターン」が表示される（1つだけ）
      let turnTimeElements = container.querySelectorAll('[data-testid="turn-time"]');
      expect(turnTimeElements.length).toBe(1);

      // 5秒経過
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // プレイヤー2をアクティブに設定
      act(() => {
        const newActivateButtons = screen.getAllByText('アクティブに設定');
        newActivateButtons[1].click();
      });

      // プレイヤー切り替え後も「現在のターン」は1つだけ表示される
      // （プレイヤー1の表示は消え、プレイヤー2の表示が新たに現れる）
      turnTimeElements = container.querySelectorAll('[data-testid="turn-time"]');
      expect(turnTimeElements.length).toBe(1);
    });
  });
});

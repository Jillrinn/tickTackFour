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

describe('GameTimer - ゲーム全体のプレイ時間表示（Task 5.3）', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('フォールバックモード: ゲーム全体のプレイ時間表示', () => {
    it('固定ヘッダーに「ゲーム全体」が表示される', () => {
      const { container } = render(<GameTimer />);

      // 固定ヘッダーに「ゲーム全体」が表示される
      const totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement).not.toBeNull();
      expect(totalGameTimeElement?.textContent).toContain('ゲーム全体');
    });

    it('初期表示は「00:00」', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // 初期表示は「00:00」
      const totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:00');
    });

    it('ゲーム全体時間が1秒ごとに更新される（MM:SS形式）', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 5秒経過（setIntervalを発火させるため）
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 表示が「00:05」に更新される（プレイヤー1の経過時間）
      let totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:05');

      // さらに10秒経過
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // 表示が「00:15」に更新される
      totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:15');
    });

    it('1時間以上はHH:MM:SS形式で表示される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 1時間1分1秒（3661秒）経過
      act(() => {
        vi.advanceTimersByTime(3661000);
      });

      // 表示が「1:01:01」に更新される（HH:MM:SS形式）
      const totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('1:01:01');
    });

    it('リセット時に「00:00」にリセットされる', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 10秒経過
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // 表示が「00:10」
      let totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:10');

      // リセットボタンをクリック
      const resetButton = screen.getByText('リセット');
      act(() => {
        resetButton.click();
      });

      // 表示が「00:00」にリセットされる
      totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:00');
    });

    it('1時間未満は通常色（normal）クラスが適用される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 30分（1800秒）経過
      act(() => {
        vi.advanceTimersByTime(1800000);
      });

      // 「normal」クラスが適用される
      const totalGameTimeValue = container.querySelector('.total-game-time-value');
      expect(totalGameTimeValue?.classList.contains('normal')).toBe(true);
    });

    it('1-2時間は警告色（warning）クラスが適用される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 1時間30分（5400秒）経過
      act(() => {
        vi.advanceTimersByTime(5400000);
      });

      // 「warning」クラスが適用される
      const totalGameTimeValue = container.querySelector('.total-game-time-value');
      expect(totalGameTimeValue?.classList.contains('warning')).toBe(true);
    });

    it('2時間以上は危険色（danger）クラスが適用される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 2時間10分（7800秒）経過
      act(() => {
        vi.advanceTimersByTime(7800000);
      });

      // 「danger」クラスが適用される
      const totalGameTimeValue = container.querySelector('.total-game-time-value');
      expect(totalGameTimeValue?.classList.contains('danger')).toBe(true);
    });

    it('一時停止時に時間更新が停止し、表示は維持される', () => {
      const { container } = render(<GameTimer />);

      // 現在時刻を固定: 00:00:00
      const baseTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      // プレイヤー1をアクティブに設定
      const activateButtons = screen.getAllByText('アクティブに設定');
      act(() => {
        activateButtons[0].click();
      });

      // 10秒経過
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // 表示が「00:10」
      let totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:10');

      // 一時停止ボタンをクリック
      const pauseButton = screen.getByText('⏸️ タイマー停止');
      act(() => {
        pauseButton.click();
      });

      // 一時停止中に5秒経過
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 表示は「00:10」のまま（一時停止中は更新されない）
      totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:10');

      // 再開ボタンをクリック
      const resumeButton = screen.getByText('▶️ タイマー再開');
      act(() => {
        resumeButton.click();
      });

      // 再開後3秒経過
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // 表示が「00:13」に更新される（一時停止期間5秒を除外: 10秒 + 3秒 = 13秒）
      totalGameTimeElement = container.querySelector('[data-testid="total-game-time"]');
      expect(totalGameTimeElement?.textContent).toContain('00:13');
    });
  });
});

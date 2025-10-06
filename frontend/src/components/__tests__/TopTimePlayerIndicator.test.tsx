import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopTimePlayerIndicator } from '../TopTimePlayerIndicator';
import type { Player } from '../../types/GameState';

// useGameStateフックをモック
vi.mock('../../hooks/useGameState');

// モックプレイヤーデータ
const mockPlayer1: Player = {
  id: 'player-1',
  name: 'アリス',
  elapsedTimeSeconds: 305, // 5分5秒
  initialTimeSeconds: 600,
  isActive: false,
  createdAt: new Date()
};

const mockPlayer2: Player = {
  id: 'player-2',
  name: 'プレイヤー2', // デフォルト名（番号）
  elapsedTimeSeconds: 125, // 2分5秒
  initialTimeSeconds: 600,
  isActive: false,
  createdAt: new Date()
};

/**
 * TopTimePlayerIndicator コンポーネントのテスト
 * 最も時間を使っているプレイヤーを表示するコンポーネント
 *
 * 要件トレーサビリティ:
 * - 要件2.1: 指定フォーマットで表示
 * - 要件2.2: HH:MM:SS形式
 * - 要件2.3: 視覚的に目立つスタイル
 * - 要件2.4: プレイヤー名または番号表示
 */
describe('TopTimePlayerIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('カウントアップモード時の表示', () => {
    it('カウントアップモード時に最長時間プレイヤーを表示すること（要件2.1）', async () => {
      const { useGameState } = await import('../../hooks/useGameState');
      vi.mocked(useGameState).mockReturnValue({
        getLongestTimePlayer: () => mockPlayer1,
        formatTime: (seconds: number) => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
      } as any);

      render(<TopTimePlayerIndicator />);

      // プレイヤー名が表示されていること
      expect(screen.getByText(/アリス/)).toBeInTheDocument();
      // 時間が表示されていること（HH:MM:SS形式）
      expect(screen.getByText(/00:05:05/)).toBeInTheDocument();
    });

    it('指定されたフォーマット「最も時間を使っているプレイヤー: [名前] (HH:MM:SS)」で表示すること（要件2.1, 2.2）', async () => {
      const { useGameState } = await import('../../hooks/useGameState');
      vi.mocked(useGameState).mockReturnValue({
        getLongestTimePlayer: () => mockPlayer1,
        formatTime: (seconds: number) => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
      } as any);

      render(<TopTimePlayerIndicator />);

      // 指定フォーマットで表示されていること
      expect(screen.getByText('最も時間を使っているプレイヤー:')).toBeInTheDocument();
      expect(screen.getByText(/アリス/)).toBeInTheDocument();
      expect(screen.getByText(/\(00:05:05\)/)).toBeInTheDocument();
    });

    it('プレイヤー名が設定されている場合、その名前を表示すること（要件2.4）', async () => {
      const { useGameState } = await import('../../hooks/useGameState');
      vi.mocked(useGameState).mockReturnValue({
        getLongestTimePlayer: () => mockPlayer1,
        formatTime: () => '00:05:05'
      } as any);

      render(<TopTimePlayerIndicator />);

      // カスタム名が表示されていること
      expect(screen.getByText(/アリス/)).toBeInTheDocument();
    });

    it('プレイヤー名が未設定の場合、プレイヤー番号を表示すること（要件2.4）', async () => {
      const { useGameState } = await import('../../hooks/useGameState');
      vi.mocked(useGameState).mockReturnValue({
        getLongestTimePlayer: () => mockPlayer2,
        formatTime: () => '00:02:05'
      } as any);

      render(<TopTimePlayerIndicator />);

      // プレイヤー番号が表示されていること
      expect(screen.getByText(/プレイヤー2/)).toBeInTheDocument();
    });
  });

  describe('カウントダウンモード時の表示', () => {
    it('カウントダウンモード時に何も表示しないこと（null）', async () => {
      const { useGameState } = await import('../../hooks/useGameState');
      vi.mocked(useGameState).mockReturnValue({
        getLongestTimePlayer: () => null,
        formatTime: () => '00:00:00'
      } as any);

      const { container } = render(<TopTimePlayerIndicator />);

      // 何も表示されないこと（nullを返す）
      expect(container.firstChild).toBeNull();
    });
  });

  describe('全員0秒時の表示', () => {
    it('全員の時間が0の場合、何も表示しないこと', async () => {
      const { useGameState } = await import('../../hooks/useGameState');
      vi.mocked(useGameState).mockReturnValue({
        getLongestTimePlayer: () => null,
        formatTime: () => '00:00:00'
      } as any);

      const { container } = render(<TopTimePlayerIndicator />);

      // 何も表示されないこと（nullを返す）
      expect(container.firstChild).toBeNull();
    });
  });

  describe('スタイル適用', () => {
    it('視覚的に目立つスタイル（top-time-indicatorクラス）が適用されること（要件2.3）', async () => {
      const { useGameState } = await import('../../hooks/useGameState');
      vi.mocked(useGameState).mockReturnValue({
        getLongestTimePlayer: () => mockPlayer1,
        formatTime: () => '00:05:05'
      } as any);

      const { container } = render(<TopTimePlayerIndicator />);

      // top-time-indicatorクラスが適用されていること
      const indicator = container.querySelector('.top-time-indicator');
      expect(indicator).toBeInTheDocument();
    });
  });
});

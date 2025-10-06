import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopTimePlayerIndicator } from '../TopTimePlayerIndicator';
import type { Player } from '../../types/GameState';

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
  describe('最長時間プレイヤー表示', () => {
    it('longestPlayerが渡された場合に表示すること（要件2.1）', () => {
      render(<TopTimePlayerIndicator longestPlayer={mockPlayer1} />);

      // プレイヤー名が表示されていること
      expect(screen.getByText(/アリス/)).toBeInTheDocument();
      // 時間が表示されていること（HH:MM:SS形式）
      expect(screen.getByText(/00:05:05/)).toBeInTheDocument();
    });

    it('指定されたフォーマット「最も時間を使っているプレイヤー: [名前] (HH:MM:SS)」で表示すること（要件2.1, 2.2）', () => {
      render(<TopTimePlayerIndicator longestPlayer={mockPlayer1} />);

      // 指定フォーマットで表示されていること
      expect(screen.getByText('最も時間を使っているプレイヤー:')).toBeInTheDocument();
      expect(screen.getByText(/アリス/)).toBeInTheDocument();
      expect(screen.getByText(/\(00:05:05\)/)).toBeInTheDocument();
    });

    it('プレイヤー名が設定されている場合、その名前を表示すること（要件2.4）', () => {
      render(<TopTimePlayerIndicator longestPlayer={mockPlayer1} />);

      // カスタム名が表示されていること
      expect(screen.getByText(/アリス/)).toBeInTheDocument();
    });

    it('プレイヤー名が未設定の場合、プレイヤー番号を表示すること（要件2.4）', () => {
      render(<TopTimePlayerIndicator longestPlayer={mockPlayer2} />);

      // プレイヤー番号が表示されていること
      expect(screen.getByText(/プレイヤー2/)).toBeInTheDocument();
    });
  });

  describe('longestPlayerがnullの場合', () => {
    it('longestPlayerがnullの場合は何も表示しないこと', () => {
      const { container } = render(<TopTimePlayerIndicator longestPlayer={null} />);

      // 何も表示されないこと（nullを返す）
      expect(container.firstChild).toBeNull();
    });
  });

  describe('スタイル適用', () => {
    it('視覚的に目立つスタイル（top-time-indicatorクラス）が適用されること（要件2.3）', () => {
      const { container } = render(<TopTimePlayerIndicator longestPlayer={mockPlayer1} />);

      // top-time-indicatorクラスが適用されていること
      const indicator = container.querySelector('.top-time-indicator');
      expect(indicator).toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerList } from '../PlayerList';
import type { Player } from '../../types/GameState';

describe('PlayerList', () => {
  const mockPlayers: Player[] = [
    {
      id: 'player-1',
      name: 'プレイヤー1',
      elapsedTimeSeconds: 125, // 2:05
      initialTimeSeconds: 600,
      isActive: true,
      createdAt: new Date()
    },
    {
      id: 'player-2',
      name: 'プレイヤー2',
      elapsedTimeSeconds: 45, // 0:45
      initialTimeSeconds: 600,
      isActive: false,
      createdAt: new Date()
    },
    {
      id: 'player-3',
      name: 'プレイヤー3',
      elapsedTimeSeconds: 0, // 0:00
      initialTimeSeconds: 600,
      isActive: false,
      createdAt: new Date()
    }
  ];

  it('すべてのプレイヤーが表示される', () => {
    render(<PlayerList players={mockPlayers} activePlayerId={null} />);

    expect(screen.getByText('プレイヤー1')).toBeInTheDocument();
    expect(screen.getByText('プレイヤー2')).toBeInTheDocument();
    expect(screen.getByText('プレイヤー3')).toBeInTheDocument();
  });

  it('タイマー値がMM:SS形式で表示される', () => {
    render(<PlayerList players={mockPlayers} activePlayerId={null} />);

    expect(screen.getByText('02:05')).toBeInTheDocument();
    expect(screen.getByText('00:45')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('アクティブプレイヤーがハイライト表示される', () => {
    const { container } = render(
      <PlayerList players={mockPlayers} activePlayerId="player-1" />
    );

    const playerCards = container.querySelectorAll('.player-card');
    expect(playerCards[0]).toHaveClass('active');
    expect(playerCards[1]).not.toHaveClass('active');
    expect(playerCards[2]).not.toHaveClass('active');
  });

  it('アクティブプレイヤーがnullの場合、ハイライト表示なし', () => {
    const { container } = render(
      <PlayerList players={mockPlayers} activePlayerId={null} />
    );

    const activeCards = container.querySelectorAll('.player-card.active');
    expect(activeCards.length).toBe(0);
  });

  it('カウントダウンモードで時間切れのプレイヤーは赤色表示', () => {
    const countdownPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'プレイヤー1',
        elapsedTimeSeconds: 0, // 時間切れ
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date()
      },
      {
        id: 'player-2',
        name: 'プレイヤー2',
        elapsedTimeSeconds: 30, // まだ余裕あり
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date()
      }
    ];

    const { container } = render(
      <PlayerList
        players={countdownPlayers}
        activePlayerId={null}
        timerMode="count-down"
      />
    );

    const playerCards = container.querySelectorAll('.player-card');
    expect(playerCards[0]).toHaveClass('time-expired');
    expect(playerCards[1]).not.toHaveClass('time-expired');
  });

  it('空のプレイヤーリストでもエラーが発生しない', () => {
    render(<PlayerList players={[]} activePlayerId={null} />);

    const playerCards = screen.queryAllByRole('listitem');
    expect(playerCards.length).toBe(0);
  });
});

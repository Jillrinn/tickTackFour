import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GameTimer } from '../GameTimer';

// SignalRConnectionManagerをモック
vi.mock('../../services/SignalRConnectionManager', () => ({
  SignalRConnectionManager: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    getConnectionState: vi.fn().mockReturnValue('Connected'),
    onConnectionStateChanged: vi.fn()
  })),
  ConnectionState: {
    Disconnected: 'Disconnected',
    Connecting: 'Connecting',
    Connected: 'Connected',
    Reconnecting: 'Reconnecting'
  }
}));

// fetch APIをモック
global.fetch = vi.fn();

describe('GameTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date().toISOString()
          },
          {
            id: 'player-2',
            name: 'プレイヤー2',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date().toISOString()
          }
        ],
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      })
    });
  });

  it('初期表示時にゲーム状態をAPIから取得する', async () => {
    render(<GameTimer />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/game');
    });
  });

  it('プレイヤーリストが表示される', async () => {
    render(<GameTimer />);

    await waitFor(() => {
      expect(screen.getByText('プレイヤー1')).toBeInTheDocument();
      expect(screen.getByText('プレイヤー2')).toBeInTheDocument();
    });
  });

  it('タイマーコントロールが表示される', async () => {
    render(<GameTimer />);

    await waitFor(() => {
      expect(screen.getByText('次のプレイヤーへ')).toBeInTheDocument();
      expect(screen.getByText('リセット')).toBeInTheDocument();
    });
  });

  it('ローディング中はローディング表示が表示される', () => {
    render(<GameTimer />);

    expect(screen.getByText(/読み込み中/)).toBeInTheDocument();
  });

  it('API取得エラー時はエラーメッセージが表示される', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<GameTimer />);

    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });
});

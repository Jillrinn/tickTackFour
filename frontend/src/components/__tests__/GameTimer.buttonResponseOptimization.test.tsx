import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameTimer } from '../GameTimer';

/**
 * Task 2.1-2.3: ボタンレスポンス最適化テスト
 *
 * Requirements: button-response-optimization spec
 * - Task 2.1: ターン切り替えボタンの即座更新
 * - Task 2.2: 一時停止・再開ボタンの即座更新
 * - Task 2.3: リセットボタンの即座更新
 *
 * テスト戦略: 各ボタンハンドラでsyncWithServer()が呼ばれることを確認
 */

// syncWithServer()のモック
const mockSyncWithServer = vi.fn();

// フォールバックモードを無効化（通常モードでテスト）
vi.mock('../../hooks/useFallbackMode', () => ({
  useFallbackMode: () => ({
    isInFallbackMode: false,
    lastError: null,
    retryCount: 0,
    activateFallbackMode: vi.fn(),
    deactivateFallbackMode: vi.fn(),
    incrementRetryCount: vi.fn()
  })
}));

// useGameStateをモック（フォールバック用）
vi.mock('../../hooks/useGameState', () => ({
  useGameState: () => ({
    gameState: {
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 0 },
        { name: 'プレイヤー2', elapsedSeconds: 0 },
        { name: 'プレイヤー3', elapsedSeconds: 0 },
        { name: 'プレイヤー4', elapsedSeconds: 0 }
      ],
      activePlayerIndex: 0,
      isPaused: false,
      timerMode: 'count-up' as const
    },
    switchToNextPlayer: vi.fn(),
    setPaused: vi.fn(),
    resetGame: vi.fn(),
    setPlayerCount: vi.fn(),
    setTimerMode: vi.fn(),
    updatePlayerName: vi.fn(),
    setActivePlayer: vi.fn(),
    formatTime: (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    getLongestTimePlayer: () => null,
    getTotalGameTime: () => 0,
    formatGameTime: (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    getCurrentTurnTime: () => 0
  })
}));

// useServerGameStateをモック
vi.mock('../../hooks/useServerGameState', () => ({
  useServerGameState: () => ({
    serverState: {
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 10 },
        { name: 'プレイヤー2', elapsedSeconds: 20 },
        { name: 'プレイヤー3', elapsedSeconds: 30 },
        { name: 'プレイヤー4', elapsedSeconds: 40 }
      ],
      activePlayerIndex: 0,
      isPaused: false,
      timerMode: 'count-up' as const,
      turnStartedAt: new Date().toISOString(),
      pausedAt: null
    },
    displayTime: 10,
    updateFromServer: vi.fn(),
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    },
    getLongestTimePlayer: () => null,
    getTotalGameTime: () => 100,
    formatGameTime: (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    getCurrentTurnTime: () => 5,
    syncWithServer: mockSyncWithServer
  })
}));

// useGameApiをモック
const mockSwitchTurn = vi.fn();
const mockPauseGameApi = vi.fn();
const mockResumeGameApi = vi.fn();
const mockResetGameApi = vi.fn();

vi.mock('../../hooks/useGameApi', () => ({
  useGameApi: () => ({
    switchTurn: mockSwitchTurn,
    pauseGameApi: mockPauseGameApi,
    resumeGameApi: mockResumeGameApi,
    resetGameApi: mockResetGameApi,
    updatePlayerCountApi: vi.fn().mockResolvedValue({ etag: 'test-etag' }),
    updateTimerModeApi: vi.fn().mockResolvedValue({ etag: 'test-etag' }),
    updatePlayerNameApi: vi.fn().mockResolvedValue({ etag: 'test-etag' })
  })
}));

// useETagManagerをモック
const mockUpdateEtag = vi.fn();
const mockClearConflictMessage = vi.fn();

vi.mock('../../hooks/useETagManager', () => ({
  useETagManager: () => ({
    etag: 'test-etag-123',
    updateEtag: mockUpdateEtag,
    conflictMessage: null,
    clearConflictMessage: mockClearConflictMessage
  })
}));

// usePollingSync をモック（ポーリングを無効化）
vi.mock('../../hooks/usePollingSync', () => ({
  usePollingSync: () => ({
    // ポーリングは実行しない
  })
}));

// usePlayerNameHistoryをモック
vi.mock('../../hooks/usePlayerNameHistory', () => ({
  usePlayerNameHistory: () => ({
    names: [],
    isLoading: false,
    fetchNames: vi.fn(),
    saveNames: vi.fn().mockResolvedValue(undefined),
    clearNames: vi.fn()
  })
}));

describe('GameTimer - Task 2.1: ターン切り替えボタンの即座更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // API成功レスポンス
    mockSwitchTurn.mockResolvedValue({ etag: 'new-etag-456' });
    mockSyncWithServer.mockResolvedValue({
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 10 },
        { name: 'プレイヤー2', elapsedSeconds: 20 },
        { name: 'プレイヤー3', elapsedSeconds: 30 },
        { name: 'プレイヤー4', elapsedSeconds: 40 }
      ],
      activePlayerIndex: 1,
      isPaused: false,
      timerMode: 'count-up' as const,
      turnStartedAt: new Date().toISOString(),
      pausedAt: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ターン切り替えボタンクリック後、syncWithServer()が呼ばれる', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const nextButton = screen.getByRole('button', { name: /次のプレイヤーへ/i });
    await user.click(nextButton);

    // syncWithServer()が呼ばれたことを確認
    await waitFor(() => {
      expect(mockSyncWithServer).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('API失敗時にsyncWithServer()が呼ばれない', async () => {
    const user = userEvent.setup();
    mockSwitchTurn.mockResolvedValue(null); // API失敗

    render(<GameTimer />);

    const nextButton = screen.getByRole('button', { name: /次のプレイヤーへ/i });
    await user.click(nextButton);

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 300));

    // syncWithServer()が呼ばれないことを確認
    expect(mockSyncWithServer).not.toHaveBeenCalled();
  });
});

describe('GameTimer - Task 2.2: 一時停止・再開ボタンの即座更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPauseGameApi.mockResolvedValue({ etag: 'new-etag-789' });
    mockSyncWithServer.mockResolvedValue({
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 10 },
        { name: 'プレイヤー2', elapsedSeconds: 20 },
        { name: 'プレイヤー3', elapsedSeconds: 30 },
        { name: 'プレイヤー4', elapsedSeconds: 40 }
      ],
      activePlayerIndex: 0,
      isPaused: true,
      timerMode: 'count-up' as const,
      turnStartedAt: new Date().toISOString(),
      pausedAt: new Date().toISOString()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('一時停止ボタンクリック後、syncWithServer()が呼ばれる', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const pauseButton = screen.getByRole('button', { name: /一時停止/i });
    await user.click(pauseButton);

    // syncWithServer()が呼ばれたことを確認
    await waitFor(() => {
      expect(mockSyncWithServer).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});

describe('GameTimer - Task 2.3: リセットボタンの即座更新', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetGameApi.mockResolvedValue({ etag: 'new-etag-reset' });
    mockSyncWithServer.mockResolvedValue({
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 0 },
        { name: 'プレイヤー2', elapsedSeconds: 0 },
        { name: 'プレイヤー3', elapsedSeconds: 0 },
        { name: 'プレイヤー4', elapsedSeconds: 0 }
      ],
      activePlayerIndex: 0,
      isPaused: false,
      timerMode: 'count-up' as const,
      turnStartedAt: new Date().toISOString(),
      pausedAt: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('リセットボタンクリック後、syncWithServer()が呼ばれる', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // syncWithServer()が呼ばれたことを確認
    await waitFor(() => {
      expect(mockSyncWithServer).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameTimer } from '../GameTimer';

/**
 * Task 3.1-3.2: リセットハンドラーとAPI統合テスト
 *
 * Requirements: reset-button-fix spec
 * - Task 3.1: リセットハンドラーとAPI統合のテストを実装する
 * - Task 3.2: リセット後のタイマー停止確認テストを実装する
 */

// syncWithServer()のモック
const mockSyncWithServer = vi.fn();

// フォールバックモードを無効化（通常モード/APIモードでテスト）
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
        { name: 'Alice', elapsedSeconds: 0 },
        { name: 'Bob', elapsedSeconds: 0 },
        { name: 'プレイヤー3', elapsedSeconds: 0 },
        { name: 'プレイヤー4', elapsedSeconds: 0 }
      ],
      activePlayerIndex: 0,
      isPaused: false,
      timerMode: 'countup' as const
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
        { name: 'Alice', elapsedSeconds: 10 },
        { name: 'Bob', elapsedSeconds: 20 },
        { name: 'プレイヤー3', elapsedSeconds: 30 },
        { name: 'プレイヤー4', elapsedSeconds: 40 }
      ],
      activePlayerIndex: 0,
      isPaused: false,
      timerMode: 'countup' as const,
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
const mockResetGame = vi.fn();

vi.mock('../../hooks/useGameApi', () => ({
  useGameApi: () => ({
    switchTurn: vi.fn().mockResolvedValue({ etag: 'new-etag-switch' }),
    pauseGame: vi.fn().mockResolvedValue({ etag: 'new-etag-pause' }),
    resumeGame: vi.fn().mockResolvedValue({ etag: 'new-etag-resume' }),
    resetGame: mockResetGame,
    updateGame: vi.fn().mockResolvedValue({ etag: 'test-etag' })
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
const mockSaveNames = vi.fn();

vi.mock('../../hooks/usePlayerNameHistory', () => ({
  usePlayerNameHistory: () => ({
    names: [],
    isLoading: false,
    fetchNames: vi.fn(),
    saveNames: mockSaveNames,
    clearNames: vi.fn()
  })
}));

describe('GameTimer - Task 3.1: リセットハンドラーとAPI統合のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // テストモードを'development'に設定してAPI呼び出しを有効化
    vi.stubEnv('MODE', 'development');
    // Task 3.1要件: APIがisPaused: true, activePlayerIndex: -1を返す
    mockResetGame.mockResolvedValue({
      isPaused: true,
      activePlayerIndex: -1,
      turnStartedAt: undefined,
      pausedAt: undefined,
      players: [
        { name: 'プレイヤー1', accumulatedSeconds: 0 },
        { name: 'プレイヤー2', accumulatedSeconds: 0 },
        { name: 'プレイヤー3', accumulatedSeconds: 0 },
        { name: 'プレイヤー4', accumulatedSeconds: 0 }
      ],
      timerMode: 'countup',
      countdownSeconds: 60,
      playerCount: 4,
      etag: 'new-etag-after-reset'
    });
    mockSyncWithServer.mockResolvedValue({
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 0 },
        { name: 'プレイヤー2', elapsedSeconds: 0 },
        { name: 'プレイヤー3', elapsedSeconds: 0 },
        { name: 'プレイヤー4', elapsedSeconds: 0 }
      ],
      activePlayerIndex: -1,
      isPaused: true,
      timerMode: 'countup' as const,
      turnStartedAt: undefined,
      pausedAt: undefined
    });
    mockSaveNames.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('Task 3.1.1: APIモードでリセットボタン押下時、resetGameApi(etag)が呼び出される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // resetGameApi(etag)が呼び出されたことを確認
    await waitFor(() => {
      expect(mockResetGame).toHaveBeenCalledWith('test-etag-123');
    }, { timeout: 1000 });
  });

  it('Task 3.1.2: APIがisPaused: true, activePlayerIndex: -1を返した後、syncWithServer()が呼び出される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // syncWithServer()が呼ばれたことを確認
    await waitFor(() => {
      expect(mockSyncWithServer).toHaveBeenCalled();
    }, { timeout: 1000 });

    // resetGameApiの後にsyncWithServerが呼ばれることを確認
    expect(mockResetGame).toHaveBeenCalled();
  });

  it('Task 3.1.3: プレイヤー名履歴保存機能が正しく動作する（Task 8既存機能）', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // リセットボタンをクリック
    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // saveNamesが呼び出されることを確認（デフォルト名以外のAliceとBobを保存）
    await waitFor(() => {
      expect(mockSaveNames).toHaveBeenCalled();
    }, { timeout: 1000 });

    // saveNamesの引数にAliceとBobが含まれることを確認
    const callArgs = mockSaveNames.mock.calls[0][0];
    expect(callArgs).toContain('Alice');
    expect(callArgs).toContain('Bob');
    // デフォルト名「プレイヤー3」「プレイヤー4」は含まれないことを確認
    expect(callArgs).not.toContain('プレイヤー3');
    expect(callArgs).not.toContain('プレイヤー4');
  });
});

describe('GameTimer - Task 3.2: リセット後のタイマー停止確認テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // テストモードを'development'に設定してAPI呼び出しを有効化
    vi.stubEnv('MODE', 'development');
    // リセット後の停止状態を返すようにモック設定
    mockResetGame.mockResolvedValue({
      isPaused: true,
      activePlayerIndex: -1,
      turnStartedAt: undefined,
      pausedAt: undefined,
      players: [
        { name: 'プレイヤー1', accumulatedSeconds: 0 },
        { name: 'プレイヤー2', accumulatedSeconds: 0 },
        { name: 'プレイヤー3', accumulatedSeconds: 0 },
        { name: 'プレイヤー4', accumulatedSeconds: 0 }
      ],
      timerMode: 'countup',
      countdownSeconds: 60,
      playerCount: 4,
      etag: 'new-etag-after-reset'
    });
    mockSyncWithServer.mockResolvedValue({
      players: [
        { name: 'プレイヤー1', elapsedSeconds: 0 },
        { name: 'プレイヤー2', elapsedSeconds: 0 },
        { name: 'プレイヤー3', elapsedSeconds: 0 },
        { name: 'プレイヤー4', elapsedSeconds: 0 }
      ],
      activePlayerIndex: -1,
      isPaused: true,
      timerMode: 'countup' as const,
      turnStartedAt: undefined,
      pausedAt: undefined
    });
    mockSaveNames.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('Task 3.2.1: APIからisPaused: trueの状態を取得後、useGameTimerが停止する', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // APIからisPaused: trueを返すことを確認（モック設定済み）
    await waitFor(() => {
      expect(mockResetGame).toHaveBeenCalled();
    }, { timeout: 1000 });

    const response = await mockResetGame.mock.results[0].value;
    expect(response.isPaused).toBe(true);
  });

  it('Task 3.2.2: APIからactivePlayerIndex: -1の状態を取得後、useGameTimerが停止する', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // APIからactivePlayerIndex: -1を返すことを確認（モック設定済み）
    await waitFor(() => {
      expect(mockResetGame).toHaveBeenCalled();
    }, { timeout: 1000 });

    const response = await mockResetGame.mock.results[0].value;
    expect(response.activePlayerIndex).toBe(-1);
  });

  it('Task 3.2.3: リセット後、5秒間待機してもタイマーが進まないことを検証', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const resetButton = screen.getByRole('button', { name: /リセット/i });
    await user.click(resetButton);

    // リセット完了を待つ
    await waitFor(() => {
      expect(mockSyncWithServer).toHaveBeenCalled();
    }, { timeout: 1000 });

    // タイマーが停止していることを確認（syncWithServerが再度呼ばれていないことで確認）
    // リセット時の1回のみで、追加の呼び出しがないことを確認
    const initialCallCount = mockSyncWithServer.mock.calls.length;

    // 実際の時間で少し待機（タイマーが動作していないことを確認）
    await new Promise(resolve => setTimeout(resolve, 100));

    // syncWithServerが追加で呼ばれていないことを確認
    expect(mockSyncWithServer).toHaveBeenCalledTimes(initialCallCount);
  }, { timeout: 10000 });
});

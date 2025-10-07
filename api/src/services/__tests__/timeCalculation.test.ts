import { calculateElapsedTime } from '../timeCalculation';
import { GameState } from '../../models/gameState';

describe('Time Calculation Service', () => {
  describe('calculateElapsedTime', () => {
    const baseTime = new Date('2025-01-01T00:00:00.000Z');

    beforeEach(() => {
      // 現在時刻をモック
      jest.useFakeTimers();
      jest.setSystemTime(baseTime);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('一時停止状態の場合、累積時間のみを返す', () => {
      // Arrange
      const state: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true,
        turnStartedAt: new Date(baseTime.getTime() - 5000).toISOString(), // 5秒前
        pausedAt: baseTime.toISOString()
      };

      // Act
      const result = calculateElapsedTime(state, 0);

      // Assert
      expect(result).toBe(30); // 累積時間のみ（経過時間は加算されない）
    });

    it('アクティブプレイヤーの場合、累積時間 + 経過時間を返す', () => {
      // Arrange
      const turnStartTime = new Date(baseTime.getTime() - 10000); // 10秒前
      const state: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: turnStartTime.toISOString()
      };

      // Act
      const result = calculateElapsedTime(state, 0);

      // Assert
      expect(result).toBe(40); // 累積30秒 + 経過10秒
    });

    it('非アクティブプレイヤーの場合、累積時間のみを返す', () => {
      // Arrange
      const state: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 15 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 10 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: new Date(baseTime.getTime() - 10000).toISOString()
      };

      // Act
      const resultPlayer2 = calculateElapsedTime(state, 1);
      const resultPlayer3 = calculateElapsedTime(state, 2);

      // Assert
      expect(resultPlayer2).toBe(20); // 累積時間のみ（非アクティブ）
      expect(resultPlayer3).toBe(15); // 累積時間のみ（非アクティブ）
    });

    it('turnStartedAtが未設定の場合、累積時間のみを返す', () => {
      // Arrange
      const state: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 25 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false
      };

      // Act
      const result = calculateElapsedTime(state, 0);

      // Assert
      expect(result).toBe(25); // 累積時間のみ
    });

    it('ミリ秒単位の経過時間を正しく秒に変換する', () => {
      // Arrange
      const turnStartTime = new Date(baseTime.getTime() - 2500); // 2.5秒前
      const state: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 10 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 0 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 0 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 0 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: turnStartTime.toISOString()
      };

      // Act
      const result = calculateElapsedTime(state, 0);

      // Assert
      expect(result).toBe(12); // 累積10秒 + 経過2秒（2500msを秒に変換）
    });

    it('全プレイヤーの経過時間を計算できる', () => {
      // Arrange
      const turnStartTime = new Date(baseTime.getTime() - 5000); // 5秒前
      const state: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 15 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 10 }
        ],
        activePlayerIndex: 2,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: false,
        turnStartedAt: turnStartTime.toISOString()
      };

      // Act
      const times = state.players.map((_, index) =>
        calculateElapsedTime(state, index)
      );

      // Assert
      expect(times[0]).toBe(30); // 非アクティブ（累積のみ）
      expect(times[1]).toBe(20); // 非アクティブ（累積のみ）
      expect(times[2]).toBe(20); // アクティブ（累積15 + 経過5）
      expect(times[3]).toBe(10); // 非アクティブ（累積のみ）
    });

    it('一時停止中で非アクティブプレイヤーの場合も累積時間のみを返す', () => {
      // Arrange
      const state: GameState = {
        playerCount: 4,
        players: [
          { id: 1, name: 'プレイヤー1', accumulatedSeconds: 30 },
          { id: 2, name: 'プレイヤー2', accumulatedSeconds: 20 },
          { id: 3, name: 'プレイヤー3', accumulatedSeconds: 15 },
          { id: 4, name: 'プレイヤー4', accumulatedSeconds: 10 }
        ],
        activePlayerIndex: 0,
        timerMode: 'countup',
        countdownSeconds: 60,
        isPaused: true,
        turnStartedAt: new Date(baseTime.getTime() - 5000).toISOString(),
        pausedAt: baseTime.toISOString()
      };

      // Act
      const result = calculateElapsedTime(state, 2);

      // Assert
      expect(result).toBe(15); // 累積時間のみ
    });
  });
});

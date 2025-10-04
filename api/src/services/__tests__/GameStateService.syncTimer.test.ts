import { GameStateService } from '../GameStateService';
import { GameStateRepository } from '../../repositories/GameStateRepository';
import { GameState } from '../../models/GameState';

const createMockRepository = (): Partial<GameStateRepository> => ({
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
});

describe('GameStateService - syncTimer', () => {
  let service: GameStateService;
  let mockRepository: Partial<GameStateRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    service = new GameStateService(mockRepository as GameStateRepository);
  });

  describe('カウントアップモード', () => {
    it('経過時間を正常に更新すること', async () => {
      const currentState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 120,
            initialTimeSeconds: 600,
            isActive: true,
            createdAt: new Date()
          },
          {
            id: 'player-2',
            name: 'プレイヤー2',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(currentState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.syncTimer('player-1', 125);

      expect(result.success).toBe(true);
      if (result.success) {
        const player = result.data.players.find(p => p.id === 'player-1');
        expect(player?.elapsedTimeSeconds).toBe(125);
      }
    });

    it('経過時間が増加していることを確認', async () => {
      const currentState: GameState = {
        players: [
          { id: 'player-1', name: 'プレイヤー1', elapsedTimeSeconds: 100, initialTimeSeconds: 600, isActive: true, createdAt: new Date() }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(currentState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.syncTimer('player-1', 105);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.players[0].elapsedTimeSeconds).toBe(105);
      }
    });
  });

  describe('カウントダウンモード', () => {
    it('残り時間を正常に更新すること', async () => {
      const currentState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 500, // 残り時間
            initialTimeSeconds: 600,
            isActive: true,
            createdAt: new Date()
          }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-down',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(currentState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.syncTimer('player-1', 495);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.players[0].elapsedTimeSeconds).toBe(495);
      }
    });

    it('時間切れ（0秒）を検出すること', async () => {
      const currentState: GameState = {
        players: [
          { id: 'player-1', name: 'プレイヤー1', elapsedTimeSeconds: 5, initialTimeSeconds: 600, isActive: true, createdAt: new Date() }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-down',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(currentState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.syncTimer('player-1', 0);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.players[0].elapsedTimeSeconds).toBe(0);
        // タイマーが停止していることを確認
        expect(result.data.players[0].isActive).toBe(false);
        expect(result.data.activePlayerId).toBeNull();
      }
    });

    it('負の値を許容しないこと', async () => {
      const currentState: GameState = {
        players: [
          { id: 'player-1', name: 'プレイヤー1', elapsedTimeSeconds: 10, initialTimeSeconds: 600, isActive: true, createdAt: new Date() }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-down',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(currentState);

      const result = await service.syncTimer('player-1', -5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.validationErrors).toContain('経過時間は0以上でなければなりません');
      }
    });
  });

  describe('バリデーション', () => {
    it('無効なプレイヤーIDでエラーを返すこと', async () => {
      const currentState: GameState = {
        players: [
          { id: 'player-1', name: 'プレイヤー1', elapsedTimeSeconds: 0, initialTimeSeconds: 600, isActive: false, createdAt: new Date() }
        ],
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(currentState);

      const result = await service.syncTimer('invalid-id', 120);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_PLAYER_ID');
      }
    });

    it('非整数の経過時間でエラーを返すこと', async () => {
      const currentState: GameState = {
        players: [
          { id: 'player-1', name: 'プレイヤー1', elapsedTimeSeconds: 0, initialTimeSeconds: 600, isActive: true, createdAt: new Date() }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(currentState);

      const result = await service.syncTimer('player-1', 120.5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.validationErrors).toContain('経過時間は整数でなければなりません');
      }
    });
  });
});

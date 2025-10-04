import { GameStateService } from '../GameStateService';
import { GameStateRepository } from '../../repositories/GameStateRepository';
import { GameState, Player } from '../../models/GameState';

// モックリポジトリ
const createMockRepository = (): Partial<GameStateRepository> => ({
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
});

describe('GameStateService', () => {
  let service: GameStateService;
  let mockRepository: Partial<GameStateRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    service = new GameStateService(mockRepository as GameStateRepository);
  });

  describe('getCurrentState', () => {
    it('既存のゲーム状態が存在する場合、それを返すこと', async () => {
      const existingState: GameState = {
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
          },
          {
            id: 'player-3',
            name: 'プレイヤー3',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-4',
            name: 'プレイヤー4',
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

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);

      const result = await service.getCurrentState();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(existingState);
      }
    });

    it('ゲーム状態が存在しない場合、デフォルト状態を作成して返すこと', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);
      (mockRepository.create as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getCurrentState();

      expect(result.success).toBe(true);
      if (result.success) {
        // デフォルト: 4人プレイヤー、カウントアップモード
        expect(result.data.players).toHaveLength(4);
        expect(result.data.timerMode).toBe('count-up');
        expect(result.data.activePlayerId).toBeNull();
        expect(result.data.isPaused).toBe(false);

        // プレイヤーの初期状態確認
        result.data.players.forEach((player, index) => {
          expect(player.name).toBe(`プレイヤー${index + 1}`);
          expect(player.elapsedTimeSeconds).toBe(0);
          expect(player.initialTimeSeconds).toBe(600); // デフォルト10分
          expect(player.isActive).toBe(false);
        });
      }

      // 保存が呼ばれたことを確認
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('リポジトリエラー時にエラーを返すこと', async () => {
      const error = new Error('Database connection failed');
      (mockRepository.get as jest.Mock).mockRejectedValue(error);

      const result = await service.getCurrentState();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Database connection failed');
      }
    });
  });

  describe('デフォルト状態の生成', () => {
    it('4人のプレイヤーが作成されること', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);
      (mockRepository.create as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getCurrentState();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.players).toHaveLength(4);
      }
    });

    it('各プレイヤーがユニークなIDを持つこと', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);
      (mockRepository.create as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getCurrentState();

      expect(result.success).toBe(true);
      if (result.success) {
        const playerIds = result.data.players.map(p => p.id);
        const uniqueIds = new Set(playerIds);
        expect(uniqueIds.size).toBe(4);
      }
    });

    it('カウントアップモードがデフォルトであること', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);
      (mockRepository.create as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getCurrentState();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timerMode).toBe('count-up');
      }
    });

    it('初期時間が600秒（10分）であること', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);
      (mockRepository.create as jest.Mock).mockResolvedValue(undefined);

      const result = await service.getCurrentState();

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.players.forEach(player => {
          expect(player.initialTimeSeconds).toBe(600);
        });
      }
    });
  });
});

import { GameStateService } from '../GameStateService';
import { GameStateRepository } from '../../repositories/GameStateRepository';
import { GameState } from '../../models/GameState';

const createMockRepository = (): Partial<GameStateRepository> => ({
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
});

describe('GameStateService - switchTurn', () => {
  let service: GameStateService;
  let mockRepository: Partial<GameStateRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    service = new GameStateService(mockRepository as GameStateRepository);
  });

  it('正常にターンを切り替えること', async () => {
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

    const result = await service.switchTurn('player-1', 'player-2');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activePlayerId).toBe('player-2');
      expect(result.data.players[0].isActive).toBe(false);
      expect(result.data.players[1].isActive).toBe(true);
    }
  });

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

    const result = await service.switchTurn('invalid-id', 'player-1');

    expect(result.success).toBe(false);
  });

  it('最後のプレイヤーから最初のプレイヤーに循環すること', async () => {
    const currentState: GameState = {
      players: [
        { id: 'player-1', name: 'プレイヤー1', elapsedTimeSeconds: 0, initialTimeSeconds: 600, isActive: false, createdAt: new Date() },
        { id: 'player-2', name: 'プレイヤー2', elapsedTimeSeconds: 0, initialTimeSeconds: 600, isActive: false, createdAt: new Date() },
        { id: 'player-3', name: 'プレイヤー3', elapsedTimeSeconds: 120, initialTimeSeconds: 600, isActive: true, createdAt: new Date() }
      ],
      activePlayerId: 'player-3',
      isPaused: false,
      timerMode: 'count-up',
      createdAt: new Date(),
      lastUpdatedAt: new Date()
    };

    (mockRepository.get as jest.Mock).mockResolvedValue(currentState);
    (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

    const result = await service.switchTurn('player-3', 'player-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activePlayerId).toBe('player-1');
    }
  });
});

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

describe('GameStateService - ゲームコントロール機能', () => {
  let service: GameStateService;
  let mockRepository: Partial<GameStateRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = createMockRepository();
    service = new GameStateService(mockRepository as GameStateRepository);
  });

  describe('resetGame', () => {
    it('全プレイヤーのタイマーを初期値にリセットすること', async () => {
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
            elapsedTimeSeconds: 60,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-3',
            name: 'プレイヤー3',
            elapsedTimeSeconds: 30,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-4',
            name: 'プレイヤー4',
            elapsedTimeSeconds: 45,
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
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.resetGame();

      expect(result.success).toBe(true);
      if (result.success) {
        // 全プレイヤーのタイマーが0にリセットされること
        result.data.players.forEach(player => {
          expect(player.elapsedTimeSeconds).toBe(0);
          expect(player.isActive).toBe(false);
        });

        // アクティブプレイヤーがnullになること
        expect(result.data.activePlayerId).toBeNull();

        // 一時停止状態が解除されること
        expect(result.data.isPaused).toBe(false);
      }

      // リポジトリのupdateメソッドが呼ばれたことを確認
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('カウントダウンモードでは初期時間にリセットされること', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 300, // 残り5分
            initialTimeSeconds: 600,
            isActive: true,
            createdAt: new Date()
          },
          {
            id: 'player-2',
            name: 'プレイヤー2',
            elapsedTimeSeconds: 400,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-3',
            name: 'プレイヤー3',
            elapsedTimeSeconds: 100,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-4',
            name: 'プレイヤー4',
            elapsedTimeSeconds: 200,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-down',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.resetGame();

      expect(result.success).toBe(true);
      if (result.success) {
        // カウントダウンモードでは初期時間にリセット
        result.data.players.forEach(player => {
          expect(player.elapsedTimeSeconds).toBe(player.initialTimeSeconds);
          expect(player.isActive).toBe(false);
        });

        expect(result.data.activePlayerId).toBeNull();
      }
    });

    it('ゲーム状態が存在しない場合、エラーを返すこと', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);

      const result = await service.resetGame();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATE_NOT_FOUND');
        expect(result.error.message).toBe('ゲーム状態が存在しません');
      }
    });

    it('リポジトリエラー時にエラーを返すこと', async () => {
      const error = new Error('Database update failed');
      (mockRepository.get as jest.Mock).mockRejectedValue(error);

      const result = await service.resetGame();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('RESET_GAME_ERROR');
      }
    });
  });

  describe('pauseGame', () => {
    it('現在動作中のタイマーを一時停止すること', async () => {
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
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.pauseGame();

      expect(result.success).toBe(true);
      if (result.success) {
        // isPausedがtrueになること
        expect(result.data.isPaused).toBe(true);

        // アクティブプレイヤーとタイマー値は保持されること
        expect(result.data.activePlayerId).toBe('player-1');
        expect(result.data.players[0].elapsedTimeSeconds).toBe(120);
      }

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('既に一時停止状態の場合、変更なしで成功すること', async () => {
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
        isPaused: true, // 既に一時停止中
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.pauseGame();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPaused).toBe(true);
      }
    });

    it('ゲーム状態が存在しない場合、エラーを返すこと', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);

      const result = await service.pauseGame();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATE_NOT_FOUND');
      }
    });
  });

  describe('resumeGame', () => {
    it('一時停止したタイマーを一時停止時点から再開すること', async () => {
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
        isPaused: true, // 一時停止中
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.resumeGame();

      expect(result.success).toBe(true);
      if (result.success) {
        // isPausedがfalseになること
        expect(result.data.isPaused).toBe(false);

        // アクティブプレイヤーとタイマー値は保持されること
        expect(result.data.activePlayerId).toBe('player-1');
        expect(result.data.players[0].elapsedTimeSeconds).toBe(120);
      }

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('一時停止していない場合、変更なしで成功すること', async () => {
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
        isPaused: false, // 実行中
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.resumeGame();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPaused).toBe(false);
      }
    });

    it('ゲーム状態が存在しない場合、エラーを返すこと', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);

      const result = await service.resumeGame();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATE_NOT_FOUND');
      }
    });
  });

  describe('updatePlayers', () => {
    it('プレイヤー数を4から5に増やせること', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updatePlayers(5);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.players).toHaveLength(5);
        expect(result.data.players[4].name).toBe('プレイヤー5');

        // 新プレイヤーの初期状態確認
        expect(result.data.players[4].elapsedTimeSeconds).toBe(0);
        expect(result.data.players[4].isActive).toBe(false);
      }

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('プレイヤー数を6から4に減らせること', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
          },
          {
            id: 'player-5',
            name: 'プレイヤー5',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-6',
            name: 'プレイヤー6',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          }
        ],
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updatePlayers(4);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.players).toHaveLength(4);
      }
    });

    it('プレイヤー数変更時に全タイマーがリセットされること', async () => {
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
            elapsedTimeSeconds: 60,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-3',
            name: 'プレイヤー3',
            elapsedTimeSeconds: 30,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-4',
            name: 'プレイヤー4',
            elapsedTimeSeconds: 45,
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
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updatePlayers(5);

      expect(result.success).toBe(true);
      if (result.success) {
        // 全タイマーがリセットされること
        result.data.players.forEach(player => {
          expect(player.elapsedTimeSeconds).toBe(0);
          expect(player.isActive).toBe(false);
        });

        // アクティブプレイヤーがnullになること
        expect(result.data.activePlayerId).toBeNull();
      }
    });

    it('プレイヤー数が4未満の場合、エラーを返すこと', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);

      const result = await service.updatePlayers(3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.validationErrors).toContain('プレイヤー数は4〜6人の範囲で指定してください');
      }
    });

    it('プレイヤー数が6超過の場合、エラーを返すこと', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);

      const result = await service.updatePlayers(7);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.validationErrors).toContain('プレイヤー数は4〜6人の範囲で指定してください');
      }
    });

    it('ゲーム状態が存在しない場合、エラーを返すこと', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);

      const result = await service.updatePlayers(5);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATE_NOT_FOUND');
      }
    });
  });

  describe('setTimerMode', () => {
    it('カウントアップモードからカウントダウンモードに切り替えられること', async () => {
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
            elapsedTimeSeconds: 60,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-3',
            name: 'プレイヤー3',
            elapsedTimeSeconds: 30,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-4',
            name: 'プレイヤー4',
            elapsedTimeSeconds: 45,
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
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.setTimerMode('count-down', 600);

      expect(result.success).toBe(true);
      if (result.success) {
        // タイマーモードが変更されること
        expect(result.data.timerMode).toBe('count-down');

        // 全プレイヤーのタイマーが初期時間にリセットされること
        result.data.players.forEach(player => {
          expect(player.elapsedTimeSeconds).toBe(600);
          expect(player.isActive).toBe(false);
        });

        // アクティブプレイヤーがnullになること
        expect(result.data.activePlayerId).toBeNull();
      }

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('カウントダウンモードからカウントアップモードに切り替えられること', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 300,
            initialTimeSeconds: 600,
            isActive: true,
            createdAt: new Date()
          },
          {
            id: 'player-2',
            name: 'プレイヤー2',
            elapsedTimeSeconds: 400,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-3',
            name: 'プレイヤー3',
            elapsedTimeSeconds: 200,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          },
          {
            id: 'player-4',
            name: 'プレイヤー4',
            elapsedTimeSeconds: 500,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: new Date()
          }
        ],
        activePlayerId: 'player-1',
        isPaused: false,
        timerMode: 'count-down',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.setTimerMode('count-up');

      expect(result.success).toBe(true);
      if (result.success) {
        // タイマーモードが変更されること
        expect(result.data.timerMode).toBe('count-up');

        // 全プレイヤーのタイマーが0にリセットされること
        result.data.players.forEach(player => {
          expect(player.elapsedTimeSeconds).toBe(0);
          expect(player.isActive).toBe(false);
        });

        // アクティブプレイヤーがnullになること
        expect(result.data.activePlayerId).toBeNull();
      }
    });

    it('カウントダウンモードでカスタム初期時間を設定できること', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const customInitialTime = 900; // 15分
      const result = await service.setTimerMode('count-down', customInitialTime);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timerMode).toBe('count-down');

        // カスタム初期時間が設定されること
        result.data.players.forEach(player => {
          expect(player.initialTimeSeconds).toBe(customInitialTime);
          expect(player.elapsedTimeSeconds).toBe(customInitialTime);
        });
      }
    });

    it('カウントダウンモードで初期時間を指定しない場合、デフォルト600秒になること', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);
      (mockRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.setTimerMode('count-down');

      expect(result.success).toBe(true);
      if (result.success) {
        // デフォルト600秒が設定されること
        result.data.players.forEach(player => {
          expect(player.initialTimeSeconds).toBe(600);
          expect(player.elapsedTimeSeconds).toBe(600);
        });
      }
    });

    it('無効なタイマーモードの場合、エラーを返すこと', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);

      const result = await service.setTimerMode('invalid-mode' as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.validationErrors).toContain('タイマーモードは count-up または count-down でなければなりません');
      }
    });

    it('初期時間が負の数の場合、エラーを返すこと', async () => {
      const existingState: GameState = {
        players: [
          {
            id: 'player-1',
            name: 'プレイヤー1',
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
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
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };

      (mockRepository.get as jest.Mock).mockResolvedValue(existingState);

      const result = await service.setTimerMode('count-down', -100);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.validationErrors).toContain('初期時間は正の整数でなければなりません');
      }
    });

    it('ゲーム状態が存在しない場合、エラーを返すこと', async () => {
      (mockRepository.get as jest.Mock).mockResolvedValue(null);

      const result = await service.setTimerMode('count-down');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATE_NOT_FOUND');
      }
    });

    it('リポジトリエラー時にエラーを返すこと', async () => {
      const error = new Error('Database update failed');
      (mockRepository.get as jest.Mock).mockRejectedValue(error);

      const result = await service.setTimerMode('count-down');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SET_TIMER_MODE_ERROR');
      }
    });
  });
});

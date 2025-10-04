import { GameState, Player, GameStateValidator } from '../GameState';

describe('GameStateValidator', () => {
  describe('validatePlayerCount', () => {
    it('4人のプレイヤー数は有効', () => {
      expect(GameStateValidator.validatePlayerCount(4)).toBe(true);
    });

    it('6人のプレイヤー数は有効', () => {
      expect(GameStateValidator.validatePlayerCount(6)).toBe(true);
    });

    it('5人のプレイヤー数は有効', () => {
      expect(GameStateValidator.validatePlayerCount(5)).toBe(true);
    });

    it('3人以下のプレイヤー数は無効', () => {
      expect(GameStateValidator.validatePlayerCount(3)).toBe(false);
      expect(GameStateValidator.validatePlayerCount(2)).toBe(false);
      expect(GameStateValidator.validatePlayerCount(0)).toBe(false);
    });

    it('7人以上のプレイヤー数は無効', () => {
      expect(GameStateValidator.validatePlayerCount(7)).toBe(false);
      expect(GameStateValidator.validatePlayerCount(10)).toBe(false);
    });
  });

  describe('validateElapsedTime', () => {
    it('0秒は有効', () => {
      expect(GameStateValidator.validateElapsedTime(0)).toBe(true);
    });

    it('正の整数は有効', () => {
      expect(GameStateValidator.validateElapsedTime(60)).toBe(true);
      expect(GameStateValidator.validateElapsedTime(3600)).toBe(true);
    });

    it('負の値は無効', () => {
      expect(GameStateValidator.validateElapsedTime(-1)).toBe(false);
      expect(GameStateValidator.validateElapsedTime(-100)).toBe(false);
    });

    it('小数は無効', () => {
      expect(GameStateValidator.validateElapsedTime(1.5)).toBe(false);
      expect(GameStateValidator.validateElapsedTime(0.1)).toBe(false);
    });
  });

  describe('validateActivePlayerCount', () => {
    const createPlayer = (id: string, isActive: boolean): Player => ({
      id,
      name: `プレイヤー${id}`,
      elapsedTimeSeconds: 0,
      initialTimeSeconds: 600,
      isActive,
      createdAt: new Date()
    });

    it('アクティブなプレイヤーが0人の場合は有効', () => {
      const players = [
        createPlayer('1', false),
        createPlayer('2', false),
        createPlayer('3', false),
        createPlayer('4', false)
      ];
      expect(GameStateValidator.validateActivePlayerCount(players)).toBe(true);
    });

    it('アクティブなプレイヤーが1人の場合は有効', () => {
      const players = [
        createPlayer('1', true),
        createPlayer('2', false),
        createPlayer('3', false),
        createPlayer('4', false)
      ];
      expect(GameStateValidator.validateActivePlayerCount(players)).toBe(true);
    });

    it('アクティブなプレイヤーが2人以上の場合は無効', () => {
      const players = [
        createPlayer('1', true),
        createPlayer('2', true),
        createPlayer('3', false),
        createPlayer('4', false)
      ];
      expect(GameStateValidator.validateActivePlayerCount(players)).toBe(false);
    });
  });

  describe('validateGameState', () => {
    const createValidGameState = (): GameState => ({
      players: [
        {
          id: '1',
          name: 'プレイヤー1',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: '2',
          name: 'プレイヤー2',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: '3',
          name: 'プレイヤー3',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: '4',
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
    });

    it('有効なGameStateは検証に成功', () => {
      const state = createValidGameState();
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('プレイヤー数が3人以下の場合は無効', () => {
      const state = createValidGameState();
      state.players = state.players.slice(0, 3);
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プレイヤー数は4〜6人の範囲でなければなりません');
    });

    it('プレイヤー数が7人以上の場合は無効', () => {
      const state = createValidGameState();
      state.players = [
        ...state.players,
        {
          id: '5',
          name: 'プレイヤー5',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: '6',
          name: 'プレイヤー6',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: '7',
          name: 'プレイヤー7',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        }
      ];
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プレイヤー数は4〜6人の範囲でなければなりません');
    });

    it('アクティブなプレイヤーが2人以上の場合は無効', () => {
      const state = createValidGameState();
      state.players[0].isActive = true;
      state.players[1].isActive = true;
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('アクティブなプレイヤーは最大1人でなければなりません');
    });

    it('経過時間が負の場合は無効', () => {
      const state = createValidGameState();
      state.players[0].elapsedTimeSeconds = -10;
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('経過時間が不正'))).toBe(true);
    });

    it('初期時間が0以下の場合は無効', () => {
      const state = createValidGameState();
      state.players[0].initialTimeSeconds = 0;
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('初期時間が不正'))).toBe(true);
    });

    it('activePlayerIdが存在しないプレイヤーIDの場合は無効', () => {
      const state = createValidGameState();
      state.activePlayerId = 'non-existent-id';
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('アクティブプレイヤーIDが存在しません');
    });

    it('activePlayerIdに対応するプレイヤーのisActiveがfalseの場合は無効', () => {
      const state = createValidGameState();
      state.activePlayerId = '1';
      state.players[0].isActive = false;
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('アクティブプレイヤーIDに対応するプレイヤーのisActiveがfalseです');
    });

    it('タイマーモードがcount-upの場合デフォルト値として有効', () => {
      const state = createValidGameState();
      state.timerMode = 'count-up';
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(true);
    });

    it('タイマーモードがcount-downの場合も有効', () => {
      const state = createValidGameState();
      state.timerMode = 'count-down';
      const result = GameStateValidator.validateGameState(state);
      expect(result.valid).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  GameStateValidator,
  TimeFormatter,
  DEFAULT_TIMER_MODE,
  DEFAULT_INITIAL_TIME_SECONDS,
  PLAYER_COUNT_MIN,
  PLAYER_COUNT_MAX,
  type GameState,
  type Player
} from '../GameState';

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
});

describe('TimeFormatter', () => {
  describe('formatElapsedTime', () => {
    it('0秒は00:00にフォーマット', () => {
      expect(TimeFormatter.formatElapsedTime(0)).toBe('00:00');
    });

    it('59秒は00:59にフォーマット', () => {
      expect(TimeFormatter.formatElapsedTime(59)).toBe('00:59');
    });

    it('60秒は01:00にフォーマット', () => {
      expect(TimeFormatter.formatElapsedTime(60)).toBe('01:00');
    });

    it('125秒は02:05にフォーマット', () => {
      expect(TimeFormatter.formatElapsedTime(125)).toBe('02:05');
    });

    it('3661秒は61:01にフォーマット', () => {
      expect(TimeFormatter.formatElapsedTime(3661)).toBe('61:01');
    });
  });

  describe('parseTimeString', () => {
    it('00:00は0秒にパース', () => {
      expect(TimeFormatter.parseTimeString('00:00')).toBe(0);
    });

    it('01:00は60秒にパース', () => {
      expect(TimeFormatter.parseTimeString('01:00')).toBe(60);
    });

    it('10:30は630秒にパース', () => {
      expect(TimeFormatter.parseTimeString('10:30')).toBe(630);
    });

    it('不正なフォーマットはエラー', () => {
      expect(() => TimeFormatter.parseTimeString('invalid')).toThrow('Invalid time format');
      expect(() => TimeFormatter.parseTimeString('1:2:3')).toThrow('Invalid time format');
    });

    it('非数値はエラー', () => {
      expect(() => TimeFormatter.parseTimeString('aa:bb')).toThrow('Invalid time format');
    });
  });
});

describe('Constants', () => {
  it('デフォルトタイマーモードはcount-up', () => {
    expect(DEFAULT_TIMER_MODE).toBe('count-up');
  });

  it('デフォルト初期時間は600秒（10分）', () => {
    expect(DEFAULT_INITIAL_TIME_SECONDS).toBe(600);
  });

  it('プレイヤー数最小値は4', () => {
    expect(PLAYER_COUNT_MIN).toBe(4);
  });

  it('プレイヤー数最大値は6', () => {
    expect(PLAYER_COUNT_MAX).toBe(6);
  });
});

describe('Type Definitions', () => {
  describe('GameState type', () => {
    it('pausedAtフィールドはnullableである', () => {
      const gameState: GameState = {
        players: [],
        activePlayerId: null,
        isPaused: false,
        timerMode: 'count-up',
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        pausedAt: null
      };
      expect(gameState.pausedAt).toBeNull();

      const pausedGameState: GameState = {
        ...gameState,
        pausedAt: new Date()
      };
      expect(pausedGameState.pausedAt).toBeInstanceOf(Date);
    });
  });

  describe('Player type', () => {
    it('turnStartedAtフィールドはnullableである', () => {
      const player: Player = {
        id: '1',
        name: 'Player 1',
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date(),
        turnStartedAt: null
      };
      expect(player.turnStartedAt).toBeNull();

      const activePlayer: Player = {
        ...player,
        turnStartedAt: new Date()
      };
      expect(activePlayer.turnStartedAt).toBeInstanceOf(Date);
    });
  });
});

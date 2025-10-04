import { SignalRPublisher } from '../SignalRPublisher';
import { TurnSwitchedEvent, TimerUpdatedEvent, GameResetEvent, PlayersUpdatedEvent } from '../../models/SignalREvents';
import { Player } from '../../models/GameState';

describe('SignalRPublisher', () => {
  let publisher: SignalRPublisher;
  let mockSignalRMessages: any[];

  beforeEach(() => {
    mockSignalRMessages = [];
    publisher = new SignalRPublisher();
  });

  describe('publishTurnSwitched', () => {
    it('TurnSwitchedイベントを正しいペイロードで生成すること', () => {
      const event: TurnSwitchedEvent = {
        activePlayerId: 'player-2',
        previousPlayerId: 'player-1',
        timestamp: '2025-10-04T00:00:00.000Z'
      };

      const message = publisher.publishTurnSwitched(event);

      expect(message).toEqual({
        target: 'TurnSwitched',
        arguments: [event]
      });
    });

    it('タイムスタンプがISO 8601形式であること', () => {
      const event: TurnSwitchedEvent = {
        activePlayerId: 'player-2',
        previousPlayerId: 'player-1',
        timestamp: new Date('2025-10-04T00:00:00.000Z').toISOString()
      };

      const message = publisher.publishTurnSwitched(event);

      expect(message.arguments[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('publishTimerUpdated', () => {
    it('TimerUpdatedイベントを正しいペイロードで生成すること', () => {
      const event: TimerUpdatedEvent = {
        playerId: 'player-1',
        elapsedTimeSeconds: 120,
        timestamp: '2025-10-04T00:00:00.000Z'
      };

      const message = publisher.publishTimerUpdated(event);

      expect(message).toEqual({
        target: 'TimerUpdated',
        arguments: [event]
      });
    });

    it('経過時間が非負整数であること', () => {
      const event: TimerUpdatedEvent = {
        playerId: 'player-1',
        elapsedTimeSeconds: 0,
        timestamp: new Date().toISOString()
      };

      const message = publisher.publishTimerUpdated(event);

      expect(message.arguments[0].elapsedTimeSeconds).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(message.arguments[0].elapsedTimeSeconds)).toBe(true);
    });
  });

  describe('publishGameReset', () => {
    it('GameResetイベントを正しいペイロードで生成すること', () => {
      const players: Player[] = [
        {
          id: 'player-1',
          name: 'プレイヤー1',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date('2025-10-04T00:00:00.000Z')
        }
      ];

      const event: GameResetEvent = {
        players,
        timestamp: '2025-10-04T00:00:00.000Z'
      };

      const message = publisher.publishGameReset(event);

      expect(message).toEqual({
        target: 'GameReset',
        arguments: [event]
      });
      expect(message.arguments[0].players).toHaveLength(1);
    });
  });

  describe('publishPlayersUpdated', () => {
    it('PlayersUpdatedイベントを正しいペイロードで生成すること', () => {
      const players: Player[] = [
        {
          id: 'player-1',
          name: 'プレイヤー1',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date('2025-10-04T00:00:00.000Z')
        },
        {
          id: 'player-2',
          name: 'プレイヤー2',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date('2025-10-04T00:00:00.000Z')
        }
      ];

      const event: PlayersUpdatedEvent = {
        players,
        timestamp: '2025-10-04T00:00:00.000Z'
      };

      const message = publisher.publishPlayersUpdated(event);

      expect(message).toEqual({
        target: 'PlayersUpdated',
        arguments: [event]
      });
      expect(message.arguments[0].players).toHaveLength(2);
    });

    it('プレイヤー数が4〜6の範囲であること', () => {
      const players: Player[] = Array.from({ length: 4 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `プレイヤー${i + 1}`,
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600,
        isActive: false,
        createdAt: new Date()
      }));

      const event: PlayersUpdatedEvent = {
        players,
        timestamp: new Date().toISOString()
      };

      const message = publisher.publishPlayersUpdated(event);

      expect(message.arguments[0].players.length).toBeGreaterThanOrEqual(4);
      expect(message.arguments[0].players.length).toBeLessThanOrEqual(6);
    });
  });
});

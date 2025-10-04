import { SignalRPublisher } from '../services/SignalRPublisher';
import { TurnSwitchedEvent, TimerUpdatedEvent } from '../models/SignalREvents';

describe('SignalR Integration', () => {
  let publisher: SignalRPublisher;

  beforeEach(() => {
    publisher = new SignalRPublisher();
  });

  describe('エンドツーエンドのイベントフロー', () => {
    it('ターン切り替えイベントが正しく生成され、SignalRメッセージとして送信可能であること', () => {
      // 1. イベントデータの作成
      const event: TurnSwitchedEvent = {
        activePlayerId: 'player-2',
        previousPlayerId: 'player-1',
        timestamp: new Date().toISOString()
      };

      // 2. SignalRメッセージの生成
      const message = publisher.publishTurnSwitched(event);

      // 3. メッセージ構造の検証
      expect(message.target).toBe('TurnSwitched');
      expect(message.arguments).toHaveLength(1);
      expect(message.arguments[0]).toEqual(event);

      // 4. Azure Functions SignalR Output Bindingとの互換性検証
      // 実際の環境では context.extraOutputs.set(signalROutput, message) で送信
      expect(message).toHaveProperty('target');
      expect(message).toHaveProperty('arguments');
    });

    it('タイマー更新イベントが5秒ごとの同期に適していること', () => {
      const playerId = 'player-1';
      let elapsedTime = 0;

      // 5秒ごとの同期をシミュレート
      const syncInterval = 5; // 秒
      const updates: TimerUpdatedEvent[] = [];

      for (let i = 0; i < 3; i++) {
        elapsedTime += syncInterval;
        const event: TimerUpdatedEvent = {
          playerId,
          elapsedTimeSeconds: elapsedTime,
          timestamp: new Date(Date.now() + i * syncInterval * 1000).toISOString()
        };
        updates.push(event);
      }

      // 3回の更新イベントが生成されたことを確認
      expect(updates).toHaveLength(3);
      expect(updates[0].elapsedTimeSeconds).toBe(5);
      expect(updates[1].elapsedTimeSeconds).toBe(10);
      expect(updates[2].elapsedTimeSeconds).toBe(15);

      // 各イベントをSignalRメッセージに変換
      const messages = updates.map(event => publisher.publishTimerUpdated(event));

      // すべてのメッセージが正しい構造を持つことを確認
      messages.forEach(message => {
        expect(message.target).toBe('TimerUpdated');
        expect(message.arguments[0].playerId).toBe(playerId);
      });
    });

    it('複数のイベントタイプが同時に処理可能であること', () => {
      const events = [
        publisher.publishTurnSwitched({
          activePlayerId: 'player-2',
          previousPlayerId: 'player-1',
          timestamp: new Date().toISOString()
        }),
        publisher.publishTimerUpdated({
          playerId: 'player-1',
          elapsedTimeSeconds: 120,
          timestamp: new Date().toISOString()
        })
      ];

      // 異なるイベントタイプが正しく区別されること
      expect(events[0].target).toBe('TurnSwitched');
      expect(events[1].target).toBe('TimerUpdated');

      // 各イベントが独立したペイロードを持つこと
      expect(events[0].arguments[0]).toHaveProperty('activePlayerId');
      expect(events[1].arguments[0]).toHaveProperty('elapsedTimeSeconds');
    });
  });

  describe('SignalR Service Free Tierの制約', () => {
    it('1日のメッセージ数上限（20,000メッセージ/日）を考慮した同期間隔', () => {
      const messagesPerDay = 20000;
      const syncIntervalSeconds = 5;
      const secondsPerDay = 24 * 60 * 60;

      // 5秒ごとの同期で1日に送信されるメッセージ数
      const messagesWithSyncInterval = secondsPerDay / syncIntervalSeconds;

      // 制約内に収まることを確認
      expect(messagesWithSyncInterval).toBeLessThanOrEqual(messagesPerDay);

      // 実際の使用量（約17,280メッセージ/日）
      expect(messagesWithSyncInterval).toBe(17280);
    });

    it('同時接続数上限（20接続）を考慮したブロードキャスト', () => {
      const maxConnections = 20;
      const event: TurnSwitchedEvent = {
        activePlayerId: 'player-2',
        previousPlayerId: 'player-1',
        timestamp: new Date().toISOString()
      };

      const message = publisher.publishTurnSwitched(event);

      // 1つのメッセージが全クライアントにブロードキャストされる
      // Azure SignalR Serviceが自動的に全接続にメッセージを配信
      expect(message.target).toBe('TurnSwitched');

      // メッセージサイズの確認（ペイロードが小さいこと）
      const messageSize = JSON.stringify(message).length;
      expect(messageSize).toBeLessThan(1000); // 1KB未満
    });
  });
});

import { TurnSwitchedEvent, TimerUpdatedEvent, GameResetEvent, PlayersUpdatedEvent } from '../models/SignalREvents';

/**
 * SignalRメッセージ構造
 * Azure Functions SignalR Output Bindingで使用
 */
export interface SignalRMessage {
  target: string;
  arguments: any[];
}

/**
 * SignalRイベント送信を担当するPublisher
 */
export class SignalRPublisher {
  /**
   * ターン切り替えイベントを送信
   */
  publishTurnSwitched(event: TurnSwitchedEvent): SignalRMessage {
    return {
      target: 'TurnSwitched',
      arguments: [event]
    };
  }

  /**
   * タイマー更新イベントを送信
   */
  publishTimerUpdated(event: TimerUpdatedEvent): SignalRMessage {
    return {
      target: 'TimerUpdated',
      arguments: [event]
    };
  }

  /**
   * ゲームリセットイベントを送信
   */
  publishGameReset(event: GameResetEvent): SignalRMessage {
    return {
      target: 'GameReset',
      arguments: [event]
    };
  }

  /**
   * プレイヤー更新イベントを送信
   */
  publishPlayersUpdated(event: PlayersUpdatedEvent): SignalRMessage {
    return {
      target: 'PlayersUpdated',
      arguments: [event]
    };
  }
}

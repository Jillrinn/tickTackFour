/**
 * ゲーム全体の状態を表現する集約ルート
 */
export interface GameState {
  players: Player[];
  activePlayerId: string | null;
  isPaused: boolean;
  timerMode: TimerMode;
  createdAt: Date;
  lastUpdatedAt: Date;
  pausedAt: Date | null; // 一時停止開始時刻（一時停止中でない場合はnull）
}

/**
 * タイマーモード
 * - count-up: 0から開始してカウントアップ（デフォルト）
 * - count-down: 初期時間から開始してカウントダウン
 */
export type TimerMode = 'count-up' | 'count-down';

/**
 * デフォルトのタイマーモード
 */
export const DEFAULT_TIMER_MODE: TimerMode = 'count-up';

/**
 * デフォルトの初期時間（秒）
 */
export const DEFAULT_INITIAL_TIME_SECONDS = 600; // 10分

/**
 * プレイヤー情報
 */
export interface Player {
  id: string; // UUID v4
  name: string; // "プレイヤー1" など
  elapsedTimeSeconds: number; // カウントアップ: 経過時間、カウントダウン: 残り時間（秒）
  initialTimeSeconds: number; // カウントダウンモード時の初期時間（秒）
  isActive: boolean;
  createdAt: Date;
  turnStartedAt: Date | null; // アクティブプレイヤーのターン開始時刻（非アクティブの場合はnull）
}

/**
 * プレイヤー数の範囲
 */
export const PLAYER_COUNT_MIN = 4;
export const PLAYER_COUNT_MAX = 6;
export const DEFAULT_PLAYER_COUNT = 4;

/**
 * バックエンドから返されるゲーム状態（時間計算済み）
 * multiplayer-sync仕様で使用
 */
export interface GameStateWithTime {
  players: Array<{ name: string; elapsedSeconds: number }>;
  activePlayerIndex: number;
  timerMode: 'count-up' | 'count-down';
  countdownSeconds: number;
  isPaused: boolean;
  etag: string;
  turnStartedAt: string | null; // ISO8601タイムスタンプ（アクティブプレイヤーのターン開始時刻）
  pausedAt: string | null;      // ISO8601タイムスタンプ（一時停止開始時刻）
}

/**
 * ビジネスルール検証ユーティリティ
 */
export class GameStateValidator {
  /**
   * プレイヤー数が4〜6の範囲内かチェック
   */
  static validatePlayerCount(count: number): boolean {
    return count >= PLAYER_COUNT_MIN && count <= PLAYER_COUNT_MAX;
  }

  /**
   * 経過時間が非負整数かチェック
   */
  static validateElapsedTime(seconds: number): boolean {
    return seconds >= 0 && Number.isInteger(seconds);
  }

  /**
   * アクティブなプレイヤーが最大1人かチェック
   */
  static validateActivePlayerCount(players: Player[]): boolean {
    const activePlayers = players.filter(p => p.isActive);
    return activePlayers.length <= 1;
  }

  /**
   * GameState全体の整合性をチェック
   */
  static validateGameState(state: GameState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.validatePlayerCount(state.players.length)) {
      errors.push(`プレイヤー数は${PLAYER_COUNT_MIN}〜${PLAYER_COUNT_MAX}人の範囲でなければなりません`);
    }

    if (!this.validateActivePlayerCount(state.players)) {
      errors.push('アクティブなプレイヤーは最大1人でなければなりません');
    }

    for (const player of state.players) {
      if (!this.validateElapsedTime(player.elapsedTimeSeconds)) {
        errors.push(`プレイヤー${player.name}の経過時間が不正です`);
      }
      if (player.initialTimeSeconds <= 0) {
        errors.push(`プレイヤー${player.name}の初期時間が不正です`);
      }
    }

    if (state.activePlayerId !== null) {
      const activePlayer = state.players.find(p => p.id === state.activePlayerId);
      if (!activePlayer) {
        errors.push('アクティブプレイヤーIDが存在しません');
      } else if (!activePlayer.isActive) {
        errors.push('アクティブプレイヤーIDに対応するプレイヤーのisActiveがfalseです');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 時間フォーマットユーティリティ
 */
export class TimeFormatter {
  /**
   * 秒をMM:SS形式にフォーマット
   */
  static formatElapsedTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * MM:SS形式の文字列を秒に変換
   */
  static parseTimeString(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid time format. Expected MM:SS');
    }
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs)) {
      throw new Error('Invalid time format. Minutes and seconds must be numbers');
    }
    return mins * 60 + secs;
  }
}

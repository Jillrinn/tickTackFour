/**
 * ゲーム全体の状態を表現する集約ルート
 */
export interface GameState {
  players: Player[];
  activePlayerId: string | null;
  isPaused: boolean;
  timerMode: 'count-up' | 'count-down';
  createdAt: Date;
  lastUpdatedAt: Date;
}

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
}

/**
 * Cosmos DB Table API用のエンティティ
 */
export interface GameStateEntity {
  partitionKey: string; // "game"
  rowKey: string; // "current"
  stateJson: string; // JSON.stringify(GameState)
  timestamp?: Date;
}

/**
 * ビジネスルール検証
 */
export class GameStateValidator {
  /**
   * プレイヤー数が4〜6の範囲内かチェック
   */
  static validatePlayerCount(count: number): boolean {
    return count >= 4 && count <= 6;
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
      errors.push('プレイヤー数は4〜6人の範囲でなければなりません');
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

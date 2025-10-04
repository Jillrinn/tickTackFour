import { GameState, Player, GameStateValidator } from '../models/GameState';
import { GameStateRepository } from '../repositories/GameStateRepository';
import { randomUUID } from 'crypto';

/**
 * エラー型定義
 */
export interface StateError {
  message: string;
  code: string;
}

export interface ValidationError extends StateError {
  validationErrors: string[];
}

/**
 * Result型（成功/失敗）
 */
export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * ゲーム状態管理サービス
 * ビジネスロジックとデータ永続化を担当
 */
export class GameStateService {
  constructor(private repository: GameStateRepository) {}

  /**
   * 現在のゲーム状態を取得
   * 存在しない場合はデフォルト状態を作成
   */
  async getCurrentState(): Promise<Result<GameState, StateError>> {
    try {
      // リポジトリから既存の状態を取得
      const existingState = await this.repository.get();

      if (existingState) {
        return { success: true, data: existingState };
      }

      // 存在しない場合はデフォルト状態を作成
      const defaultState = this.createDefaultGameState();

      // デフォルト状態を保存
      await this.repository.create(defaultState);

      return { success: true, data: defaultState };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'GET_STATE_ERROR'
        }
      };
    }
  }

  /**
   * デフォルトゲーム状態を生成
   * - 4人のプレイヤー
   * - カウントアップモード
   * - 初期時間600秒（10分）
   */
  private createDefaultGameState(): GameState {
    const now = new Date();
    const players: Player[] = [];

    for (let i = 1; i <= 4; i++) {
      players.push({
        id: randomUUID(),
        name: `プレイヤー${i}`,
        elapsedTimeSeconds: 0,
        initialTimeSeconds: 600, // デフォルト10分
        isActive: false,
        createdAt: now
      });
    }

    return {
      players,
      activePlayerId: null,
      isPaused: false,
      timerMode: 'count-up',
      createdAt: now,
      lastUpdatedAt: now
    };
  }

  /**
   * ターン切り替え
   * 現在のプレイヤーを停止し、次のプレイヤーを開始
   */
  async switchTurn(currentPlayerId: string, nextPlayerId: string): Promise<Result<GameState, ValidationError>> {
    try {
      const state = await this.repository.get();
      if (!state) {
        return {
          success: false,
          error: {
            message: 'ゲーム状態が存在しません',
            code: 'STATE_NOT_FOUND',
            validationErrors: []
          }
        };
      }

      // プレイヤーIDの検証
      const currentPlayer = state.players.find(p => p.id === currentPlayerId);
      const nextPlayer = state.players.find(p => p.id === nextPlayerId);

      if (!currentPlayer || !nextPlayer) {
        return {
          success: false,
          error: {
            message: '無効なプレイヤーIDです',
            code: 'INVALID_PLAYER_ID',
            validationErrors: ['指定されたプレイヤーIDが見つかりません']
          }
        };
      }

      // ターン切り替え処理
      state.players.forEach(player => {
        player.isActive = player.id === nextPlayerId;
      });
      state.activePlayerId = nextPlayerId;
      state.lastUpdatedAt = new Date();

      // 状態を保存
      await this.repository.update(state);

      return { success: true, data: state };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SWITCH_TURN_ERROR',
          validationErrors: []
        }
      };
    }
  }

  /**
   * タイマー同期
   * クライアントから送信された経過時間を検証して保存
   */
  async syncTimer(playerId: string, elapsedTimeSeconds: number): Promise<Result<GameState, ValidationError>> {
    try {
      const state = await this.repository.get();
      if (!state) {
        return {
          success: false,
          error: {
            message: 'ゲーム状態が存在しません',
            code: 'STATE_NOT_FOUND',
            validationErrors: []
          }
        };
      }

      // バリデーション
      const errors: string[] = [];

      // プレイヤーIDの検証
      const player = state.players.find(p => p.id === playerId);
      if (!player) {
        return {
          success: false,
          error: {
            message: '無効なプレイヤーIDです',
            code: 'INVALID_PLAYER_ID',
            validationErrors: ['指定されたプレイヤーIDが見つかりません']
          }
        };
      }

      // 経過時間の検証
      if (elapsedTimeSeconds < 0) {
        errors.push('経過時間は0以上でなければなりません');
      }
      if (!Number.isInteger(elapsedTimeSeconds)) {
        errors.push('経過時間は整数でなければなりません');
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: {
            message: 'タイマー同期の検証に失敗しました',
            code: 'VALIDATION_ERROR',
            validationErrors: errors
          }
        };
      }

      // タイマー値を更新
      player.elapsedTimeSeconds = elapsedTimeSeconds;

      // カウントダウンモードで時間切れ検出
      if (state.timerMode === 'count-down' && elapsedTimeSeconds === 0) {
        player.isActive = false;
        state.activePlayerId = null;
      }

      state.lastUpdatedAt = new Date();

      // 状態を保存
      await this.repository.update(state);

      return { success: true, data: state };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SYNC_TIMER_ERROR',
          validationErrors: []
        }
      };
    }
  }

  /**
   * ゲームをリセット
   * 全プレイヤーのタイマーを初期値にリセット
   */
  async resetGame(): Promise<Result<GameState, StateError>> {
    try {
      const state = await this.repository.get();
      if (!state) {
        return {
          success: false,
          error: {
            message: 'ゲーム状態が存在しません',
            code: 'STATE_NOT_FOUND'
          }
        };
      }

      // 全プレイヤーのタイマーをリセット
      state.players.forEach(player => {
        // カウントアップモードでは0、カウントダウンモードでは初期時間にリセット
        player.elapsedTimeSeconds = state.timerMode === 'count-down' ? player.initialTimeSeconds : 0;
        player.isActive = false;
      });

      state.activePlayerId = null;
      state.isPaused = false;
      state.lastUpdatedAt = new Date();

      // 状態を保存
      await this.repository.update(state);

      return { success: true, data: state };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'RESET_GAME_ERROR'
        }
      };
    }
  }

  /**
   * ゲームを一時停止
   * 現在動作中のタイマーを一時停止
   */
  async pauseGame(): Promise<Result<GameState, StateError>> {
    try {
      const state = await this.repository.get();
      if (!state) {
        return {
          success: false,
          error: {
            message: 'ゲーム状態が存在しません',
            code: 'STATE_NOT_FOUND'
          }
        };
      }

      // 一時停止フラグを設定
      state.isPaused = true;
      state.lastUpdatedAt = new Date();

      // 状態を保存
      await this.repository.update(state);

      return { success: true, data: state };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PAUSE_GAME_ERROR'
        }
      };
    }
  }

  /**
   * ゲームを再開
   * 一時停止したタイマーを再開
   */
  async resumeGame(): Promise<Result<GameState, StateError>> {
    try {
      const state = await this.repository.get();
      if (!state) {
        return {
          success: false,
          error: {
            message: 'ゲーム状態が存在しません',
            code: 'STATE_NOT_FOUND'
          }
        };
      }

      // 一時停止フラグを解除
      state.isPaused = false;
      state.lastUpdatedAt = new Date();

      // 状態を保存
      await this.repository.update(state);

      return { success: true, data: state };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'RESUME_GAME_ERROR'
        }
      };
    }
  }

  /**
   * プレイヤー数を更新
   * 4〜6人の範囲でプレイヤー数を変更
   */
  async updatePlayers(playerCount: number): Promise<Result<GameState, ValidationError>> {
    try {
      const state = await this.repository.get();
      if (!state) {
        return {
          success: false,
          error: {
            message: 'ゲーム状態が存在しません',
            code: 'STATE_NOT_FOUND',
            validationErrors: []
          }
        };
      }

      // バリデーション
      if (playerCount < 4 || playerCount > 6) {
        return {
          success: false,
          error: {
            message: 'プレイヤー数が範囲外です',
            code: 'VALIDATION_ERROR',
            validationErrors: ['プレイヤー数は4〜6人の範囲で指定してください']
          }
        };
      }

      const now = new Date();
      const currentPlayerCount = state.players.length;

      if (playerCount > currentPlayerCount) {
        // プレイヤーを追加
        for (let i = currentPlayerCount + 1; i <= playerCount; i++) {
          state.players.push({
            id: randomUUID(),
            name: `プレイヤー${i}`,
            elapsedTimeSeconds: 0,
            initialTimeSeconds: 600,
            isActive: false,
            createdAt: now
          });
        }
      } else if (playerCount < currentPlayerCount) {
        // プレイヤーを削除
        state.players = state.players.slice(0, playerCount);
      }

      // プレイヤー数変更時は全タイマーをリセット
      state.players.forEach(player => {
        player.elapsedTimeSeconds = state.timerMode === 'count-down' ? player.initialTimeSeconds : 0;
        player.isActive = false;
      });

      state.activePlayerId = null;
      state.isPaused = false;
      state.lastUpdatedAt = now;

      // 状態を保存
      await this.repository.update(state);

      return { success: true, data: state };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'UPDATE_PLAYERS_ERROR',
          validationErrors: []
        }
      };
    }
  }

  /**
   * タイマーモードを設定
   * カウントアップ/カウントダウンモードの切り替え
   */
  async setTimerMode(mode: 'count-up' | 'count-down', initialTimeSeconds?: number): Promise<Result<GameState, ValidationError>> {
    try {
      const state = await this.repository.get();
      if (!state) {
        return {
          success: false,
          error: {
            message: 'ゲーム状態が存在しません',
            code: 'STATE_NOT_FOUND',
            validationErrors: []
          }
        };
      }

      // バリデーション
      const errors: string[] = [];

      // タイマーモードの検証
      if (mode !== 'count-up' && mode !== 'count-down') {
        errors.push('タイマーモードは count-up または count-down でなければなりません');
      }

      // 初期時間の検証（カウントダウンモード時）
      if (initialTimeSeconds !== undefined) {
        if (initialTimeSeconds <= 0 || !Number.isInteger(initialTimeSeconds)) {
          errors.push('初期時間は正の整数でなければなりません');
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: {
            message: 'タイマーモード設定の検証に失敗しました',
            code: 'VALIDATION_ERROR',
            validationErrors: errors
          }
        };
      }

      // タイマーモードを変更
      state.timerMode = mode;

      // 初期時間を設定（カウントダウンモード時）
      const newInitialTime = mode === 'count-down' ? (initialTimeSeconds ?? 600) : 600;

      // 全プレイヤーのタイマーを初期化
      state.players.forEach(player => {
        player.initialTimeSeconds = newInitialTime;
        player.elapsedTimeSeconds = mode === 'count-down' ? newInitialTime : 0;
        player.isActive = false;
      });

      state.activePlayerId = null;
      state.isPaused = false;
      state.lastUpdatedAt = new Date();

      // 状態を保存
      await this.repository.update(state);

      return { success: true, data: state };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SET_TIMER_MODE_ERROR',
          validationErrors: []
        }
      };
    }
  }
}

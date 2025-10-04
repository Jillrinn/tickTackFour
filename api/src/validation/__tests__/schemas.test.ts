import {
  switchTurnSchema,
  updatePlayersSchema,
  syncTimerSchema,
  setTimerModeSchema,
} from '../schemas';

describe('API Input Validation Schemas', () => {
  describe('switchTurnSchema', () => {
    it('有効なswitch turnリクエストを受け入れる', () => {
      const validInput = {
        currentPlayerId: 'player-1',
        nextPlayerId: 'player-2',
      };
      const result = switchTurnSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('currentPlayerIdが欠けている場合はエラー', () => {
      const invalidInput = {
        nextPlayerId: 'player-2',
      };
      const result = switchTurnSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('nextPlayerIdが欠けている場合はエラー', () => {
      const invalidInput = {
        currentPlayerId: 'player-1',
      };
      const result = switchTurnSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('プレイヤーIDが空文字列の場合はエラー', () => {
      const invalidInput = {
        currentPlayerId: '',
        nextPlayerId: 'player-2',
      };
      const result = switchTurnSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('updatePlayersSchema', () => {
    it('有効なプレイヤー数(4-6)を受け入れる', () => {
      const validInputs = [{ playerCount: 4 }, { playerCount: 5 }, { playerCount: 6 }];

      validInputs.forEach(input => {
        const result = updatePlayersSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('プレイヤー数が4未満の場合はエラー', () => {
      const invalidInput = { playerCount: 3 };
      const result = updatePlayersSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('プレイヤー数が6超過の場合はエラー', () => {
      const invalidInput = { playerCount: 7 };
      const result = updatePlayersSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('playerCountが欠けている場合はエラー', () => {
      const invalidInput = {};
      const result = updatePlayersSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('playerCountが整数でない場合はエラー', () => {
      const invalidInput = { playerCount: 4.5 };
      const result = updatePlayersSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('syncTimerSchema', () => {
    it('有効なタイマー同期リクエストを受け入れる', () => {
      const validInput = {
        playerId: 'player-1',
        elapsedTimeSeconds: 123,
      };
      const result = syncTimerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('elapsedTimeSecondsが0の場合も受け入れる', () => {
      const validInput = {
        playerId: 'player-1',
        elapsedTimeSeconds: 0,
      };
      const result = syncTimerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('playerIdが欠けている場合はエラー', () => {
      const invalidInput = {
        elapsedTimeSeconds: 123,
      };
      const result = syncTimerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('elapsedTimeSecondsが負数の場合はエラー', () => {
      const invalidInput = {
        playerId: 'player-1',
        elapsedTimeSeconds: -1,
      };
      const result = syncTimerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('elapsedTimeSecondsが整数でない場合はエラー', () => {
      const invalidInput = {
        playerId: 'player-1',
        elapsedTimeSeconds: 123.45,
      };
      const result = syncTimerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('setTimerModeSchema', () => {
    it('有効なカウントアップモード設定を受け入れる', () => {
      const validInput = {
        mode: 'count-up',
      };
      const result = setTimerModeSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('有効なカウントダウンモード設定(初期時間指定)を受け入れる', () => {
      const validInput = {
        mode: 'count-down',
        initialTimeSeconds: 600,
      };
      const result = setTimerModeSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('カウントダウンモードでinitialTimeSecondsを省略した場合もデフォルト値で受け入れる', () => {
      const validInput = {
        mode: 'count-down',
      };
      const result = setTimerModeSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.initialTimeSeconds).toBe(600); // デフォルト値
      }
    });

    it('無効なmodeの場合はエラー', () => {
      const invalidInput = {
        mode: 'invalid-mode',
      };
      const result = setTimerModeSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('initialTimeSecondsが0以下の場合はエラー', () => {
      const invalidInput = {
        mode: 'count-down',
        initialTimeSeconds: 0,
      };
      const result = setTimerModeSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('initialTimeSecondsが整数でない場合はエラー', () => {
      const invalidInput = {
        mode: 'count-down',
        initialTimeSeconds: 60.5,
      };
      const result = setTimerModeSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});

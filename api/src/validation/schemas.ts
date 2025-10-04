import { z } from 'zod';

/**
 * switchTurn APIリクエストのバリデーションスキーマ
 */
export const switchTurnSchema = z.object({
  currentPlayerId: z.string().min(1, '現在のプレイヤーIDは必須です'),
  nextPlayerId: z.string().min(1, '次のプレイヤーIDは必須です'),
});

/**
 * updatePlayers APIリクエストのバリデーションスキーマ
 */
export const updatePlayersSchema = z.object({
  playerCount: z
    .number()
    .int('プレイヤー数は整数である必要があります')
    .min(4, 'プレイヤー数は4人以上である必要があります')
    .max(6, 'プレイヤー数は6人以下である必要があります'),
});

/**
 * syncTimer APIリクエストのバリデーションスキーマ
 */
export const syncTimerSchema = z.object({
  playerId: z.string().min(1, 'プレイヤーIDは必須です'),
  elapsedTimeSeconds: z
    .number()
    .int('経過時間は整数である必要があります')
    .nonnegative('経過時間は0以上である必要があります'),
});

/**
 * setTimerMode APIリクエストのバリデーションスキーマ
 */
export const setTimerModeSchema = z.object({
  mode: z.enum(['count-up', 'count-down'], {
    message: 'モードはcount-upまたはcount-downである必要があります',
  }),
  initialTimeSeconds: z
    .number()
    .int('初期時間は整数である必要があります')
    .positive('初期時間は正の数である必要があります')
    .optional()
    .default(600),
});

// 型エクスポート
export type SwitchTurnInput = z.infer<typeof switchTurnSchema>;
export type UpdatePlayersInput = z.infer<typeof updatePlayersSchema>;
export type SyncTimerInput = z.infer<typeof syncTimerSchema>;
export type SetTimerModeInput = z.infer<typeof setTimerModeSchema>;

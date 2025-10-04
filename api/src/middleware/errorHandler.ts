import { HttpResponseInit } from '@azure/functions';
import { z } from 'zod';

/**
 * カスタムエラー基底クラス
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * バリデーションエラー (400 Bad Request)
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

/**
 * ビジネスロジックエラー (422 Unprocessable Entity)
 */
export class BusinessError extends AppError {
  constructor(message: string) {
    super(422, message);
  }
}

/**
 * Zodスキーマによる入力バリデーション
 */
export function handleValidation<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { success: true; data: T } | { success: false; error: ValidationError } {
  const result = schema.safeParse(input);

  if (!result.success) {
    const errorMessages = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    return {
      success: false,
      error: new ValidationError(`バリデーションエラー: ${errorMessages}`),
    };
  }

  return { success: true, data: result.data };
}

/**
 * エラーをHTTPレスポンスに変換
 */
export function handleError(error: unknown): HttpResponseInit {
  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      jsonBody: {
        error: error.name,
        message: error.message,
      },
    };
  }

  if (error instanceof Error) {
    // 予期しないエラーの場合は詳細を隠蔽
    console.error('Unhandled error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'InternalServerError',
        message: '予期しないエラーが発生しました',
      },
    };
  }

  // unknown型のエラー
  console.error('Unknown error:', error);
  return {
    status: 500,
    jsonBody: {
      error: 'InternalServerError',
      message: '予期しないエラーが発生しました',
    },
  };
}

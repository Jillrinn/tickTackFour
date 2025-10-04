import { HttpRequest, InvocationContext } from '@azure/functions';
import { handleValidation, handleError, ValidationError, BusinessError } from '../errorHandler';
import { z } from 'zod';

describe('Error Handling Middleware', () => {
  describe('handleValidation', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      count: z.number().int().min(1).max(10),
    });

    it('有効な入力の場合は検証済みデータを返す', () => {
      const validInput = { name: 'test', count: 5 };
      const result = handleValidation(testSchema, validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('無効な入力の場合はValidationErrorを返す', () => {
      const invalidInput = { name: '', count: 15 };
      const result = handleValidation(testSchema, invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.statusCode).toBe(400);
        expect(result.error.message).toContain('バリデーションエラー');
      }
    });

    it('フィールド欠損の場合もValidationErrorを返す', () => {
      const invalidInput = { name: 'test' };
      const result = handleValidation(testSchema, invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });
  });

  describe('handleError', () => {
    it('ValidationErrorの場合は400レスポンスを返す', () => {
      const error = new ValidationError('テストエラー');
      const response = handleError(error);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        error: 'ValidationError',
        message: 'テストエラー',
      });
    });

    it('BusinessErrorの場合は422レスポンスを返す', () => {
      const error = new BusinessError('ビジネスルール違反');
      const response = handleError(error);

      expect(response.status).toBe(422);
      expect(response.jsonBody).toEqual({
        error: 'BusinessError',
        message: 'ビジネスルール違反',
      });
    });

    it('その他のErrorの場合は500レスポンスを返す', () => {
      const error = new Error('予期しないエラー');
      const response = handleError(error);

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        error: 'InternalServerError',
        message: '予期しないエラーが発生しました',
      });
    });

    it('unknownタイプのエラーの場合も500レスポンスを返す', () => {
      const error = 'string error';
      const response = handleError(error);

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        error: 'InternalServerError',
        message: '予期しないエラーが発生しました',
      });
    });
  });

  describe('Custom Error Classes', () => {
    it('ValidationErrorは正しいステータスコードとメッセージを持つ', () => {
      const error = new ValidationError('テストメッセージ');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('テストメッセージ');
      expect(error.name).toBe('ValidationError');
    });

    it('BusinessErrorは正しいステータスコードとメッセージを持つ', () => {
      const error = new BusinessError('テストメッセージ');
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('テストメッセージ');
      expect(error.name).toBe('BusinessError');
    });
  });
});

/**
 * Azure SDK エラーの型定義
 * @azure/data-tables からのエラーは statusCode プロパティを持つことがある
 */
export interface AzureErrorWithStatusCode {
  statusCode?: number;
  message: string;
}

/**
 * エラーが statusCode プロパティを持つかチェックする型ガード
 */
export function hasStatusCode(error: unknown): error is AzureErrorWithStatusCode {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as any).statusCode === 'number'
  );
}

/**
 * エラーが指定されたステータスコードを持つかチェック
 */
export function hasStatusCodeValue(error: unknown, statusCode: number): boolean {
  return hasStatusCode(error) && error.statusCode === statusCode;
}

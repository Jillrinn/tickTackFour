import { useCallback, useRef } from 'react';

/**
 * useFetchWithTimeoutのオプション
 */
export interface UseFetchWithTimeoutOptions {
  /** タイムアウト時間（ミリ秒）デフォルト: 5000ms */
  timeout?: number;
  /** 再試行回数（デフォルト: 0 = 再試行なし） */
  retry?: number;
}

/**
 * タイムアウトと再試行機能を持つfetchフック
 *
 * Task 4.2: ネットワークエラーとタイムアウトハンドリングの実装
 * - fetchタイムアウト設定（5秒デフォルト）
 * - AbortControllerを使用したリクエストキャンセル
 * - ネットワークエラー時のエラーメッセージ表示
 * - 再試行ロジック（指数バックオフ対応準備）
 * - エラー詳細のログ出力（Application Insights連携準備）
 */
export function useFetchWithTimeout(options: UseFetchWithTimeoutOptions = {}) {
  const { timeout = 5000, retry = 0 } = options;
  const optionsRef = useRef({ timeout, retry });
  optionsRef.current = { timeout, retry };

  const fetchWithTimeout = useCallback(async (
    url: string,
    init?: RequestInit,
    attemptCount = 0
  ): Promise<Response> => {
    const controller = new AbortController();
    const { timeout: currentTimeout, retry: maxRetries } = optionsRef.current;

    // タイムアウトタイマーを設定
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`[FetchWithTimeout] Request timeout after ${currentTimeout}ms: ${url}`);
    }, currentTimeout);

    try {
      // AbortController.signalをfetchに渡す
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });

      // タイムアウトタイマーをクリア
      clearTimeout(timeoutId);

      // HTTPエラーをチェック
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        console.error(`[FetchWithTimeout] HTTP error:`, {
          url,
          status: response.status,
          statusText: response.statusText
        });
        throw error;
      }

      return response;
    } catch (error) {
      // タイムアウトタイマーをクリア
      clearTimeout(timeoutId);

      // AbortErrorの場合はタイムアウトエラーに変換
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${currentTimeout}ms`);
        console.error(`[FetchWithTimeout] Timeout error:`, {
          url,
          timeout: currentTimeout,
          attempt: attemptCount + 1
        });

        // 再試行ロジック
        if (attemptCount < maxRetries) {
          console.log(`[FetchWithTimeout] Retrying... (${attemptCount + 1}/${maxRetries})`);
          return fetchWithTimeout(url, init, attemptCount + 1);
        }

        throw timeoutError;
      }

      // その他のネットワークエラー
      console.error(`[FetchWithTimeout] Network error:`, {
        url,
        error: error instanceof Error ? error.message : String(error),
        attempt: attemptCount + 1
      });

      // 再試行ロジック
      if (attemptCount < maxRetries) {
        console.log(`[FetchWithTimeout] Retrying... (${attemptCount + 1}/${maxRetries})`);
        return fetchWithTimeout(url, init, attemptCount + 1);
      }

      throw error;
    }
  }, []);

  return { fetchWithTimeout };
}

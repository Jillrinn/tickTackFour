import { useState, useRef } from 'react';

/**
 * PlayerNameResponse型定義（GET /api/player-namesのレスポンス）
 */
interface PlayerNameResponse {
  name: string;
  createdAt: string;
}

/**
 * usePlayerNameHistory戻り値の型定義
 */
export interface UsePlayerNameHistoryReturn {
  names: string[];                        // 履歴名前配列
  isLoading: boolean;                     // ローディング状態
  error: Error | null;                    // エラー状態
  fetchNames: () => Promise<void>;        // 履歴取得関数
  saveNames: (names: string[]) => Promise<void>;  // 名前保存関数（Task 6.2で実装）
}

/**
 * デフォルトプレイヤー名のパターン（プレイヤー1、プレイヤー2、...、プレイヤー10）
 */
const DEFAULT_PLAYER_NAME_PATTERN = /^プレイヤー([1-9]|10)$/;

/**
 * デフォルト名を除外する関数
 */
function filterDefaultNames(names: string[]): string[] {
  return names.filter(name => !DEFAULT_PLAYER_NAME_PATTERN.test(name));
}

/**
 * usePlayerNameHistory
 *
 * プレイヤー名履歴の取得・保存を管理するカスタムフック
 *
 * Task 6.1: 基本的な取得機能
 * - セッションキャッシュ状態管理（useState）
 * - GET /api/player-namesを呼び出す関数
 * - キャッシュヒット時の即座返却ロジック
 * - キャッシュミス時のAPI呼び出しとキャッシュ保存
 *
 * Task 6.2: 保存機能とデバウンス処理
 * - POST /api/player-namesを呼び出す関数
 * - 3秒間隔のデバウンス処理
 * - デフォルト名（「プレイヤー1」等）の除外フィルタ
 * - バックグラウンド保存（UI通知なし）
 */
export function usePlayerNameHistory(): UsePlayerNameHistoryReturn {
  const [cache, setCache] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * fetchNames
   *
   * プレイヤー名履歴を取得する関数
   * - キャッシュがある場合は即座に返却（API呼び出しなし）
   * - キャッシュがない場合はGET /api/player-namesを呼び出し
   * - 5秒タイムアウト処理（AbortController使用）
   */
  const fetchNames = async (): Promise<void> => {
    // キャッシュがある場合は何もしない
    if (cache !== null) {
      return;
    }

    setIsLoading(true);
    setError(null);

    // 5秒タイムアウト処理のためのAbortController
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      const response = await fetch('/api/player-names', {
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PlayerNameResponse[] = await response.json();
      const nameList = data.map((item) => item.name);

      setCache(nameList);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setCache([]); // エラー時は空配列をキャッシュ
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  /**
   * saveNames
   *
   * プレイヤー名を保存する関数
   * - デフォルト名を除外してからPOST
   * - 3秒間隔のデバウンス処理
   * - バックグラウンド保存（UI通知なし）
   * - 5秒タイムアウト処理（AbortController使用）
   */
  const saveNames = async (names: string[]): Promise<void> => {
    // デフォルト名を除外
    const filteredNames = filterDefaultNames(names);

    // デフォルト名のみの場合はAPI呼び出しをスキップ
    if (filteredNames.length === 0) {
      return;
    }

    // 既存のデバウンスタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 3秒後にAPI呼び出しを実行
    debounceTimerRef.current = setTimeout(async () => {
      // 5秒タイムアウト処理のためのAbortController
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5000);

      try {
        const response = await fetch('/api/player-names', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ names: filteredNames }),
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 成功時は何もしない（バックグラウンド保存）
      } catch (err) {
        // エラー時はコンソールに記録するのみ（UI通知なし）
        console.error('プレイヤー名の保存に失敗しました:', err);
      } finally {
        clearTimeout(timeoutId);
      }
    }, 3000);
  };

  return {
    names: cache ?? [],
    isLoading,
    error,
    fetchNames,
    saveNames
  };
}

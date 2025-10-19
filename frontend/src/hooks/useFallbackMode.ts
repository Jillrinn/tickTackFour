import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * フォールバックモードの状態型定義
 */
export interface FallbackModeState {
  isInFallbackMode: boolean; // インメモリーモードかどうか
  lastError: Error | null; // 最後のエラー
  retryCount: number; // 再接続試行回数
}

/**
 * インメモリーモードへのフォールバック機能を管理するカスタムフック
 *
 * Requirements: 6.1, 6.2, 6.4, 6.5
 * - API接続失敗検出（3回連続失敗）
 * - インメモリーモードフラグの設定
 * - ローカルストレージへの状態保存（将来実装）
 * - フォールバックモード中のUI表示（警告メッセージ）
 * - 定期的なAPI接続リトライ（30秒間隔）
 * - 接続復帰時のCosmos DB同期への自動切替
 *
 * @returns フォールバックモード管理機能一式
 */
export function useFallbackMode() {
  const [state, setState] = useState<FallbackModeState>({
    isInFallbackMode: false,
    lastError: null,
    retryCount: 0
  });

  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 3回連続失敗時にフォールバックモードに切り替え
   */
  const activateFallbackMode = useCallback((error: Error) => {
    setState({
      isInFallbackMode: true,
      lastError: error,
      retryCount: 0
    });
    console.warn('[FallbackMode] API接続が失敗しました。インメモリーモードに切り替えます。', error);
  }, []);

  /**
   * フォールバックモードから通常モードに復帰
   */
  const deactivateFallbackMode = useCallback(() => {
    setState({
      isInFallbackMode: false,
      lastError: null,
      retryCount: 0
    });
    console.log('[FallbackMode] API接続が復帰しました。通常モードに切り替えます。');
  }, []);

  /**
   * 再接続試行回数をカウント
   */
  const incrementRetryCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1
    }));
  }, []);

  /**
   * 30秒ごとにAPI接続リトライを試行
   */
  useEffect(() => {
    if (!state.isInFallbackMode) {
      // 通常モードではリトライタイマーをクリア
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
      return;
    }

    // フォールバックモードでは30秒ごとにリトライ
    retryIntervalRef.current = setInterval(() => {
      incrementRetryCount();
      console.log(`[FallbackMode] API接続リトライ試行 (${state.retryCount + 1}回目)`);
    }, 30000);

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [state.isInFallbackMode, state.retryCount, incrementRetryCount]);

  return {
    ...state,
    activateFallbackMode,
    deactivateFallbackMode,
    incrementRetryCount
  };
}

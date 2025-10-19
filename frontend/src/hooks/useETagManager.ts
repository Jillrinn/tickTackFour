import { useState, useCallback } from 'react';

/**
 * useETagManagerの戻り値
 */
export interface UseETagManagerResult {
  etag: string | null; // 現在のETag
  updateEtag: (newEtag: string) => void; // ETag更新関数
  isConflict: (statusCode: number) => boolean; // 412競合検出関数
  conflictMessage: string | null; // 競合エラーメッセージ
  setConflictMessage: (message: string) => void; // エラーメッセージ設定関数
  clearConflictMessage: () => void; // エラーメッセージクリア関数
  showReloadPrompt: boolean; // リロード促進表示フラグ
  setShowReloadPrompt: (show: boolean) => void; // リロード促進フラグ設定関数
}

/**
 * ETag管理と楽観的ロック対応のカスタムフック
 *
 * Requirements: 3.1, 3.4
 * - レスポンスからETagを抽出してuseStateで保持
 * - POSTリクエスト送信時にETagをヘッダーまたはボディに含める
 * - 412 Conflictレスポンス検出
 * - 自動再試行ロジック（フロントエンド側は手動リロード促進のみ）
 *
 * @returns ETag管理機能一式
 */
export function useETagManager(): UseETagManagerResult {
  // 現在のETag
  const [etag, setEtag] = useState<string | null>(null);

  // 競合エラーメッセージ
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // リロード促進表示フラグ
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  /**
   * ETagを更新
   */
  const updateEtag = useCallback((newEtag: string) => {
    setEtag(newEtag);
  }, []);

  /**
   * HTTP 412 Conflict（楽観的ロック競合）を検出
   */
  const isConflict = useCallback((statusCode: number): boolean => {
    return statusCode === 412;
  }, []);

  /**
   * 競合エラーメッセージをクリア
   */
  const clearConflictMessage = useCallback(() => {
    setConflictMessage(null);
  }, []);

  return {
    etag,
    updateEtag,
    isConflict,
    conflictMessage,
    setConflictMessage,
    clearConflictMessage,
    showReloadPrompt,
    setShowReloadPrompt
  };
}

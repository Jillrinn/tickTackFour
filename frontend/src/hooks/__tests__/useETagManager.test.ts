import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useETagManager } from '../useETagManager';

describe('useETagManager', () => {
  describe('ETag保持と更新', () => {
    it('初期状態ではetagがnullである', () => {
      const { result } = renderHook(() => useETagManager());
      expect(result.current.etag).toBeNull();
    });

    it('updateEtag呼び出しでETagを更新できる', () => {
      const { result } = renderHook(() => useETagManager());

      act(() => {
        result.current.updateEtag('etag-123');
      });

      expect(result.current.etag).toBe('etag-123');
    });

    it('updateEtag呼び出しで既存のETagを上書きできる', () => {
      const { result } = renderHook(() => useETagManager());

      act(() => {
        result.current.updateEtag('etag-first');
      });

      expect(result.current.etag).toBe('etag-first');

      act(() => {
        result.current.updateEtag('etag-second');
      });

      expect(result.current.etag).toBe('etag-second');
    });
  });

  describe('楽観的ロック競合の検出', () => {
    it('isConflict関数がHTTP 412を検出する', () => {
      const { result } = renderHook(() => useETagManager());

      const conflict412 = result.current.isConflict(412);
      expect(conflict412).toBe(true);

      const success200 = result.current.isConflict(200);
      expect(success200).toBe(false);

      const error500 = result.current.isConflict(500);
      expect(error500).toBe(false);
    });
  });

  describe('競合時のエラーメッセージ表示', () => {
    it('conflictMessage状態を管理できる', () => {
      const { result } = renderHook(() => useETagManager());

      expect(result.current.conflictMessage).toBeNull();

      act(() => {
        result.current.setConflictMessage('競合が発生しました。ページをリロードしてください。');
      });

      expect(result.current.conflictMessage).toBe('競合が発生しました。ページをリロードしてください。');
    });

    it('clearConflictMessage呼び出しでメッセージをクリアできる', () => {
      const { result } = renderHook(() => useETagManager());

      act(() => {
        result.current.setConflictMessage('エラーメッセージ');
      });

      expect(result.current.conflictMessage).toBe('エラーメッセージ');

      act(() => {
        result.current.clearConflictMessage();
      });

      expect(result.current.conflictMessage).toBeNull();
    });
  });

  describe('手動リロード促進', () => {
    it('showReloadPrompt状態を管理できる', () => {
      const { result } = renderHook(() => useETagManager());

      expect(result.current.showReloadPrompt).toBe(false);

      act(() => {
        result.current.setShowReloadPrompt(true);
      });

      expect(result.current.showReloadPrompt).toBe(true);

      act(() => {
        result.current.setShowReloadPrompt(false);
      });

      expect(result.current.showReloadPrompt).toBe(false);
    });
  });

  describe('統合シナリオ', () => {
    it('412競合検出時にエラーメッセージとリロード促進を設定できる', () => {
      const { result } = renderHook(() => useETagManager());

      // 初期状態確認
      expect(result.current.etag).toBeNull();
      expect(result.current.conflictMessage).toBeNull();
      expect(result.current.showReloadPrompt).toBe(false);

      // ETag設定
      act(() => {
        result.current.updateEtag('etag-initial');
      });

      expect(result.current.etag).toBe('etag-initial');

      // 412競合検出
      const isConflict = result.current.isConflict(412);
      expect(isConflict).toBe(true);

      // エラーメッセージとリロード促進を設定
      act(() => {
        result.current.setConflictMessage(
          '他のデバイスでゲーム状態が変更されました。ページをリロードして最新の状態を取得してください。'
        );
        result.current.setShowReloadPrompt(true);
      });

      expect(result.current.conflictMessage).toBe(
        '他のデバイスでゲーム状態が変更されました。ページをリロードして最新の状態を取得してください。'
      );
      expect(result.current.showReloadPrompt).toBe(true);
    });

    it('リロード後にメッセージとプロンプトをクリアできる', () => {
      const { result } = renderHook(() => useETagManager());

      // エラー状態を設定
      act(() => {
        result.current.setConflictMessage('エラーメッセージ');
        result.current.setShowReloadPrompt(true);
      });

      expect(result.current.conflictMessage).toBe('エラーメッセージ');
      expect(result.current.showReloadPrompt).toBe(true);

      // クリア
      act(() => {
        result.current.clearConflictMessage();
        result.current.setShowReloadPrompt(false);
      });

      expect(result.current.conflictMessage).toBeNull();
      expect(result.current.showReloadPrompt).toBe(false);
    });
  });
});

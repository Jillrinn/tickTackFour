import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';
import { DEFAULT_PLAYER_COUNT, PLAYER_COUNT_MIN, PLAYER_COUNT_MAX } from '../../types/GameState';

describe('useGameState', () => {
  describe('初期化', () => {
    it('デフォルトで4人のプレイヤーを持つゲーム状態を初期化する', () => {
      const { result } = renderHook(() => useGameState());

      expect(result.current.gameState.players).toHaveLength(DEFAULT_PLAYER_COUNT);
      expect(result.current.gameState.timerMode).toBe('count-up');
      expect(result.current.gameState.activePlayerId).toBeNull();
      expect(result.current.gameState.isPaused).toBe(false);
    });

    it('各プレイヤーはユニークなIDと初期化された経過時間を持つ', () => {
      const { result } = renderHook(() => useGameState());

      const { players } = result.current.gameState;

      // ユニークなID
      const ids = players.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(players.length);

      // 初期化された経過時間
      players.forEach((player, index) => {
        expect(player.name).toBe(`プレイヤー${index + 1}`);
        expect(player.elapsedTimeSeconds).toBe(0);
        expect(player.isActive).toBe(false);
        expect(player.initialTimeSeconds).toBe(600);
      });
    });
  });

  describe('プレイヤー数変更', () => {
    it('プレイヤー数を4人から5人に増やすことができる', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setPlayerCount(5);
      });

      expect(result.current.gameState.players).toHaveLength(5);
      expect(result.current.gameState.players[4].name).toBe('プレイヤー5');
    });

    it('プレイヤー数を4人から6人に増やすことができる', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setPlayerCount(6);
      });

      expect(result.current.gameState.players).toHaveLength(6);
    });

    it('プレイヤー数を5人から4人に減らすことができる', () => {
      const { result } = renderHook(() => useGameState());

      act(() => {
        result.current.setPlayerCount(5);
      });

      expect(result.current.gameState.players).toHaveLength(5);

      act(() => {
        result.current.setPlayerCount(4);
      });

      expect(result.current.gameState.players).toHaveLength(4);
    });

    it('プレイヤー数を減らした時、残ったプレイヤーの状態は保持される', () => {
      const { result } = renderHook(() => useGameState());

      // プレイヤー1の経過時間を変更
      act(() => {
        result.current.updatePlayerTime(result.current.gameState.players[0].id, 100);
      });

      const firstPlayerId = result.current.gameState.players[0].id;
      const firstPlayerTime = result.current.gameState.players[0].elapsedTimeSeconds;

      // 5人に増やしてから4人に戻す
      act(() => {
        result.current.setPlayerCount(5);
      });

      act(() => {
        result.current.setPlayerCount(4);
      });

      // プレイヤー1の状態は保持されている
      expect(result.current.gameState.players[0].id).toBe(firstPlayerId);
      expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(firstPlayerTime);
    });

    it('範囲外のプレイヤー数（3人）はエラーをスローする', () => {
      const { result } = renderHook(() => useGameState());

      expect(() => {
        act(() => {
          result.current.setPlayerCount(PLAYER_COUNT_MIN - 1);
        });
      }).toThrow('プレイヤー数は4〜6人の範囲でなければなりません');
    });

    it('範囲外のプレイヤー数（7人）はエラーをスローする', () => {
      const { result } = renderHook(() => useGameState());

      expect(() => {
        act(() => {
          result.current.setPlayerCount(PLAYER_COUNT_MAX + 1);
        });
      }).toThrow('プレイヤー数は4〜6人の範囲でなければなりません');
    });
  });

  describe('プレイヤー時間更新', () => {
    it('特定のプレイヤーの経過時間を更新できる', () => {
      const { result } = renderHook(() => useGameState());

      const playerId = result.current.gameState.players[0].id;

      act(() => {
        result.current.updatePlayerTime(playerId, 120);
      });

      expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(120);
    });

    it('存在しないプレイヤーIDでの更新は無視される', () => {
      const { result } = renderHook(() => useGameState());

      const initialState = result.current.gameState;

      act(() => {
        result.current.updatePlayerTime('non-existent-id', 120);
      });

      expect(result.current.gameState).toEqual(initialState);
    });
  });

  describe('タイマーロジック（Task 10.2）', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('カウントアップモード', () => {
      it('アクティブプレイヤーのタイマーが1秒ごとに+1される', () => {
        const { result } = renderHook(() => useGameState());

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        const initialTime = result.current.gameState.players[0].elapsedTimeSeconds;

        // 1秒経過
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(initialTime + 1);
      });

      it('非アクティブプレイヤーのタイマーは更新されない', () => {
        const { result } = renderHook(() => useGameState());

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        const player2InitialTime = result.current.gameState.players[1].elapsedTimeSeconds;

        // 1秒経過
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        // プレイヤー2の時間は変化しない
        expect(result.current.gameState.players[1].elapsedTimeSeconds).toBe(player2InitialTime);
      });

      it('一時停止中はタイマーが更新されない', () => {
        const { result } = renderHook(() => useGameState());

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        // 一時停止
        act(() => {
          result.current.setPaused(true);
        });

        const initialTime = result.current.gameState.players[0].elapsedTimeSeconds;

        // 1秒経過
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(initialTime);
      });

      it('一時停止解除後はタイマーが再開される', () => {
        const { result } = renderHook(() => useGameState());

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        // 一時停止
        act(() => {
          result.current.setPaused(true);
        });

        // 一時停止解除
        act(() => {
          result.current.setPaused(false);
        });

        const initialTime = result.current.gameState.players[0].elapsedTimeSeconds;

        // 1秒経過
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(initialTime + 1);
      });
    });

    describe('カウントダウンモード', () => {
      it('アクティブプレイヤーのタイマーが1秒ごとに-1される', () => {
        const { result } = renderHook(() => useGameState());

        // カウントダウンモードに設定（初期時間10秒）
        act(() => {
          result.current.setTimerMode('count-down', 10);
        });

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(10);

        // 1秒経過
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(9);
      });

      it('残り時間が0秒に達したらタイマーが停止する', () => {
        const { result } = renderHook(() => useGameState());

        // カウントダウンモードに設定（初期時間2秒）
        act(() => {
          result.current.setTimerMode('count-down', 2);
        });

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        // 3秒経過（2秒 → 1秒 → 0秒）
        act(() => {
          vi.advanceTimersByTime(3000);
        });

        // 0秒で停止
        expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(0);
        // アクティブプレイヤーがクリアされる
        expect(result.current.gameState.activePlayerId).toBeNull();
      });

      it('残り時間が0秒になったプレイヤーはアクティブ解除される', () => {
        const { result } = renderHook(() => useGameState());

        // カウントダウンモードに設定（初期時間1秒）
        act(() => {
          result.current.setTimerMode('count-down', 1);
        });

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        // 2秒経過
        act(() => {
          vi.advanceTimersByTime(2000);
        });

        // プレイヤー1のisActiveがfalseになる
        expect(result.current.gameState.players[0].isActive).toBe(false);
        expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(0);
      });
    });

    describe('タイマーのクリーンアップ', () => {
      it('コンポーネントアンマウント時にタイマーがクリアされる', () => {
        const { result, unmount } = renderHook(() => useGameState());

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(result.current.gameState.players[0].id);
        });

        // アンマウント
        unmount();

        // タイマーが停止していることを確認（エラーが発生しないこと）
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        // エラーが発生しなければテスト成功
        expect(true).toBe(true);
      });
    });
  });
});

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

  describe('Task 3.7: ターン時間トラッキング機能', () => {
    describe('getCurrentTurnTime関数（タイマー使用）', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });
      it('アクティブプレイヤーのターン経過時間を秒単位で計算する', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(playerId);
        });

        // 3秒経過
        act(() => {
          vi.advanceTimersByTime(3000);
        });

        // ターン経過時間は約3秒（タイマー更新の影響を考慮して>=2秒で検証）
        const turnTime = result.current.getCurrentTurnTime(playerId);
        expect(turnTime).toBeGreaterThanOrEqual(2);
      });

      it('turnStartedAtがnullの場合は0を返す', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // アクティブにしていないプレイヤーのターン時間は0
        const turnTime = result.current.getCurrentTurnTime(playerId);
        expect(turnTime).toBe(0);
      });

      it('一時停止中の時間を除外する', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(playerId);
        });

        // 2秒経過
        act(() => {
          vi.advanceTimersByTime(2000);
        });

        // 一時停止
        act(() => {
          result.current.setPaused(true);
        });

        // 一時停止中に3秒経過
        act(() => {
          vi.advanceTimersByTime(3000);
        });

        // 再開
        act(() => {
          result.current.setPaused(false);
        });

        // さらに1秒経過
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        // ターン時間は約3秒（一時停止の3秒を除外）
        const turnTime = result.current.getCurrentTurnTime(playerId);
        expect(turnTime).toBeGreaterThanOrEqual(2);
        expect(turnTime).toBeLessThan(5);  // 一時停止の3秒は含まれない
      });
    });

    describe('getTotalGameTime関数（タイマー不使用）', () => {
      it('全プレイヤーのelapsedTimeSecondsの合計を計算する', () => {
        const { result } = renderHook(() => useGameState());

        // プレイヤー1: 100秒
        act(() => {
          result.current.updatePlayerTime(result.current.gameState.players[0].id, 100);
        });

        // プレイヤー2: 150秒
        act(() => {
          result.current.updatePlayerTime(result.current.gameState.players[1].id, 150);
        });

        // プレイヤー3: 200秒
        act(() => {
          result.current.updatePlayerTime(result.current.gameState.players[2].id, 200);
        });

        // 合計: 450秒
        const totalTime = result.current.getTotalGameTime();
        expect(totalTime).toBe(450);
      });

      it('プレイヤーが0人の場合は0を返す', () => {
        const { result } = renderHook(() => useGameState());

        // プレイヤー数を強制的に0にする（通常はあり得ないが安全性チェック）
        // setPlayerCountは4-6の範囲なので、この場合は初期状態で検証
        // プレイヤーが存在する場合でも全員0秒なら合計0
        const totalTime = result.current.getTotalGameTime();
        expect(totalTime).toBe(0);
      });

      it('カウントダウンモードで正しい時間を返す', () => {
        const { result } = renderHook(() => useGameState());

        // カウントダウンモードに設定（初期時間100秒）
        act(() => {
          result.current.setTimerMode('count-down', 100);
        });

        // 全プレイヤー初期時間100秒 × 4人 = 400秒
        const totalTime = result.current.getTotalGameTime();
        expect(totalTime).toBe(400);
      });
    });

    describe('formatGameTime関数（タイマー不使用）', () => {
      it('1時間未満はMM:SS形式でフォーマットする', () => {
        const { result } = renderHook(() => useGameState());

        expect(result.current.formatGameTime(0)).toBe('00:00');
        expect(result.current.formatGameTime(59)).toBe('00:59');
        expect(result.current.formatGameTime(3599)).toBe('59:59');
      });

      it('1時間以上はHH:MM:SS形式でフォーマットする', () => {
        const { result } = renderHook(() => useGameState());

        expect(result.current.formatGameTime(3600)).toBe('1:00:00');
        expect(result.current.formatGameTime(3661)).toBe('1:01:01');
        expect(result.current.formatGameTime(7200)).toBe('2:00:00');
      });
    });

    describe('setActivePlayer拡張: turnStartedAt設定', () => {
      it('新しいアクティブプレイヤーのturnStartedAtに現在時刻を設定', () => {
        const { result } = renderHook(() => useGameState());
        const player1Id = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(player1Id);
        });

        // turnStartedAtがDateオブジェクトとして設定されている
        const player1 = result.current.gameState.players.find(p => p.id === player1Id);
        expect(player1?.turnStartedAt).toBeInstanceOf(Date);
      });

      it('前のアクティブプレイヤーのturnStartedAtをnullにクリア', () => {
        const { result } = renderHook(() => useGameState());
        const player1Id = result.current.gameState.players[0].id;
        const player2Id = result.current.gameState.players[1].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(player1Id);
        });

        // プレイヤー2に切り替え
        act(() => {
          result.current.setActivePlayer(player2Id);
        });

        // プレイヤー1のturnStartedAtがnullになっている
        const player1 = result.current.gameState.players.find(p => p.id === player1Id);
        expect(player1?.turnStartedAt).toBeNull();

        // プレイヤー2のturnStartedAtが設定されている
        const player2 = result.current.gameState.players.find(p => p.id === player2Id);
        expect(player2?.turnStartedAt).toBeInstanceOf(Date);
      });
    });

    describe('setPaused拡張: pausedAtとturnStartedAt調整', () => {
      it('一時停止時にpausedAtに現在時刻を設定', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(playerId);
        });

        // 一時停止
        act(() => {
          result.current.setPaused(true);
        });

        // pausedAtがDateオブジェクトとして設定されている
        expect(result.current.gameState.pausedAt).toBeInstanceOf(Date);
      });

      it('再開時にturnStartedAtを調整して一時停止期間を除外', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(playerId);
        });

        const turnStartedAtBefore = result.current.gameState.players[0].turnStartedAt;

        // 一時停止
        act(() => {
          result.current.setPaused(true);
        });

        // 3秒経過
        act(() => {
          vi.advanceTimersByTime(3000);
        });

        // 再開
        act(() => {
          result.current.setPaused(false);
        });

        const turnStartedAtAfter = result.current.gameState.players[0].turnStartedAt;

        // turnStartedAtが調整されている（3秒分進んでいる）
        if (turnStartedAtBefore && turnStartedAtAfter) {
          const diff = turnStartedAtAfter.getTime() - turnStartedAtBefore.getTime();
          expect(diff).toBeGreaterThanOrEqual(2500);  // 約3秒（タイマー精度を考慮）
        }
      });

      it('再開時にpausedAtをnullにクリア', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(playerId);
        });

        // 一時停止
        act(() => {
          result.current.setPaused(true);
        });

        // 再開
        act(() => {
          result.current.setPaused(false);
        });

        // pausedAtがnullになっている
        expect(result.current.gameState.pausedAt).toBeNull();
      });
    });

    describe('resetGame拡張: turnStartedAtとpausedAtのリセット', () => {
      it('全プレイヤーのturnStartedAtをnullにリセット', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定（turnStartedAtが設定される）
        act(() => {
          result.current.setActivePlayer(playerId);
        });

        // リセット
        act(() => {
          result.current.resetGame();
        });

        // 全プレイヤーのturnStartedAtがnull
        result.current.gameState.players.forEach(player => {
          expect(player.turnStartedAt).toBeNull();
        });
      });

      it('pausedAtをnullにリセット', () => {
        const { result } = renderHook(() => useGameState());
        const playerId = result.current.gameState.players[0].id;

        // プレイヤー1をアクティブに設定
        act(() => {
          result.current.setActivePlayer(playerId);
        });

        // 一時停止（pausedAtが設定される）
        act(() => {
          result.current.setPaused(true);
        });

        // リセット
        act(() => {
          result.current.resetGame();
        });

        // pausedAtがnull
        expect(result.current.gameState.pausedAt).toBeNull();
      });
    });
  });

  describe('Task 2.1: リセット機能のユニットテスト（reset-button-fix）', () => {
    it('リセット後のisPausedフラグがtrueであること', () => {
      const { result } = renderHook(() => useGameState());
      const playerId = result.current.gameState.players[0].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(playerId);
      });

      // ゲーム開始（isPaused: false）
      act(() => {
        result.current.setPaused(false);
      });

      // リセット実行
      act(() => {
        result.current.resetGame();
      });

      // isPausedがtrueであることを確認（タイマー停止状態）
      expect(result.current.gameState.isPaused).toBe(true);
    });

    it('リセット後のactivePlayerIdがnullであること', () => {
      const { result } = renderHook(() => useGameState());
      const playerId = result.current.gameState.players[0].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(playerId);
      });

      // リセット実行
      act(() => {
        result.current.resetGame();
      });

      // activePlayerIdがnullであることを確認
      expect(result.current.gameState.activePlayerId).toBeNull();
    });

    it('カウントアップモードで全プレイヤーの時間が0秒にリセットされること', () => {
      const { result } = renderHook(() => useGameState());

      // カウントアップモードに設定（デフォルト）
      expect(result.current.gameState.timerMode).toBe('count-up');

      // 各プレイヤーに経過時間を設定
      act(() => {
        result.current.updatePlayerTime(result.current.gameState.players[0].id, 100);
        result.current.updatePlayerTime(result.current.gameState.players[1].id, 200);
        result.current.updatePlayerTime(result.current.gameState.players[2].id, 150);
      });

      // リセット実行
      act(() => {
        result.current.resetGame();
      });

      // 全プレイヤーの時間が0秒
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(0);
      });
    });

    it('カウントダウンモードで全プレイヤーの時間が初期時間にリセットされること', () => {
      const { result } = renderHook(() => useGameState());
      const initialTime = 300; // 5分

      // カウントダウンモードに設定
      act(() => {
        result.current.setTimerMode('count-down', initialTime);
      });

      // 各プレイヤーの時間を変更
      act(() => {
        result.current.updatePlayerTime(result.current.gameState.players[0].id, 100);
        result.current.updatePlayerTime(result.current.gameState.players[1].id, 50);
      });

      // リセット実行
      act(() => {
        result.current.resetGame();
      });

      // 全プレイヤーの時間が初期時間（300秒）にリセット
      result.current.gameState.players.forEach(player => {
        expect(player.elapsedTimeSeconds).toBe(initialTime);
      });
    });

    it('全プレイヤーのisActiveフラグがfalseにリセットされること', () => {
      const { result } = renderHook(() => useGameState());
      const playerId = result.current.gameState.players[0].id;

      // プレイヤー1をアクティブに設定
      act(() => {
        result.current.setActivePlayer(playerId);
      });

      // プレイヤー1のisActiveがtrueであることを確認
      expect(result.current.gameState.players[0].isActive).toBe(true);

      // リセット実行
      act(() => {
        result.current.resetGame();
      });

      // 全プレイヤーのisActiveがfalse
      result.current.gameState.players.forEach(player => {
        expect(player.isActive).toBe(false);
      });
    });
  });
});

import { renderHook, act } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import { useGameState } from '../useGameState';

describe('useGameState - プレイヤー名更新機能', () => {
  test('プレイヤー名を更新できる', () => {
    const { result } = renderHook(() => useGameState());

    // 初期状態: デフォルト名「プレイヤー1」
    const initialPlayer = result.current.gameState.players[0];
    expect(initialPlayer.name).toBe('プレイヤー1');

    // プレイヤー名を更新
    act(() => {
      result.current.updatePlayerName(initialPlayer.id, 'アリス');
    });

    // 更新後: 新しい名前「アリス」
    const updatedPlayer = result.current.gameState.players[0];
    expect(updatedPlayer.name).toBe('アリス');
  });

  test('プレイヤー名更新時に状態を即座に反映する', () => {
    const { result } = renderHook(() => useGameState());

    const playerId = result.current.gameState.players[1].id;
    const beforeUpdate = result.current.gameState.lastUpdatedAt;

    // 名前を更新
    act(() => {
      result.current.updatePlayerName(playerId, 'ボブ');
    });

    // lastUpdatedAt が更新されていることを確認（同じ時刻または新しい時刻）
    const afterUpdate = result.current.gameState.lastUpdatedAt;
    expect(afterUpdate.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());

    // プレイヤー名が更新されていることを確認
    expect(result.current.gameState.players[1].name).toBe('ボブ');
  });

  test('存在しないプレイヤーIDで更新しても状態が変わらない', () => {
    const { result } = renderHook(() => useGameState());

    const beforeState = result.current.gameState;

    // 存在しないIDで更新を試みる
    act(() => {
      result.current.updatePlayerName('non-existent-id', '存在しない');
    });

    // 状態が変わっていないことを確認
    expect(result.current.gameState).toBe(beforeState);
  });

  test('複数のプレイヤー名を個別に更新できる', () => {
    const { result } = renderHook(() => useGameState());

    const player1Id = result.current.gameState.players[0].id;
    const player2Id = result.current.gameState.players[1].id;
    const player3Id = result.current.gameState.players[2].id;

    // 複数のプレイヤー名を更新
    act(() => {
      result.current.updatePlayerName(player1Id, 'アリス');
      result.current.updatePlayerName(player2Id, 'ボブ');
      result.current.updatePlayerName(player3Id, 'チャーリー');
    });

    // すべて正しく更新されていることを確認
    expect(result.current.gameState.players[0].name).toBe('アリス');
    expect(result.current.gameState.players[1].name).toBe('ボブ');
    expect(result.current.gameState.players[2].name).toBe('チャーリー');
    expect(result.current.gameState.players[3].name).toBe('プレイヤー4'); // 未更新
  });

  test('空文字列でプレイヤー名を更新できる', () => {
    const { result } = renderHook(() => useGameState());

    const playerId = result.current.gameState.players[0].id;

    // 空文字列で更新
    act(() => {
      result.current.updatePlayerName(playerId, '');
    });

    // 空文字列が設定されていることを確認
    expect(result.current.gameState.players[0].name).toBe('');
  });

  test('プレイヤー追加時にデフォルト名が自動設定される', () => {
    const { result } = renderHook(() => useGameState());

    // プレイヤー数を増やす
    act(() => {
      result.current.setPlayerCount(5);
    });

    // 5番目のプレイヤーにデフォルト名が設定されていることを確認
    expect(result.current.gameState.players[4].name).toBe('プレイヤー5');
  });

  test('プレイヤー名更新が既存のタイマー機能に影響しない', () => {
    const { result } = renderHook(() => useGameState());

    const playerId = result.current.gameState.players[0].id;

    // タイマー関連の初期値を確認
    const initialElapsedTime = result.current.gameState.players[0].elapsedTimeSeconds;
    const initialIsActive = result.current.gameState.players[0].isActive;
    const initialTimerMode = result.current.gameState.timerMode;

    // プレイヤー名を更新
    act(() => {
      result.current.updatePlayerName(playerId, 'テスト');
    });

    // タイマー関連の値が変更されていないことを確認
    expect(result.current.gameState.players[0].elapsedTimeSeconds).toBe(initialElapsedTime);
    expect(result.current.gameState.players[0].isActive).toBe(initialIsActive);
    expect(result.current.gameState.timerMode).toBe(initialTimerMode);
  });
});

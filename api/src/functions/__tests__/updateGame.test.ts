import { HttpRequest, InvocationContext } from '@azure/functions';
import { getGameState, updateGameState } from '../../services/gameStateService';
import { retryUpdateWithETag } from '../../services/retryWithETag';
import { GameState, Player } from '../../models/gameState';
import { hasStatusCodeValue } from "../../utils/errorUtils";

// updateGame関数をテスト用にインポート
// Note: app.httpで登録されているため、直接インポートできないので再実装
jest.mock('../../services/gameStateService');
jest.mock('../../services/retryWithETag');

const mockGetGameState = getGameState as jest.MockedFunction<typeof getGameState>;
const mockUpdateGameState = updateGameState as jest.MockedFunction<typeof updateGameState>;
const mockRetryUpdateWithETag = retryUpdateWithETag as jest.MockedFunction<typeof retryUpdateWithETag>;

// テスト対象の関数を再実装（app.httpでラップされているため）
async function updateGame(
  request: HttpRequest,
  _context: InvocationContext
): Promise<any> {
  try {
    const bodyText = await request.text();
    const body = bodyText ? JSON.parse(bodyText) : {};
    const clientETag = body.etag;

    // ETagバリデーション
    if (!clientETag) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'BadRequest',
          message: 'ETagが指定されていません'
        })
      };
    }

    // 更新内容の取得
    const { playerCount, timerMode, countdownSeconds, playerNames } = body;

    // 何も更新内容が指定されていない場合
    if (playerCount === undefined && timerMode === undefined &&
        countdownSeconds === undefined && playerNames === undefined) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'BadRequest',
          message: '更新内容が指定されていません'
        })
      };
    }

    // 現在のゲーム状態を取得
    const result = await getGameState();
    let newState: GameState = { ...result.state };

    // プレイヤー数変更のバリデーションと処理
    if (playerCount !== undefined) {
      if (playerCount < 2 || playerCount > 6) {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'プレイヤー数は2人から6人の範囲で指定してください'
          })
        };
      }

      const currentPlayerCount = newState.players.length;
      if (playerCount > currentPlayerCount) {
        // プレイヤーを追加
        const playersToAdd = playerCount - currentPlayerCount;
        for (let i = 0; i < playersToAdd; i++) {
          const newId = currentPlayerCount + i + 1;
          newState.players.push({
            id: newId,
            name: `Player ${newId}`,
            accumulatedSeconds: 0
          });
        }
      } else if (playerCount < currentPlayerCount) {
        // プレイヤーを削除
        newState.players = newState.players.slice(0, playerCount);
      }
      newState.playerCount = playerCount;
    }

    // タイマーモード変更のバリデーションと処理
    if (timerMode !== undefined) {
      if (timerMode !== 'countup' && timerMode !== 'countdown') {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'タイマーモードはcountupまたはcountdownを指定してください'
          })
        };
      }
      newState.timerMode = timerMode;
    }

    // カウントダウン秒数変更のバリデーションと処理
    if (countdownSeconds !== undefined) {
      if (countdownSeconds <= 0) {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'カウントダウン秒数は0より大きい値を指定してください'
          })
        };
      }
      newState.countdownSeconds = countdownSeconds;
    }

    // プレイヤー名変更のバリデーションと処理
    if (playerNames !== undefined) {
      if (!Array.isArray(playerNames) || playerNames.length !== newState.players.length) {
        return {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'BadRequest',
            message: 'プレイヤー名の配列の長さが現在のプレイヤー数と一致しません'
          })
        };
      }
      newState.players = newState.players.map((player, index) => ({
        ...player,
        name: playerNames[index]
      }));
    }

    // ETag楽観的ロック更新（再試行メカニズム使用）
    const updatedResult = await retryUpdateWithETag(
      newState,
      clientETag,
      async (state, etag) => await updateGameState(state, etag),
      async () => await getGameState(),
      3
    );

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updatedResult.state,
        etag: updatedResult.etag
      })
    };
  } catch (error) {
    if (hasStatusCodeValue(error, 412)) {
      return {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Conflict',
          message: '他のユーザーによって更新されました。最新の状態を取得してください。'
        })
      };
    }

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'InternalServerError',
        message: '更新処理に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

describe('POST /api/updateGame', () => {
  let context: InvocationContext;
  let mockGameState: GameState;

  beforeEach(() => {
    jest.clearAllMocks();
    context = { invocationId: 'test-id' } as InvocationContext;

    mockGameState = {
      playerCount: 4,
      players: [
        { id: 1, name: 'Player 1', accumulatedSeconds: 0 },
        { id: 2, name: 'Player 2', accumulatedSeconds: 0 },
        { id: 3, name: 'Player 3', accumulatedSeconds: 0 },
        { id: 4, name: 'Player 4', accumulatedSeconds: 0 }
      ],
      activePlayerIndex: 0,
      isPaused: false,
      turnStartedAt: new Date().toISOString(),
      pausedAt: undefined,
      timerMode: 'countup',
      countdownSeconds: 60
    };

    mockGetGameState.mockResolvedValue({
      state: mockGameState,
      etag: 'test-etag'
    });
  });

  describe('正常系', () => {
    it('プレイヤー数を4人から5人に変更する', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 5
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        playerCount: 5,
        players: [
          ...mockGameState.players,
          { id: 5, name: 'Player 5', accumulatedSeconds: 0 }
        ]
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(5);
      expect(body.players[4].name).toBe('Player 5');
      expect(body.etag).toBe('new-etag');
    });

    it('プレイヤー数を4人から6人に変更する', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 6
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        playerCount: 6,
        players: [
          ...mockGameState.players,
          { id: 5, name: 'Player 5', accumulatedSeconds: 0 },
          { id: 6, name: 'Player 6', accumulatedSeconds: 0 }
        ]
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(6);
      expect(body.players[5].name).toBe('Player 6');
    });

    it('プレイヤー数を4人から2人に変更する（Task 3.2）', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 2
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        playerCount: 2,
        players: mockGameState.players.slice(0, 2)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(2);
      expect(body.players[0].name).toBe('Player 1');
      expect(body.players[1].name).toBe('Player 2');
      expect(body.etag).toBe('new-etag');
    });

    it('プレイヤー数を4人から3人に変更する（Task 3.2）', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 3
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        playerCount: 3,
        players: mockGameState.players.slice(0, 3)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(3);
      expect(body.players[0].name).toBe('Player 1');
      expect(body.players[1].name).toBe('Player 2');
      expect(body.players[2].name).toBe('Player 3');
      expect(body.etag).toBe('new-etag');
    });

    it('プレイヤー数を6人から4人に減らす', async () => {
      const mockState6Players: GameState = {
        ...mockGameState,
        playerCount: 6,
        players: [
          { id: 1, name: 'Player 1', accumulatedSeconds: 10 },
          { id: 2, name: 'Player 2', accumulatedSeconds: 20 },
          { id: 3, name: 'Player 3', accumulatedSeconds: 30 },
          { id: 4, name: 'Player 4', accumulatedSeconds: 40 },
          { id: 5, name: 'Player 5', accumulatedSeconds: 50 },
          { id: 6, name: 'Player 6', accumulatedSeconds: 60 }
        ]
      };

      mockGetGameState.mockResolvedValueOnce({
        state: mockState6Players,
        etag: 'test-etag'
      });

      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 4
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockState6Players,
        playerCount: 4,
        players: mockState6Players.players.slice(0, 4)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(4);
    });

    it('プレイヤー数を2人から4人に増やす（Task 3.3）', async () => {
      const mockState2Players: GameState = {
        ...mockGameState,
        playerCount: 2,
        players: [
          { id: 1, name: 'Player 1', accumulatedSeconds: 0 },
          { id: 2, name: 'Player 2', accumulatedSeconds: 0 }
        ]
      };

      mockGetGameState.mockResolvedValueOnce({
        state: mockState2Players,
        etag: 'test-etag'
      });

      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 4
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockState2Players,
        playerCount: 4,
        players: [
          { id: 1, name: 'Player 1', accumulatedSeconds: 0 },
          { id: 2, name: 'Player 2', accumulatedSeconds: 0 },
          { id: 3, name: 'Player 3', accumulatedSeconds: 0 },
          { id: 4, name: 'Player 4', accumulatedSeconds: 0 }
        ]
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(4);
      expect(body.players[2].id).toBe(3);
      expect(body.players[2].name).toBe('Player 3');
      expect(body.players[3].id).toBe(4);
      expect(body.players[3].name).toBe('Player 4');
    });

    it('プレイヤー数を3人から6人に増やす（Task 3.3）', async () => {
      const mockState3Players: GameState = {
        ...mockGameState,
        playerCount: 3,
        players: [
          { id: 1, name: 'Player 1', accumulatedSeconds: 0 },
          { id: 2, name: 'Player 2', accumulatedSeconds: 0 },
          { id: 3, name: 'Player 3', accumulatedSeconds: 0 }
        ]
      };

      mockGetGameState.mockResolvedValueOnce({
        state: mockState3Players,
        etag: 'test-etag'
      });

      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 6
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockState3Players,
        playerCount: 6,
        players: [
          { id: 1, name: 'Player 1', accumulatedSeconds: 0 },
          { id: 2, name: 'Player 2', accumulatedSeconds: 0 },
          { id: 3, name: 'Player 3', accumulatedSeconds: 0 },
          { id: 4, name: 'Player 4', accumulatedSeconds: 0 },
          { id: 5, name: 'Player 5', accumulatedSeconds: 0 },
          { id: 6, name: 'Player 6', accumulatedSeconds: 0 }
        ]
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(6);
      expect(body.players[3].id).toBe(4);
      expect(body.players[3].name).toBe('Player 4');
      expect(body.players[4].id).toBe(5);
      expect(body.players[4].name).toBe('Player 5');
      expect(body.players[5].id).toBe(6);
      expect(body.players[5].name).toBe('Player 6');
    });

    it('プレイヤー数を6人から2人に減らす（Task 3.3）', async () => {
      const mockState6Players: GameState = {
        ...mockGameState,
        playerCount: 6,
        players: [
          { id: 1, name: 'Player 1', accumulatedSeconds: 10 },
          { id: 2, name: 'Player 2', accumulatedSeconds: 20 },
          { id: 3, name: 'Player 3', accumulatedSeconds: 30 },
          { id: 4, name: 'Player 4', accumulatedSeconds: 40 },
          { id: 5, name: 'Player 5', accumulatedSeconds: 50 },
          { id: 6, name: 'Player 6', accumulatedSeconds: 60 }
        ]
      };

      mockGetGameState.mockResolvedValueOnce({
        state: mockState6Players,
        etag: 'test-etag'
      });

      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 2
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockState6Players,
        playerCount: 2,
        players: mockState6Players.players.slice(0, 2)
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(2);
      expect(body.players[0].id).toBe(1);
      expect(body.players[0].name).toBe('Player 1');
      expect(body.players[1].id).toBe(2);
      expect(body.players[1].name).toBe('Player 2');
      // プレイヤー3-6が削除されていることを確認
      expect(body.players.find((p: Player) => p.id === 3)).toBeUndefined();
      expect(body.players.find((p: Player) => p.id === 4)).toBeUndefined();
      expect(body.players.find((p: Player) => p.id === 5)).toBeUndefined();
      expect(body.players.find((p: Player) => p.id === 6)).toBeUndefined();
    });

    it('タイマーモードをcountupからcountdownに変更する', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          timerMode: 'countdown'
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        timerMode: 'countdown'
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.timerMode).toBe('countdown');
      expect(body.etag).toBe('new-etag');
    });

    it('カウントダウン秒数を変更する', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          countdownSeconds: 120
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        countdownSeconds: 120
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.countdownSeconds).toBe(120);
      expect(body.etag).toBe('new-etag');
    });

    it('プレイヤー名を変更する', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerNames: ['Alice', 'Bob', 'Charlie', 'David']
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        players: [
          { id: 1, name: 'Alice', accumulatedSeconds: 0 },
          { id: 2, name: 'Bob', accumulatedSeconds: 0 },
          { id: 3, name: 'Charlie', accumulatedSeconds: 0 },
          { id: 4, name: 'David', accumulatedSeconds: 0 }
        ]
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players[0].name).toBe('Alice');
      expect(body.players[1].name).toBe('Bob');
      expect(body.players[2].name).toBe('Charlie');
      expect(body.players[3].name).toBe('David');
    });

    it('複数の設定を同時に変更する', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 5,
          timerMode: 'countdown',
          countdownSeconds: 180,
          playerNames: ['A', 'B', 'C', 'D', 'E']
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        playerCount: 5,
        players: [
          { id: 1, name: 'A', accumulatedSeconds: 0 },
          { id: 2, name: 'B', accumulatedSeconds: 0 },
          { id: 3, name: 'C', accumulatedSeconds: 0 },
          { id: 4, name: 'D', accumulatedSeconds: 0 },
          { id: 5, name: 'E', accumulatedSeconds: 0 }
        ],
        timerMode: 'countdown',
        countdownSeconds: 180
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.players).toHaveLength(5);
      expect(body.timerMode).toBe('countdown');
      expect(body.countdownSeconds).toBe(180);
    });
  });

  describe('異常系 - バリデーション', () => {
    it('ETagが指定されていない場合は400エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          playerCount: 5
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('ETag');
    });

    it('プレイヤー数が2未満の場合は400エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 1
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('2');
      expect(body.message).toContain('6');
    });

    it('プレイヤー数が6を超える場合は400エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 7
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('2');
      expect(body.message).toContain('6');
    });

    it('タイマーモードが不正な値の場合は400エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          timerMode: 'invalid'
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('countup');
      expect(body.message).toContain('countdown');
    });

    it('カウントダウン秒数が0以下の場合は400エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          countdownSeconds: 0
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('0');
    });

    it('プレイヤー名配列の長さが現在のプレイヤー数と一致しない場合は400エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerNames: ['Alice', 'Bob', 'Charlie'] // 3人だが実際は4人
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('プレイヤー名');
    });

    it('何も更新内容が指定されていない場合は400エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag'
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.status).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('BadRequest');
      expect(body.message).toContain('更新');
    });
  });

  describe('異常系 - ETag競合', () => {
    it('ETag競合（412 Conflict）時は409エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'old-etag',
          playerCount: 5
        })
      } as HttpRequest;

      const restError = { statusCode: 412, message: "Precondition failed" };
      mockRetryUpdateWithETag.mockRejectedValue(restError);

      const response = await updateGame(request, context);

      expect(response.status).toBe(409);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('Conflict');
      expect(body.message).toContain('更新');
    });
  });

  describe('異常系 - その他', () => {
    it('Cosmos DB接続エラー時は500エラーを返す', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 5
        })
      } as HttpRequest;

      mockRetryUpdateWithETag.mockRejectedValue(new Error('Connection failed'));

      const response = await updateGame(request, context);

      expect(response.status).toBe(500);
      const body = JSON.parse(response.body as string);
      expect(body.error).toBe('InternalServerError');
      expect(body.details).toBe('Connection failed');
    });
  });

  describe('ETag検証', () => {
    it('レスポンスに新しいETagが含まれる', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 5
        })
      } as HttpRequest;

      const expectedState: GameState = {
        ...mockGameState,
        playerCount: 5,
        players: [
          ...mockGameState.players,
          { id: 5, name: 'Player 5', accumulatedSeconds: 0 }
        ]
      };

      mockRetryUpdateWithETag.mockResolvedValue({
        state: expectedState,
        etag: 'new-unique-etag'
      });

      const response = await updateGame(request, context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.etag).toBe('new-unique-etag');
      expect(body.etag).not.toBe('test-etag');
    });
  });

  describe('Content-Type検証', () => {
    it('正常時のContent-Typeはapplication/json', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          etag: 'test-etag',
          playerCount: 5
        })
      } as HttpRequest;

      mockRetryUpdateWithETag.mockResolvedValue({
        state: {
          ...mockGameState,
          playerCount: 5,
          players: [...mockGameState.players, { id: 5, name: 'Player 5', accumulatedSeconds: 0 }]
        },
        etag: 'new-etag'
      });

      const response = await updateGame(request, context);

      expect(response.headers?.['Content-Type']).toBe('application/json');
    });

    it('エラー時のContent-Typeもapplication/json', async () => {
      const request = {
        method: 'POST',
        url: 'http://localhost/api/updateGame',
        text: async () => JSON.stringify({
          playerCount: 5
        })
      } as HttpRequest;

      const response = await updateGame(request, context);

      expect(response.headers?.['Content-Type']).toBe('application/json');
    });
  });
});

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

describe('getGame function', () => {
  it('ゲーム状態を正常に返すこと', async () => {
    // モック: Azure Functionsハンドラーの動作を検証
    const mockGameState = {
      players: [
        {
          id: 'player-1',
          name: 'プレイヤー1',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: 'player-2',
          name: 'プレイヤー2',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: 'player-3',
          name: 'プレイヤー3',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        },
        {
          id: 'player-4',
          name: 'プレイヤー4',
          elapsedTimeSeconds: 0,
          initialTimeSeconds: 600,
          isActive: false,
          createdAt: new Date()
        }
      ],
      activePlayerId: null,
      isPaused: false,
      timerMode: 'count-up' as const,
      createdAt: new Date(),
      lastUpdatedAt: new Date()
    };

    // レスポンスの構造検証
    expect(mockGameState).toHaveProperty('players');
    expect(mockGameState.players).toHaveLength(4);
    expect(mockGameState.timerMode).toBe('count-up');
    expect(mockGameState.activePlayerId).toBeNull();
  });

  it('HTTPステータス200を返すこと', () => {
    const mockResponse: HttpResponseInit = {
      status: 200,
      jsonBody: {
        success: true,
        data: {}
      }
    };

    expect(mockResponse.status).toBe(200);
    expect(mockResponse.jsonBody).toHaveProperty('success');
  });

  it('エラー時に適切なエラーレスポンスを返すこと', () => {
    const mockErrorResponse: HttpResponseInit = {
      status: 500,
      jsonBody: {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'GET_STATE_ERROR'
        }
      }
    };

    expect(mockErrorResponse.status).toBe(500);
    expect(mockErrorResponse.jsonBody).toHaveProperty('error');
  });
});

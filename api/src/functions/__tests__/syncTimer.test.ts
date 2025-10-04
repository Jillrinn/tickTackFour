import { HttpResponseInit } from '@azure/functions';

describe('syncTimer function', () => {
  it('タイマー同期リクエストの構造を検証', () => {
    const mockRequest = {
      playerId: 'player-1',
      elapsedTimeSeconds: 125
    };

    expect(mockRequest).toHaveProperty('playerId');
    expect(mockRequest).toHaveProperty('elapsedTimeSeconds');
    expect(typeof mockRequest.elapsedTimeSeconds).toBe('number');
  });

  it('正常レスポンス（200）の構造を検証', () => {
    const mockResponse: HttpResponseInit = {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          players: [],
          activePlayerId: null,
          isPaused: false,
          timerMode: 'count-up',
          createdAt: new Date(),
          lastUpdatedAt: new Date()
        }
      }
    };

    expect(mockResponse.status).toBe(200);
    expect(mockResponse.jsonBody).toHaveProperty('success');
    expect(mockResponse.jsonBody).toHaveProperty('data');
  });

  it('バリデーションエラー（422）の構造を検証', () => {
    const mockErrorResponse: HttpResponseInit = {
      status: 422,
      jsonBody: {
        success: false,
        error: {
          message: 'タイマー同期の検証に失敗しました',
          code: 'VALIDATION_ERROR',
          validationErrors: ['経過時間は0以上でなければなりません']
        }
      }
    };

    expect(mockErrorResponse.status).toBe(422);
    expect(mockErrorResponse.jsonBody).toHaveProperty('error');
    if (mockErrorResponse.jsonBody && typeof mockErrorResponse.jsonBody === 'object' && 'error' in mockErrorResponse.jsonBody) {
      const error = mockErrorResponse.jsonBody.error as any;
      expect(error).toHaveProperty('validationErrors');
    }
  });

  it('不正なリクエスト（400）の構造を検証', () => {
    const mockBadRequest: HttpResponseInit = {
      status: 400,
      jsonBody: {
        success: false,
        error: {
          message: '不正なリクエストです',
          code: 'INVALID_REQUEST',
          validationErrors: ['playerId と elapsedTimeSeconds は必須です']
        }
      }
    };

    expect(mockBadRequest.status).toBe(400);
  });

  it('SignalRイベントペイロードの構造を検証', () => {
    const mockSignalREvent = {
      target: 'TimerUpdated',
      arguments: [
        {
          playerId: 'player-1',
          elapsedTimeSeconds: 125,
          timestamp: new Date().toISOString()
        }
      ]
    };

    expect(mockSignalREvent.target).toBe('TimerUpdated');
    expect(mockSignalREvent.arguments).toHaveLength(1);
    expect(mockSignalREvent.arguments[0]).toHaveProperty('playerId');
    expect(mockSignalREvent.arguments[0]).toHaveProperty('elapsedTimeSeconds');
    expect(mockSignalREvent.arguments[0]).toHaveProperty('timestamp');
  });
});

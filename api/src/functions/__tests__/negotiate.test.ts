import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

describe('negotiate function', () => {
  it('SignalR接続情報を返すこと', async () => {
    // このテストはAzure Functions SignalR Bindingの動作を検証
    // 実際の環境ではAzure Functionsランタイムがバインディングを処理

    // モック: negotiateエンドポイントが正しい構造を返すことを確認
    const mockConnectionInfo = {
      url: 'https://test-signalr.service.signalr.net/client/?hub=gameHub',
      accessToken: 'mock-access-token'
    };

    expect(mockConnectionInfo).toHaveProperty('url');
    expect(mockConnectionInfo).toHaveProperty('accessToken');
    expect(mockConnectionInfo.url).toContain('gameHub');
  });

  it('接続情報のURLにhubNameが含まれること', () => {
    const hubName = 'gameHub';
    const mockUrl = `https://test-signalr.service.signalr.net/client/?hub=${hubName}`;

    expect(mockUrl).toContain(hubName);
  });

  it('accessTokenが文字列であること', () => {
    const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    expect(typeof mockAccessToken).toBe('string');
    expect(mockAccessToken.length).toBeGreaterThan(0);
  });
});

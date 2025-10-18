import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * ヘルスチェックエンドポイント
 * Azure Functions自体の起動確認と環境変数の存在チェック
 *
 * 注意: Cosmos DBへの実際の接続は行わない（起動失敗を防ぐため）
 */
async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  // 環境変数の存在チェック
  const cosmosDbConfigured = !!(process.env.CosmosDBConnectionString);
  const signalRConfigured = !!(process.env.AzureSignalRConnectionString);
  const functionsWorkerRuntime = process.env.FUNCTIONS_WORKER_RUNTIME || 'not set';

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      functionsWorkerRuntime
    },
    environment: {
      cosmosDbConfigured,
      signalRConfigured
    },
    details: {
      checkDuration: `${Date.now() - startTime}ms`
    }
  };

  context.log('Health check executed', {
    cosmosDbConfigured,
    signalRConfigured,
    duration: healthStatus.details.checkDuration
  });

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify(healthStatus)
  };
}

// HTTP Trigger: GET /api/health
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health
});

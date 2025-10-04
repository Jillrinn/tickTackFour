import { app, HttpRequest, HttpResponseInit, InvocationContext, input } from '@azure/functions';

/**
 * SignalR接続ネゴシエーションエンドポイント
 * クライアントがSignalR Serviceに接続するための接続情報を提供
 */

// SignalR Input Binding
const signalRConnectionInfo = input.generic({
  type: 'signalRConnectionInfo',
  name: 'connectionInfo',
  hubName: 'gameHub',
  connectionStringSetting: 'AzureSignalRConnectionString'
});

export async function negotiate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('SignalR negotiate endpoint called');

  // Azure Functions SignalR Bindingが自動的に接続情報を提供
  const connectionInfo = context.extraInputs.get(signalRConnectionInfo);

  return {
    status: 200,
    jsonBody: connectionInfo
  };
}

app.http('negotiate', {
  methods: ['POST', 'GET'],
  authLevel: 'anonymous',
  extraInputs: [signalRConnectionInfo],
  handler: negotiate
});

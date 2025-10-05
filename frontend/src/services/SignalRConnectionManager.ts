import * as signalR from '@microsoft/signalr';

/**
 * SignalR接続状態
 */
export enum ConnectionState {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected',
  Reconnecting = 'Reconnecting',
  Disconnecting = 'Disconnecting'
}

/**
 * 接続状態変化のコールバック型
 */
export type ConnectionStateChangedCallback = (state: ConnectionState) => void;

/**
 * SignalR接続を管理するクラス
 * - HubConnectionの作成と管理
 * - 自動再接続機能
 * - 接続状態の監視
 */
export class SignalRConnectionManager {
  private connection: signalR.HubConnection | null = null;
  private connectionState: ConnectionState;
  private stateChangeCallbacks: ConnectionStateChangedCallback[] = [];
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();

  private negotiateUrl: string;

  constructor(negotiateUrl: string) {
    this.connectionState = ConnectionState.Disconnected;
    this.negotiateUrl = negotiateUrl;
  }

  /**
   * 接続イベントのセットアップ
   */
  private setupConnectionEvents(): void {
    if (!this.connection) return;

    // 再接続中
    this.connection.onreconnecting(() => {
      this.updateConnectionState(ConnectionState.Reconnecting);
    });

    // 再接続成功
    this.connection.onreconnected(() => {
      this.updateConnectionState(ConnectionState.Connected);
    });

    // 接続切断
    this.connection.onclose(() => {
      this.updateConnectionState(ConnectionState.Disconnected);
    });
  }

  /**
   * 接続状態を更新し、コールバックを通知
   */
  private updateConnectionState(newState: ConnectionState): void {
    this.connectionState = newState;
    this.stateChangeCallbacks.forEach(callback => callback(newState));
  }

  /**
   * SignalR接続を開始
   */
  async start(): Promise<void> {
    if (this.connectionState === ConnectionState.Connected ||
        this.connectionState === ConnectionState.Connecting) {
      console.log('Already connected or connecting');
      return;
    }

    try {
      this.updateConnectionState(ConnectionState.Connecting);

      // negotiate エンドポイントを呼び出して接続情報を取得
      const response = await fetch(`${this.negotiateUrl}/negotiate?negotiateVersion=1`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Negotiate failed: ${response.statusText}`);
      }

      const { url, accessToken } = await response.json();

      // Azure SignalR Service に接続
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(url, {
          accessTokenFactory: () => accessToken
        })
        .withAutomaticReconnect()
        .build();

      // 接続イベントの設定
      this.setupConnectionEvents();

      // 保存されたイベントハンドラを登録
      this.eventHandlers.forEach((handlers, eventName) => {
        handlers.forEach(handler => {
          this.connection!.on(eventName, handler);
        });
      });

      await this.connection.start();
      this.updateConnectionState(ConnectionState.Connected);
      console.log('SignalR connection established');
    } catch (error) {
      this.updateConnectionState(ConnectionState.Disconnected);
      console.error('SignalR connection failed:', error);
      throw error;
    }
  }

  /**
   * SignalR接続を停止
   */
  async stop(): Promise<void> {
    if (this.connectionState === ConnectionState.Disconnected || !this.connection) {
      console.log('Already disconnected');
      return;
    }

    try {
      this.updateConnectionState(ConnectionState.Disconnecting);
      await this.connection.stop();
      this.updateConnectionState(ConnectionState.Disconnected);
      console.log('SignalR connection stopped');
    } catch (error) {
      console.error('SignalR disconnection failed:', error);
      throw error;
    }
  }

  /**
   * SignalRイベントリスナーを登録
   */
  on(eventName: string, handler: (...args: any[]) => void): void {
    // イベントハンドラを保存
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName)!.push(handler);

    // 接続済みの場合は即座に登録
    if (this.connection) {
      this.connection.on(eventName, handler);
    }
  }

  /**
   * SignalRイベントリスナーを削除
   */
  off(eventName: string, handler: (...args: any[]) => void): void {
    // 保存されたハンドラから削除
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }

    // 接続済みの場合は実際のconnectionからも削除
    if (this.connection) {
      this.connection.off(eventName, handler);
    }
  }

  /**
   * 現在の接続状態を取得
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 接続状態変化時のコールバックを登録
   */
  onConnectionStateChanged(callback: ConnectionStateChangedCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * 接続状態変化のコールバックを削除
   */
  offConnectionStateChanged(callback: ConnectionStateChangedCallback): void {
    this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
  }
}

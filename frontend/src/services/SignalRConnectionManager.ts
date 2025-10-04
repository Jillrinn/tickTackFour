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
  private connection: signalR.HubConnection;
  private connectionState: ConnectionState;
  private stateChangeCallbacks: ConnectionStateChangedCallback[] = [];

  constructor(negotiateUrl: string) {
    this.connectionState = ConnectionState.Disconnected;

    // HubConnection の初期化
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(negotiateUrl)
      .withAutomaticReconnect() // 自動再接続設定
      .build();

    // 接続イベントの設定
    this.setupConnectionEvents();
  }

  /**
   * 接続イベントのセットアップ
   */
  private setupConnectionEvents(): void {
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
    if (this.connectionState === ConnectionState.Disconnected) {
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
    this.connection.on(eventName, handler);
  }

  /**
   * SignalRイベントリスナーを削除
   */
  off(eventName: string, handler: (...args: any[]) => void): void {
    this.connection.off(eventName, handler);
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

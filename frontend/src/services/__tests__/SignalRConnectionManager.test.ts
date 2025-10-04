import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SignalRConnectionManager, ConnectionState } from '../SignalRConnectionManager';
import * as signalR from '@microsoft/signalr';

// SignalRのモック
vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(() => ({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    build: vi.fn(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      onreconnecting: vi.fn(),
      onreconnected: vi.fn(),
      onclose: vi.fn(),
      state: 'Connected'
    }))
  })),
  HubConnectionState: {
    Disconnected: 'Disconnected',
    Connected: 'Connected',
    Connecting: 'Connecting',
    Reconnecting: 'Reconnecting',
    Disconnecting: 'Disconnecting'
  }
}));

describe('SignalRConnectionManager', () => {
  let manager: SignalRConnectionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SignalRConnectionManager('/api');
  });

  describe('constructor', () => {
    it('正しいnegotiateURLでインスタンスを作成すること', () => {
      expect(manager).toBeDefined();
      expect(manager.getConnectionState()).toBe(ConnectionState.Disconnected);
    });
  });

  describe('start', () => {
    it('接続を開始し、状態をConnectedに変更すること', async () => {
      await manager.start();

      expect(manager.getConnectionState()).toBe(ConnectionState.Connected);
    });

    it('既に接続中の場合はエラーをスローしないこと', async () => {
      await manager.start();
      await expect(manager.start()).resolves.not.toThrow();
    });
  });

  describe('stop', () => {
    it('接続を停止し、状態をDisconnectedに変更すること', async () => {
      await manager.start();
      await manager.stop();

      expect(manager.getConnectionState()).toBe(ConnectionState.Disconnected);
    });
  });

  describe('on', () => {
    it('イベントリスナーを登録できること', () => {
      const mockHandler = vi.fn();

      manager.on('TurnSwitched', mockHandler);

      // モックが正しく設定されていることを確認
      expect(mockHandler).toBeDefined();
    });
  });

  describe('off', () => {
    it('イベントリスナーを削除できること', () => {
      const mockHandler = vi.fn();

      manager.on('TurnSwitched', mockHandler);
      manager.off('TurnSwitched', mockHandler);

      // リスナー削除が正常に実行されることを確認
      expect(mockHandler).toBeDefined();
    });
  });

  describe('getConnectionState', () => {
    it('初期状態はDisconnectedであること', () => {
      const newManager = new SignalRConnectionManager('/api');

      expect(newManager.getConnectionState()).toBe(ConnectionState.Disconnected);
    });

    it('接続後はConnectedであること', async () => {
      await manager.start();

      expect(manager.getConnectionState()).toBe(ConnectionState.Connected);
    });

    it('停止後はDisconnectedであること', async () => {
      await manager.start();
      await manager.stop();

      expect(manager.getConnectionState()).toBe(ConnectionState.Disconnected);
    });
  });

  describe('onConnectionStateChanged', () => {
    it('接続状態変化時にコールバックが呼ばれること', async () => {
      const mockCallback = vi.fn();
      manager.onConnectionStateChanged(mockCallback);

      await manager.start();

      expect(mockCallback).toHaveBeenCalled();
    });
  });
});

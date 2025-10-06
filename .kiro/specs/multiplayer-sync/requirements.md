# Requirements Document

## Project Description (Input)

既存のインメモリータイマー（multiplayer-game-timer Phase 1完了）に、マルチプレイヤー同期機能を追加する。

### Phase 1: Cosmos DB統合
- ゲーム状態（タイマー値、プレイヤー数、アクティブプレイヤー）をCosmos DB Table APIに永続化
- ブラウザリロード時に前回の状態を復元
- 複数デバイスから同じゲーム状態にアクセス可能（手動リロード同期）
- 5秒ごとのポーリングでサーバー状態を取得

### Phase 2: SignalR統合
- SignalRによる双方向リアルタイム通信（<1秒での同期）
- 1つのデバイスでの操作を他のすべてのデバイスに即座に反映
- 接続断時の自動再接続機能
- TurnSwitched, TimerUpdated, GameReset, PlayersUpdatedイベントのブロードキャスト

### 技術スタック
- Azure Functions（Managed Functions in Static Web Apps）
- Cosmos DB Free Tier（25GB, 400 RU/s）
- SignalR Service Free Tier（20同時接続, 20,000メッセージ/日）
- TypeScript, Node.js 20, @azure/data-tables, @azure/functions, @microsoft/signalr

### 前提条件
- multiplayer-game-timer Phase 1が完了していること
- React 18 + TypeScript + Viteのフロントエンドが動作していること

## Requirements
<!-- Will be generated in /kiro:spec-requirements phase -->

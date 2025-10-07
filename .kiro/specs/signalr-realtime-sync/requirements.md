# Requirements Document

## Project Description (Input)

multiplayer-sync仕様のPhase 2として定義されていたSignalR Serviceによるリアルタイム双方向通信機能を独立した仕様として切り出し。

既存のCosmos DBポーリング同期（5秒間隔）から、SignalR Serviceを使用したリアルタイム同期（<1秒）への移行を実現します。これにより、複数デバイス間でのゲーム状態の即座な同期を提供し、真のマルチプレイヤー体験を実現します。

Azure SignalR Service Free Tier（同時接続20、1日20Kメッセージ）を活用し、コスト0円での運用を維持します。

**前提条件**:
- multiplayer-sync（Phase 1）が完了していること
  - Cosmos DB Table APIによる永続化
  - バックエンド主導の時間計算
  - ETag楽観的ロック制御
  - 5秒ポーリング同期

**対象範囲**:
- Azure SignalR Service接続と管理
- リアルタイムイベント配信（<1秒同期）
- 自動再接続機能
- ポーリング同期からのフォールバック/復帰

## Requirements

### 要件1: SignalRリアルタイム通信
**目的:** ゲーム参加者として、1つのデバイスでの操作を他のすべてのデバイスに即座に反映できるようにすることで、リアルタイムなマルチプレイヤー体験を提供する

#### 受入基準
1. WHEN アプリケーションが起動した時 THEN SignalRリアルタイム同期システムは Azure SignalR Serviceに接続すること
2. WHEN SignalR接続が確立された時 THEN SignalRリアルタイム同期システムは 接続状態を「接続中」と表示すること
3. WHEN タイマー操作（ターン切り替え、一時停止、再開、リセット）が実行された時 THEN SignalRリアルタイム同期システムは 1秒以内にすべての接続デバイスに変更を配信すること
4. WHEN 他のデバイスからイベント（TurnSwitched, TimerUpdated, GameReset, PlayersUpdated）を受信した時 THEN SignalRリアルタイム同期システムは UIを即座に更新すること
5. WHILE SignalR接続が確立されている THE SignalRリアルタイム同期システムは ポーリング同期を無効化すること

### 要件2: 自動再接続
**目的:** ゲーム参加者として、ネットワーク接続が一時的に切断されても自動的に再接続できるようにすることで、中断のない体験を提供する

#### 受入基準
1. WHEN SignalR接続が切断された時 THEN SignalRリアルタイム同期システムは 自動再接続を試行すること
2. WHILE 再接続を試行中 THE SignalRリアルタイム同期システムは 接続状態を「再接続中」と表示すること
3. WHEN 再接続に成功した時 THEN SignalRリアルタイム同期システムは Cosmos DBから最新の状態を取得しUIを同期すること
4. IF 再接続に失敗した時 THEN SignalRリアルタイム同期システムは ポーリング同期に切り替え接続状態を「切断中（ポーリングモード）」と表示すること

### 要件3: Azure Functions SignalR統合
**目的:** システム管理者として、Azure Functions（Managed Functions in Static Web Apps）を通じてSignalRにアクセスできるようにすることで、セキュアかつスケーラブルなリアルタイム通信を提供する

#### 受入基準
1. WHERE Azure Functions API THE SignalRリアルタイム同期システムは GET /api/negotiate エンドポイントでSignalR接続情報を取得できること
2. WHERE Azure Functions API THE SignalRリアルタイム同期システムは POST /api/switchTurn エンドポイントでターン切り替えとSignalRブロードキャストを実行できること
3. WHERE Azure Functions API THE SignalRリアルタイム同期システムは POST /api/pauseGame エンドポイントで一時停止とSignalRブロードキャストを実行できること
4. WHERE Azure Functions API THE SignalRリアルタイム同期システムは POST /api/resumeGame エンドポイントで再開とSignalRブロードキャストを実行できること
5. WHERE Azure Functions API THE SignalRリアルタイム同期システムは POST /api/resetGame エンドポイントでリセットとSignalRブロードキャストを実行できること
6. WHEN Azure Functions APIがエラーを返した時 THEN SignalRリアルタイム同期システムは エラーメッセージをユーザーに表示すること
7. WHERE Azure Functions API THE SignalRリアルタイム同期システムは CORS設定でフロントエンドドメインからのアクセスを許可すること

### 要件4: SignalR無料層リソース制約対応
**目的:** システム管理者として、Azure SignalR Service無料層の制約内でシステムが安定動作するようにすることで、コスト0円での運用を維持する

#### 受入基準
1. WHERE SignalR Service Free Tier THE SignalRリアルタイム同期システムは 同時接続20以内で動作すること
2. WHERE SignalR Service Free Tier THE SignalRリアルタイム同期システムは 1日20,000メッセージ以内で動作すること（1秒更新で約5.5時間分）
3. WHEN SignalRメッセージ上限に近づいた時 THEN SignalRリアルタイム同期システムは 更新頻度を2秒に調整すること
4. WHERE Azure Functions Consumption Plan THE SignalRリアルタイム同期システムは 月100万リクエスト以内で動作すること（SignalR関連API呼び出し含む）
5. WHEN 無料層制約に達した時 THEN SignalRリアルタイム同期システムは 警告メッセージを表示しポーリング同期に自動切り替えすること

### 要件5: SignalRエラーハンドリングとフォールバック
**目的:** ゲーム参加者として、SignalR接続エラーやサービス障害時にもポーリング同期で基本機能を使用できるようにすることで、信頼性の高い体験を提供する

#### 受入基準
1. WHEN SignalR接続が確立できない時 THEN SignalRリアルタイム同期システムは ポーリング同期で代替すること
2. WHEN SignalR接続が切断された時 THEN SignalRリアルタイム同期システムは 即座にポーリング同期を有効化すること
3. WHERE エラー発生時 THE SignalRリアルタイム同期システムは ユーザーに分かりやすいエラーメッセージと復旧手順を表示すること
4. WHEN フォールバックモード（ポーリング同期）で動作中 THE SignalRリアルタイム同期システムは 通常モード（SignalR同期）への復帰を定期的に試行すること
5. WHEN SignalRサービスが利用可能に復帰した時 THEN SignalRリアルタイム同期システムは 自動的にSignalR同期に切り替えポーリングを無効化すること

### 要件6: 接続状態の可視化
**目的:** ゲーム参加者として、現在の同期方式（SignalR/ポーリング）と接続状態を確認できるようにすることで、システムの動作状況を把握できるようにする

#### 受入基準
1. WHEN SignalR接続が確立された時 THEN SignalRリアルタイム同期システムは 接続状態インジケーターを「✅ リアルタイム同期中」と表示すること
2. WHEN SignalR再接続を試行中の時 THEN SignalRリアルタイム同期システムは 接続状態インジケーターを「🔄 再接続中...」と表示すること
3. WHEN ポーリング同期にフォールバックした時 THEN SignalRリアルタイム同期システムは 接続状態インジケーターを「⚠️ ポーリングモード（5秒間隔）」と表示すること
4. WHEN Azure Functions APIエラーが発生した時 THEN SignalRリアルタイム同期システムは 接続状態インジケーターを「❌ 接続エラー - インメモリーモード」と表示すること
5. WHERE 接続状態インジケーター THE SignalRリアルタイム同期システムは ユーザーが状態を常に確認できるよう画面上部に固定表示すること

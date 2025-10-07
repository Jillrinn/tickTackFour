

要件集
```terminal
/kiro:spec-init frontendのUXを向上させる仕様を追加したいです。必要に応じて要件を分割してください。必要に応じてscのコマンドを使用し、専門のペルソナを活用してください。
- プレイヤー名を入力できる機能
- 「次のプレイヤー」ボタンをアクセスしやすい場所、例えば一番上などに配置する
- アクティブ解除の機能は不要（一時停止で十分）
- 現在のゲーム状態を画面に表示させる機能は不要（内部的には持っていてもいいが、ユーザには不要な情報、アクティブプレイヤー、一時停止状態、現在のプレイヤー数などは画面上からわかるため）
- カウントアップモードの時に+10秒カウントダウンの秒数設定の表示は不要




/kiro:spec-init タイマー機能を微調整する仕様を追加したいです。
- 順番を抜かしてアクティブにする機能は不要です。削除し、「次のプレイヤーへ」を押下時に次のプレイヤーをアクティブにする機能のみで良いです。
- 一時停止はあっていいです。
- タイマーのリセットもあっていいです。
- ゲームの途中で人数を変更する場合はゲームをリセットしますか？とモーダルなどで確認した上でゲームをリセットし、新しいゲームを始めるようにしてください。



/kiro:spec-init カウントアップ中は現在最も時間を使っているプレイヤーを別枠で表示し、「最も時間を使っているプレイヤー: ○○ (00:00:00)」のように表示してください。
/kiro:spec-init e2eテストを追加してください。将来的にはbackendアプリを経由したDBへの接続、backend->SignalR->frontendの流れでリアルタイム連携の機能を追加しようと考えていますので、それを考慮したe2eのテスト構成にしてください。ただし、今回追加するe2eテストは現在の実装の状態でのe2eテストでいいです。
/kiro:spec-init frontendのデザイン・UXをさらに向上させたいです。
- プレイヤー人数はプルダウンで選択できるようにしてください
- 次のプレイヤーへ、一時停止、リセットとそれ以外は頻度が異なるのでセクションを分けてください
- 次のプレイヤーボタンと現在のプレイヤーとその経過時間を表示する部分は常に画面上部に表示されるようにしてください
- カウントアップとカウントダウンはUIでもトグルスイッチなどの切替式で表現してください

/kiro:spec-init カウントアップタイマーに新機能を追加します。
現在は単純に経過時間を保持するのみとなっていますが、累計の経過時間とは別に現在のターンでの経過時間を表示する機能を追加してください。
全てのプレイヤーの累計でゲーム全体のプレイ時間を表示する機能を追加してください。
```


現在、frontendの改修をした後にchrome-devtoolsで確認をしてもらう形となっていますが、
e2eテストを追加し、それを実行して確認する形に変更したいです。
chrome-devtoolsでの確認は不要と考えています。

/kiro:spec-init multiplayer-sync "既存のインメモリータイマー（multiplayer-game-timer Phase 1完了）に、マルチプレイヤー同期機能を追加する。

【Phase 1: Cosmos DB統合】
- ゲーム状態（タイマー値、プレイヤー数、アクティブプレイヤー）をCosmos DB Table APIに永続化
- ブラウザリロード時に前回の状態を復元
- 複数デバイスから同じゲーム状態にアクセス可能（手動リロード同期）
- 5秒ごとのポーリングでサーバー状態を取得

【Phase 2: SignalR統合】
- SignalRによる双方向リアルタイム通信（<1秒での同期）
- 1つのデバイスでの操作を他のすべてのデバイスに即座に反映
- 接続断時の自動再接続機能
- TurnSwitched, TimerUpdated, GameReset, PlayersUpdatedイベントのブロードキャスト

【技術スタック】
- Azure Functions（Managed Functions in Static Web Apps）
- Cosmos DB Free Tier（25GB, 400 RU/s）
- SignalR Service Free Tier（20同時接続, 20,000メッセージ/日）
- TypeScript, Node.js 20, @azure/data-tables, @azure/functions, @microsoft/signalr

【前提条件】
- multiplayer-game-timer Phase 1が完了していること
- React 18 + TypeScript + Viteのフロントエンドが動作していること"

⏺ ---
Phase 3: 要件定義

🎯 目的

詳細な要件（WHEN-THEN-WHERE形式）を定義し、受入基準を明確化

📋 使用プロンプト（Kiroコマンド）

/kiro:spec-requirements multiplayer-sync

💡 補足プロンプト（要件生成後のレビュー）

@.kiro/specs/multiplayer-sync/requirements.md

以下の観点で要件を検証してください：

【要件1: データ永続化（Cosmos DB）】
- ゲーム状態の保存・復元が明確に定義されているか
- 複数デバイスでの状態共有（手動リロード同期）が記述されているか
- Cosmos DB Free Tierの制約（25GB, 400 RU/s）が考慮されているか
- エラーハンドリング（接続失敗、楽観的ロック競合）が含まれているか

【要件2: リアルタイム同期（SignalR）】
- <1秒でのリアルタイム同期が明記されているか
- イベント種類（TurnSwitched, TimerUpdated, GameReset, PlayersUpdated）が定義されているか
- 自動再接続処理が要件に含まれているか
- SignalR Free Tierの制約（20接続, 20K msg/日）が考慮されているか

【要件3: Azure統合】
- Managed Functions（Static Web Apps統合）の使用が明記されているか
- 環境変数管理が定義されているか
- CI/CDパイプライン（GitHub Actions）が含まれているか

不足している受入基準があれば追加してください。

⏺ ---
Phase 4: 設計書作成

🎯 目的

技術設計（アーキテクチャ、データモデル、API、検証プロセス）を詳細化

📋 使用プロンプト（Kiroコマンド）

/kiro:spec-design multiplayer-sync -y

💡 補足プロンプト（設計書生成後のレビュー）

@.kiro/specs/multiplayer-sync/design.md

以下の設計要素が含まれているか検証してください：

【1. アーキテクチャ設計】
- フロントエンド（React）↔ Azure Functions ↔ Cosmos DBの接続フロー
- SignalRハブとクライアント接続の構成図
- Phase 1（ポーリング同期）とPhase 2（リアルタイム同期）の違いが明確か

【2. データモデル】
- GameStateEntityの構造（PartitionKey, RowKey, プレイヤー配列、タイマーモード）
- Cosmos DB Table APIのスキーマ定義
- ETagによる楽観的ロック処理

【3. API設計】
Phase 1（Cosmos DB）:
- GET /api/game: ゲーム状態取得
- POST /api/updateGame: 状態保存
- POST /api/switchTurn: ターン切り替え
- POST /api/resetGame, /api/pauseGame, /api/resumeGame

Phase 2（SignalR）:
- GET /api/negotiate: SignalR接続ネゴシエーション
- イベント: TurnSwitched, TimerUpdated, GameReset, PlayersUpdated

【4. フロントエンド統合】
- useEffect でのゲーム状態初期化（GET /api/game）
- 5秒ごとのポーリング（Phase 1）
- SignalR HubConnectionの接続管理（Phase 2）
- イベントリスナーの登録と状態更新ロジック

【5. 検証プロセス】
- TDD（テスト → 実装 → リファクタリング）
- Chrome DevTools MCPでの実機検証手順
- 複数デバイス同期テスト（Phase 1: 手動リロード, Phase 2: リアルタイム）

不足している設計要素があれば追加してください。

⏺ ---
Phase 5: タスク分解

🎯 目的

実装可能な具体的タスクに分解し、TDD + Chrome DevTools検証プロセスを組み込む

📋 使用プロンプト（Kiroコマンド）

/kiro:spec-tasks multiplayer-sync -y

💡 補足プロンプト（タスク生成後のレビュー）

@.kiro/specs/multiplayer-sync/tasks.md

以下の観点でタスクを検証し、不足があれば追加してください：

【Phase 1: Cosmos DB統合のタスク構成】
1. Azure Functions APIプロジェクトのセットアップ
    - Node.js 20 + TypeScriptプロジェクト初期化
    - @azure/functions, @azure/data-tables インストール
    - ビルド設定（tsconfig.json, package.json）

2. Cosmos DB接続とCRUD操作
    - TableClientの接続設定
    - GameStateEntityのCRUD実装
    - ETagによる楽観的ロック処理
    - ユニットテスト（モック環境）

3. API エンドポイント実装
    - GET /api/game（状態取得、初回初期化）
    - POST /api/updateGame（状態保存）
    - POST /api/switchTurn（ターン切り替え + DB更新）
    - POST /api/resetGame, /api/pauseGame, /api/resumeGame
    - バリデーション（Zodスキーマ）

4. フロントエンド統合
    - useEffectでの初期化（GET /api/game）
    - タイマー操作時のAPI呼び出し
    - 5秒ごとのポーリング（GET /api/game）
    - 楽観的更新 + サーバー確認

5. TDD + Chrome DevTools検証
    - 各APIのユニットテスト
    - 統合テスト（API → DB → フロントエンド）
    - Chrome DevToolsでの実機検証（複数デバイス、手動リロード同期）
    - tasks.md更新 + Gitコミット

【Phase 2: SignalR統合のタスク構成】
1. SignalRサーバーサイド設定
    - Azure Functions SignalR Output Binding設定
    - GET /api/negotiate実装
    - イベント送信関数（TurnSwitched, TimerUpdated, GameReset, PlayersUpdated）

2. SignalRクライアント接続
    - @microsoft/signalr インストール
    - HubConnectionBuilderによる接続初期化
    - 自動再接続設定（withAutomaticReconnect）
    - 接続状態管理（接続中/切断中/再接続中UI）

3. イベントリスナー実装
    - on('TurnSwitched'), on('TimerUpdated'), on('GameReset'), on('PlayersUpdated')
    - 受信イベントからの状態更新ロジック
    - ポーリング削除（Phase 1の5秒ポーリング除去）

4. エラーハンドリング
    - 接続失敗時の自動再接続
    - 再接続中のUI表示
    - 再接続成功後の状態同期（GET /api/game）

5. E2Eテスト + 検証
    - Playwrightによる複数タブ同時操作テスト
    - リアルタイム同期の遅延測定（<1秒確認）
    - Chrome DevToolsでの最終検証
    - tasks.md更新 + Gitコミット

【各タスクに含まれるべき要素】
✅ TDD（RED → GREEN → REFACTOR）
✅ npm test 実行と全テストパス確認
✅ Chrome DevTools MCPでの実機検証
✅ 検証結果の記録（スナップショット、ログ）
✅ tasks.md更新（[x]チェック）
✅ 詳細なGitコミットメッセージ

不足しているタスクや検証プロセスがあれば追加してください。

⏺ ---
📊 完成：各フェーズのプロンプト設計まとめ

全体フロー

Phase 1: 既存スペックのクリーンアップ
↓ （手動編集）
Phase 2: 新スペック初期化
↓ （/kiro:spec-init）
Phase 3: 要件定義
↓ （/kiro:spec-requirements）
Phase 4: 設計書作成
↓ （/kiro:spec-design -y）
Phase 5: タスク分解
↓ （/kiro:spec-tasks -y）
実装フェーズへ

  ---
🎯 Phase別プロンプト一覧

| Phase | コマンド/プロンプト                          | 目的          | 出力                   |
  |-------|-------------------------------------|-------------|----------------------|
| 1     | 手動編集プロンプト                           | バックエンド要素削除  | クリーンな既存スペック          |
| 2     | /kiro:spec-init                     | 新スペック骨格作成   | spec.json, README.md |
| 3     | /kiro:spec-requirements + レビュープロンプト | 詳細要件定義      | requirements.md      |
| 4     | /kiro:spec-design -y + レビュープロンプト    | 技術設計詳細化     | design.md            |
| 5     | /kiro:spec-tasks -y + レビュープロンプト     | タスク分解とTDD統合 | tasks.md             |

  ---
💡 追加の実装フェーズプロンプト

Phase 1実装開始時

@.kiro/specs/multiplayer-sync/tasks.md
@.kiro/specs/multiplayer-sync/design.md

Phase 1（Cosmos DB統合）のタスク1を開始します。

【実装手順】
1. TDD: テストケース作成（RED）
2. 最小実装（GREEN）
3. リファクタリング（REFACTOR）
4. npm test で全テストパス確認
5. Chrome DevTools MCPで実機検証
6. tasks.md更新（[x]チェック）
7. Gitコミット（詳細メッセージ）

タスク1「Azure Functions APIプロジェクトのセットアップ」を実装してください。

Phase 2実装開始時

@.kiro/specs/multiplayer-sync/tasks.md
@.kiro/specs/multiplayer-sync/design.md

Phase 2（SignalR統合）のタスク1を開始します。

【前提確認】
- Phase 1（Cosmos DB統合）が完了していること
- 複数デバイスでの手動リロード同期が動作していること

【実装手順】
同じTDD + Chrome DevTools検証プロセスに従い、SignalRリアルタイム同期を追加してください。

タスク1「SignalRサーバーサイド設定」を実装してください。

  ---
✅ 最終チェックリスト

各フェーズ完了時に以下を確認：

- 要件が明確に定義されている（WHEN-THEN-WHERE形式）
- 設計が技術的に実現可能
- タスクが実装可能な粒度に分解されている
- TDDプロセスが各タスクに組み込まれている
- Chrome DevTools検証手順が明記されている
- Gitコミット戦略が定義されている
- Azure無料サービスの制約が考慮されている

これで、既存スペックのクリーンアップから新スペックの実装まで、一貫したワークフローで進められます。


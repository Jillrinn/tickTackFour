# 実装計画

## 概要
本計画は、既存のインメモリータイマー（multiplayer-game-timer Phase 1完了）に、Cosmos DB永続化とポーリング同期機能を追加するものです。バックエンド主導の時間計算により、複数デバイス間での状態共有を実現します。

---

- [ ] 1. バックエンド基盤とデータ層の構築

- [x] 1.1 Cosmos DB接続設定とTableClientの初期化
  - Azure Cosmos DBアカウントとTable APIデータベースの環境変数設定
  - TableClientの初期化と接続テスト
  - エラーハンドリング（接続失敗時のフォールバック準備）
  - 環境変数のバリデーション（未設定時の警告）
  - _Requirements: 1.1, 1.7, 4.1_

- [x] 1.2 GameStateEntityのCRUD操作実装
  - ゲーム状態の取得（初回アクセス時はデフォルト状態で初期化）
  - ゲーム状態の作成（初回アクセス時の自動初期化）
  - ゲーム状態の更新（ETag指定による条件付き更新）
  - プレイヤー配列のJSON文字列化とパース処理
  - 主キー設計の実装（PartitionKey="game", RowKey="default"固定）
  - _Requirements: 1.1, 1.2, 1.6_

- [x] 1.3 バックエンド主導の時間計算ロジック実装
  - ターン開始時刻（turnStartedAt）から現在時刻までの経過時間計算
  - 累積経過時間（accumulatedSeconds）への加算処理
  - 一時停止状態判定による計算分岐（isPaused時は累積のみ返す）
  - アクティブプレイヤー判定による計算分岐（非アクティブ時は累積のみ返す）
  - ISO8601タイムスタンプの処理とミリ秒変換
  - _Requirements: 1.5.1, 1.5.2, 1.5.3_

- [x] 1.4 ETag楽観的ロック再試行メカニズムの実装
  - ETagを使用した条件付き更新の実装
  - 412 Conflict検出とエラーハンドリング
  - 最大3回までの自動再試行ロジック（指数バックオフ: 100ms, 200ms, 400ms）
  - 再試行時の最新状態取得とETag更新
  - 3回失敗後のConflictエラーレスポンス返却
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 2. Azure Functions APIエンドポイントの実装

- [x] 2.1 ゲーム状態取得エンドポイントの実装（GET /api/game）
  - HTTPトリガーの設定（GET メソッド、/api/gameパス）
  - Cosmos DBから状態取得（初回アクセス時は初期化）
  - バックエンドで全プレイヤーの経過時間を計算
  - GameStateWithTime型のレスポンス生成（計算済み時間含む）
  - ETagをレスポンスに含める
  - エラーハンドリング（500エラー時のフォールバック情報）
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 2.2 ターン切り替えエンドポイントの実装（POST /api/switchTurn）
  - HTTPトリガーの設定（POST メソッド、/api/switchTurnパス）
  - リクエストからETagを取得（経過時間は受け取らない）
  - 現在のアクティブプレイヤーの経過時間を計算
  - 累積経過時間に加算
  - アクティブプレイヤーインデックスを循環（(current + 1) % playerCount）
  - 新しいturnStartedAtを現在時刻に設定
  - ETag楽観的ロック更新（再試行メカニズム使用）
  - _Requirements: 1.4, 1.5.4, 4.3_

- [x] 2.3 一時停止エンドポイントの実装（POST /api/pause）
  - HTTPトリガーの設定（POST メソッド、/api/pauseパス）
  - 現在のアクティブプレイヤーの経過時間を計算
  - 累積経過時間に加算
  - pausedAtに現在時刻を設定（ISO8601）
  - isPausedフラグをtrueに設定
  - ETag楽観的ロック更新
  - _Requirements: 1.5.5, 4.4_

- [x] 2.4 再開エンドポイントの実装（POST /api/resume）
  - HTTPトリガーの設定（POST メソッド、/api/resumeパス）
  - turnStartedAtに現在時刻を設定（新しいターン開始）
  - pausedAtをnullに設定
  - isPausedフラグをfalseに設定
  - ETag楽観的ロック更新
  - _Requirements: 1.5.6, 4.5_

- [x] 2.5 ゲームリセットエンドポイントの実装（POST /api/reset）
  - HTTPトリガーの設定（POST メソッド、/api/resetパス）
  - デフォルトゲーム状態の生成（4人、カウントアップモード、全タイマー0:00）
  - 全プレイヤーのaccumulatedSecondsを0にリセット
  - turnStartedAtを現在時刻に設定
  - activePlayerIndexを0にリセット
  - ETag楽観的ロック更新
  - _Requirements: 4.6_

- [x] 2.6 汎用更新エンドポイントの実装（POST /api/updateGame）
  - HTTPトリガーの設定（POST メソッド、/api/updateGameパス）
  - プレイヤー数変更機能（4-6人の範囲バリデーション）
  - タイマーモード変更機能（countup/countdown切替）
  - カウントダウン秒数変更機能
  - プレイヤー名変更機能
  - バリデーションエラー時の400エラーレスポンス
  - ETag楽観的ロック更新
  - _Requirements: 4.2_

- [ ] 3. フロントエンド統合とポーリング同期の実装

- [x] 3.1 ポーリング同期サービスの実装
  - React useEffectで5秒間隔のsetInterval設定
  - GET /api/gameへのfetchリクエスト
  - レスポンスからGameStateWithTimeを取得
  - useStateで状態とETagを更新
  - コンポーネントアンマウント時のクリーンアップ（clearInterval）
  - ポーリングエラー時の継続処理（次回ポーリングを停止しない）
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 バックエンド計算済み時間の表示ロジック実装
  - サーバー時間（serverTime）をuseStateで管理
  - 最終同期時刻（lastSyncTime）を記録
  - 表示用ローカルタイマー（100ms間隔）で滑らかなUI更新
  - 一時停止時はserverTimeのみ表示（ローカル補間なし）
  - アクティブプレイヤー切替時の時間リセット処理
  - _Requirements: 1.5.7_

- [x] 3.3 既存GameTimerコンポーネントのAPI連携対応
  - ターン切り替えボタンクリック時にPOST /api/switchTurn送信
  - 一時停止ボタンクリック時にPOST /api/pause送信
  - 再開ボタンクリック時にPOST /api/resume送信
  - リセットボタンクリック時にPOST /api/reset送信
  - プレイヤー数/モード変更時にPOST /api/updateGame送信
  - リクエストにETagを含める（経過時間は含めない）
  - _Requirements: 1.3, 1.5.8_

- [x] 3.4 ETag管理と楽観的ロック対応の実装
  - レスポンスからETagを抽出してuseStateで保持
  - POSTリクエスト送信時にETagをヘッダーまたはボディに含める
  - 412 Conflictレスポンス検出
  - 自動再試行ロジック（フロントエンド側は手動リロード促進のみ）
  - _Requirements: 3.1, 3.4_

- [x] 4. エラーハンドリングとフォールバックの実装

- [x] 4.1 インメモリーモードへのフォールバック機能実装
  - API接続失敗検出（fetch エラーハンドリング）
  - インメモリーモードフラグの設定
  - ローカルストレージへの状態保存（将来実装）
  - フォールバックモード中のUI表示（警告メッセージ）
  - 定期的なAPI接続リトライ（30秒間隔）
  - 接続復帰時のCosmos DB同期への自動切替
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 4.2 ネットワークエラーとタイムアウトハンドリングの実装
  - fetchタイムアウト設定（5秒）
  - AbortControllerを使用したリクエストキャンセル
  - ネットワークエラー時のエラーメッセージ表示
  - 再試行ボタンの提供
  - エラー詳細のログ出力（Application Insights連携準備）
  - _Requirements: 6.3_

- [x] 4.3 楽観的ロック競合のエラー表示実装
  - 412 Conflictレスポンスの検出
  - 3回再試行後の失敗検出
  - ユーザーフレンドリーなエラーメッセージ表示
  - 手動リロード促進メッセージとボタン
  - エラー発生時のログ記録
  - _Requirements: 3.4, 6.3_

- [x] 4.4 ポーリング失敗時の復旧メカニズム実装
  - ポーリングエラー時の現在状態保持
  - エラー発生後も次回ポーリングを継続
  - 連続失敗回数のカウント（3回連続でインメモリーモード検討）
  - 成功時の失敗カウントリセット
  - _Requirements: 2.3_

- [ ] 5. テストとデプロイ準備

- [ ] 5.1 バックエンドユニットテストの実装
  - GameStateService CRUD操作のモックテスト
  - 時間計算ロジックのユニットテスト（各種条件分岐）
  - ETag再試行メカニズムのテスト（1回、2回、3回失敗シナリオ）
  - Cosmos DB接続エラーハンドリングのテスト
  - _Requirements: 全要件の品質保証_

- [ ] 5.2 フロントエンドユニットテストの実装
  - ポーリングサービスのuseEffectテスト（5秒間隔確認）
  - エラーハンドリングのテスト（ネットワークエラー、タイムアウト）
  - ETag管理のテスト（更新、競合検出）
  - インメモリーモードフォールバックのテスト
  - _Requirements: 全要件の品質保証_

- [ ] 5.3 E2Eテストの実装
  - 複数タブでのポーリング同期テスト（デバイスAで操作→5秒後デバイスBで反映）
  - ブラウザリロード後の状態復元テスト
  - 楽観的ロック競合シナリオのテスト（同時更新）
  - インメモリーモードフォールバックのテスト（API停止シミュレーション）
  - _Requirements: 全要件のエンドツーエンド検証_

- [ ] 5.4 Azure Static Web Appsへのデプロイ
  - ローカルビルドの最終確認（frontend + api）
  - mainブランチへのpush
  - GitHub Actions CI/CDパイプライン実行確認
  - デプロイ成功確認
  - 本番環境での動作確認

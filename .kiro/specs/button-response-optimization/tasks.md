# 実装タスク: ボタンレスポンス最適化

## Phase 1: コンポーネントメモ化とイベントハンドラ最適化

### 1. PlayerListコンポーネントの最適化

- [ ] 1.1 PlayerListコンポーネントにReact.memoを適用する
  - 既存のPlayerListコンポーネントをReact.memoでラップ
  - カスタム比較関数を実装し、プロパティが実際に変更された場合のみ再レンダリング
  - players配列、activePlayerId、isGameActive等の比較ロジックを追加
  - TypeScript型定義を更新し、React.FCとReact.memoの型を正しく設定
  - _Requirements: 2.1, 2.2_

- [ ] 1.2 PlayerListのユニットテストを作成する
  - プロパティが変更されていない場合に再レンダリングされないことを検証
  - プロパティが変更された場合のみ再レンダリングされることを検証
  - カスタム比較関数の境界条件テスト（undefined、null、空配列等）
  - テストカバレッジ90%以上を確保
  - _Requirements: 2.2, 4.6_

### 2. PrimaryControlsコンポーネントの最適化

- [ ] 2.1 PrimaryControlsコンポーネントにReact.memoを適用する
  - 既存のPrimaryControlsコンポーネントをReact.memoでラップ
  - onSwitchTurn、onTogglePauseハンドラが変更された場合のみ再レンダリング
  - isPaused、isGameActive、activePlayerNameの比較ロジックを追加
  - TypeScript型定義を更新
  - _Requirements: 2.1, 2.3_

- [ ] 2.2 PrimaryControlsのユニットテストを作成する
  - プロパティが変更されていない場合に再レンダリングされないことを検証
  - ボタンクリック時にハンドラが正しく呼び出されることを検証
  - テストカバレッジ90%以上を確保
  - _Requirements: 2.3, 4.6_

### 3. SettingsControlsコンポーネントの最適化

- [ ] 3.1 SettingsControlsコンポーネントにReact.memoを適用する
  - 既存のSettingsControlsコンポーネントをReact.memoでラップ
  - onPlayerCountChange、onTimerModeChange、onResetハンドラの比較ロジック追加
  - playerCount、timerMode、isGameActiveの比較ロジックを追加
  - TypeScript型定義を更新
  - _Requirements: 2.1, 2.3_

- [ ] 3.2 SettingsControlsのユニットテストを作成する
  - プロパティが変更されていない場合に再レンダリングされないことを検証
  - ボタンクリック時にハンドラが正しく呼び出されることを検証
  - テストカバレッジ90%以上を確保
  - _Requirements: 2.3, 4.6_

## Phase 2: 状態管理フックの最適化（フォールバックモード）

### 4. useGameStateフックのイベントハンドラメモ化

- [ ] 4.1 全アクションハンドラにuseCallbackを適用する
  - switchTurn、togglePause、reset、changePlayerCount、changeTimerMode、updatePlayerNameの6つのハンドラをuseCallbackでメモ化
  - 依存配列を適切に設定（gameStateはsetStateのprevで参照するため、依存配列は空）
  - 各ハンドラの関数参照が安定していることを確認
  - TypeScript型定義を更新し、メモ化されたハンドラの型を明示
  - _Requirements: 2.3, 3.1_

- [ ] 4.2 useGameStateフックのユニットテストを作成する
  - 各ハンドラの参照が再レンダリング後も安定していることを検証
  - 複数回の再レンダリング後も同じ関数参照が返されることをテスト
  - テストカバレッジ95%以上を確保
  - _Requirements: 2.3, 4.6_

### 5. useGameStateフックの計算値メモ化

- [ ] 5.1 計算コストの高い値にuseMemoを適用する
  - totalElapsedTime、topTimePlayer、activePlayerの3つの計算値をuseMemoでキャッシュ
  - 依存配列を適切に設定（gameState.playersが変更された場合のみ再計算）
  - 計算結果が正しくキャッシュされることを確認
  - TypeScript型定義を更新
  - _Requirements: 2.4, 3.4_

- [ ] 5.2 useMemo最適化のユニットテストを作成する
  - プレイヤー配列が変更されていない場合、計算が再実行されないことを検証
  - プレイヤー配列が変更された場合のみ再計算されることを検証
  - 計算結果が正確であることを検証
  - テストカバレッジ95%以上を確保
  - _Requirements: 3.4, 4.6_

## Phase 3: 状態管理フックの最適化（通常モード）

### 6. useServerGameStateフックのイベントハンドラメモ化

- [ ] 6.1 全アクションハンドラにuseCallbackを適用する
  - switchTurn、togglePause、reset、changePlayerCount、changeTimerMode、updatePlayerNameの6つのハンドラをuseCallbackでメモ化
  - 非同期ハンドラ（async関数）のメモ化を実装
  - 依存配列を適切に設定
  - TypeScript型定義を更新（Promise<void>を返す型）
  - _Requirements: 2.3, 3.1_

- [ ] 6.2 useServerGameStateフックのユニットテストを作成する
  - 各ハンドラの参照が再レンダリング後も安定していることを検証
  - 非同期ハンドラが正しく動作することを検証（Promise resolveを確認）
  - テストカバレッジ95%以上を確保
  - _Requirements: 2.3, 4.6_

### 7. useServerGameStateフックの計算値メモ化

- [ ] 7.1 計算コストの高い値にuseMemoを適用する
  - totalElapsedTime、topTimePlayer、activePlayerの3つの計算値をuseMemoでキャッシュ
  - 依存配列を適切に設定（gameState.playersが変更された場合のみ再計算）
  - フォールバックモードと同じ計算ロジックを使用
  - TypeScript型定義を更新
  - _Requirements: 2.4, 3.4_

- [ ] 7.2 useMemo最適化のユニットテストを作成する
  - プレイヤー配列が変更されていない場合、計算が再実行されないことを検証
  - 計算結果が正確であることを検証
  - フォールバックモードと同じ結果が返されることを検証（整合性テスト）
  - テストカバレッジ95%以上を確保
  - _Requirements: 3.4, 4.6_

### 8. 楽観的UI更新の実装（通常モード）

- [ ] 8.1 楽観的UI更新ロジックを各ハンドラに追加する
  - ボタンクリック時、まずUIを即座に更新（楽観的更新）
  - 非同期でAPIリクエストを送信
  - APIエラー時、元の状態にロールバックする処理を追加
  - エラーメッセージをユーザーに通知する仕組みを実装
  - _Requirements: 1.1, 1.2, 1.3, 3.3_

- [ ] 8.2 楽観的UI更新のユニットテストを作成する
  - 成功パス: 楽観的UI更新 → APIリクエスト成功 → 状態維持
  - エラーパス: 楽観的UI更新 → APIエラー → ロールバック
  - ロールバック後にエラーメッセージが設定されることを検証
  - テストカバレッジ95%以上を確保
  - _Requirements: 1.1, 1.2, 1.3, 3.3_

### 9. APIリクエストの重複排除（通常モード）

- [ ] 9.1 リクエスト重複排除ロジックを実装する
  - useRefを使用して、実行中のリクエストを追跡するMapを作成
  - 同じリクエストが既に実行中の場合、そのPromiseを再利用
  - リクエスト完了後、Mapからエントリを削除
  - TypeScript型定義を更新
  - _Requirements: 3.1_

- [ ] 9.2 リクエスト重複排除のユニットテストを作成する
  - 同時に複数回のリクエストが発生した場合、1回のAPIリクエストのみ実行されることを検証
  - リクエスト完了後、次のリクエストが正常に実行されることを検証
  - テストカバレッジ90%以上を確保
  - _Requirements: 3.1_

## Phase 4: E2Eテストでのレスポンス時間検証と効果測定

### 10. ボタンレスポンス時間の自動検証E2Eテストを作成する

- [ ] 10.1 次のプレイヤーへボタンのレスポンス時間検証テストを作成する
  - e2e/specs/button-response.spec.ts として新規ファイル作成
  - Performance APIを使用してボタンクリックからUI更新までの時間を計測
  - レスポンス時間が50ms以内であることを自動検証
  - テストが失敗した場合、実際のレスポンス時間をログに出力
  - _Requirements: 1.1, 4.3_

- [ ] 10.2 一時停止/再開ボタンのレスポンス時間検証テストを追加する
  - 一時停止ボタンクリック時のレスポンス時間を計測
  - 再開ボタンクリック時のレスポンス時間を計測
  - 各ボタンで50ms以内の目標を達成していることを検証
  - _Requirements: 1.2, 4.3_

- [ ] 10.3 リセットボタンのレスポンス時間検証テストを追加する
  - リセットボタンクリック時のレスポンス時間を計測
  - 全プレイヤーの状態がリセットされるまでの時間を含めて50ms以内を検証
  - _Requirements: 1.3, 4.3_

- [ ] 10.4 プレイヤー人数変更のレスポンス時間検証テストを追加する
  - プレイヤー人数ドロップダウン選択時のレスポンス時間を計測
  - UI更新完了までが50ms以内であることを検証
  - _Requirements: 1.4, 4.3_

- [ ] 10.5 タイマーモード切り替えのレスポンス時間検証テストを追加する
  - カウントアップ/カウントダウン切り替え時のレスポンス時間を計測
  - UI更新完了までが50ms以内であることを検証
  - _Requirements: 1.5, 4.3_

### 11. フォールバックモードと通常モードのレスポンス一貫性検証

- [ ] 11.1 フォールバックモードでのレスポンス時間検証テストを作成する
  - APIリクエストを全てabortして、フォールバックモードを強制
  - 全てのボタン操作で50ms以内のレスポンスを検証
  - e2e/specs/button-response.spec.ts に追加
  - _Requirements: 1.1, 1.2, 1.3, 4.3_

- [ ] 11.2 通常モードでのレスポンス時間検証テストを作成する
  - APIリクエストが正常に動作する状態でテスト
  - 楽観的UI更新により、50ms以内のレスポンスを検証
  - フォールバックモードと同じレスポンス性能を持つことを検証
  - _Requirements: 1.1, 1.2, 1.3, 4.3_

## Phase 5: パフォーマンス計測基盤（開発環境のみ・オプション）

**注意**: このフェーズはPhase 4のE2Eテストで最適化の効果が確認できた場合のみ実施します。効果が不十分な場合、このフェーズはスキップして追加の最適化策を検討します。

### 12. usePerformanceMonitorフックの作成（開発環境専用）

- [ ] 12.1 usePerformanceMonitorフックを新規作成する
  - startMeasure、endMeasure、getMetricsの3つの関数を提供
  - Performance API（performance.mark、performance.measure）を使用して計測
  - 計測データをメモリに保持し、getMetricsで取得可能にする
  - **開発環境のみで計測を有効化**（import.meta.env.DEVで制御）
  - 本番環境では何もしない（no-op）関数を返す
  - TypeScript型定義を作成（PerformanceMetrics、UsePerformanceMonitorReturn）
  - _Requirements: 4.1, 4.2_

- [ ] 12.2 usePerformanceMonitorフックのファイルを配置する
  - frontend/src/hooks/usePerformanceMonitor.ts として新規ファイル作成
  - frontend/src/hooks/index.ts にエクスポートを追加
  - _Requirements: 4.1_

- [ ] 12.3 usePerformanceMonitorフックのユニットテストを作成する
  - startMeasure → endMeasure のフローで正確な時間を計測できることを検証
  - 計測時間が期待範囲内（±10ms）であることを検証
  - getMetricsで全ての計測データが取得できることを検証
  - Performance APIが利用できない環境でもエラーにならないことを検証
  - 本番環境（import.meta.env.DEV = false）では何もしないことを検証
  - テストカバレッジ95%以上を確保
  - _Requirements: 4.2, 4.6_

### 13. GameTimerコンポーネントへのパフォーマンス計測統合（開発環境のみ）

- [ ] 13.1 GameTimerコンポーネントでusePerformanceMonitorを使用する
  - usePerformanceMonitorフックをインポート
  - 全てのボタンクリックハンドラの開始時にstartMeasureを呼び出し
  - requestAnimationFrameを使用して、UI更新完了後にendMeasureを呼び出し
  - **開発環境のみ**、レスポンス時間が100msを超えた場合にコンソールに警告を出力
  - 本番環境では計測処理自体が無効化されるため、パフォーマンスへの影響なし
  - _Requirements: 1.6, 4.1_

- [ ] 13.2 パフォーマンス計測統合のユニットテストを作成する
  - ボタンクリック時にパフォーマンス計測が実行されることを検証（開発環境）
  - 100ms超過時にコンソール警告が出力されることを検証（開発環境、モック使用）
  - 本番環境では計測が無効化されることを検証
  - テストカバレッジ90%以上を確保
  - _Requirements: 1.6, 4.1_

## Phase 6: 統合テストとパフォーマンステスト

### 14. GameTimerコンポーネント全体の最適化フロー統合テスト

- [ ] 14.1 コンポーネント統合テストを作成する
  - switchTurnボタンクリック時、PlayerListの不必要な再レンダリングが発生しないことを検証
  - 再レンダリング回数をカウントし、期待値と一致することを確認
  - frontend/src/components/__tests__/GameTimer.integration.test.tsx として作成
  - テストカバレッジ85%以上を確保
  - _Requirements: 2.1, 2.2_

- [ ] 14.2 フォールバックモードと通常モードの最適化整合性テストを作成する
  - useGameStateとuseServerGameStateの両方で、同じメモ化が適用されていることを検証
  - 両モードでハンドラ参照が安定していることを確認
  - frontend/src/hooks/__tests__/optimization-consistency.test.ts として作成
  - _Requirements: 2.3, 3.1_

### 15. 連続ボタンクリック時のレスポンス安定性検証

- [ ] 15.1 100回連続クリックのパフォーマンステストを作成する
  - switchTurnボタンを100回連続でクリック
  - 各クリックのレスポンス時間を計測
  - 平均レスポンス時間が50ms以内であることを検証
  - 最大レスポンス時間が100ms以内（2倍まで許容）であることを検証
  - frontend/src/components/__tests__/GameTimer.performance.test.tsx として作成
  - _Requirements: 1.1, 4.4_

- [ ] 15.2 大量プレイヤー時のレンダリングパフォーマンステストを作成する
  - プレイヤー数を最大（6人）に設定
  - switchTurnボタンクリック時のレスポンス時間を計測
  - 6人プレイヤー時でも50ms以内のレスポンスを維持することを検証
  - frontend/src/components/__tests__/GameTimer.performance.test.tsx に追加
  - _Requirements: 1.1, 4.4_

## Phase 7: 実装完了処理

### 16. 実装完了処理を実施する

- [ ] 16.1 全テスト結果の確認
  - 全てのユニットテストが成功していることを確認（npm test）
  - 全てのE2Eテストが成功していることを確認（npx playwright test）
  - エラーや予期しない動作が発生しないことを確認
  - _Requirements: 全要件_

- [ ] 16.2 spec.json更新とコミット作成
  - spec.jsonのphaseを"implementation-done"に更新
  - tasks.mdの全タスクをチェック済み[x]に更新
  - 詳細なコミットメッセージを作成（実装内容、テスト結果含む）
  - Gitコミット作成（実装完了の最終コミット）
  - _Requirements: 全要件_
